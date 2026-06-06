// Human review actions on a single audit row: approve / reject / rollback.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { applyOp, rollbackOp, getExecutorMode, executorIsLive } from "@/lib/insforge-executor";
import { emitMemoirAppliedEvent } from "@/lib/memoir-events";
import { getStore } from "@/lib/store";
import { ActionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Decision = "approve" | "reject" | "rollback";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireOperatorToken(req);
  if (unauthorized) return unauthorized;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }

  const bodyRecord =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const decision = bodyRecord.decision as Decision | undefined;
  const reviewer =
    typeof bodyRecord.reviewed_by === "string" && bodyRecord.reviewed_by.trim()
      ? bodyRecord.reviewed_by.trim()
      : "operator";

  if (!decision || !["approve", "reject", "rollback"].includes(decision)) {
    return NextResponse.json(
      { error: "`decision` must be approve | reject | rollback" },
      { status: 400 },
    );
  }

  const store = getStore();
  const { id } = await params;
  const row = await store.get(id);
  if (!row) {
    return NextResponse.json({ error: "action not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (decision === "reject") {
    if (!["pending", "approved"].includes(row.status)) {
      return NextResponse.json(
        { error: `cannot reject from status "${row.status}"` },
        { status: 409 },
      );
    }
    const updated = await store.update(id, {
      status: "rejected",
      reviewed_by: reviewer,
      reviewed_at: now,
    });
    return NextResponse.json({ action: updated });
  }

  if (decision === "approve") {
    if (!["pending", "approved"].includes(row.status)) {
      return NextResponse.json(
        { error: `cannot approve from status "${row.status}"` },
        { status: 409 },
      );
    }

    const result = await applyOp(row);
    if (!result.applied && getExecutorMode() !== "simulated") {
      return NextResponse.json(
        {
          error: result.error ?? "Failed to apply operation on InsForge",
          action: row,
        },
        { status: 502 },
      );
    }

    const patch: Partial<{
      status: ActionStatus;
      reviewed_by: string;
      reviewed_at: string;
      rollback_ref: string;
      branch: string;
    }> = {
      status: "applied",
      reviewed_by: reviewer,
      reviewed_at: now,
      rollback_ref: result.rollback_ref,
    };
    if (result.branch) patch.branch = result.branch;

    const updated = await store.update(id, patch);
    if (updated) void emitMemoirAppliedEvent(updated);
    return NextResponse.json({ action: updated, applied: result.applied });
  }

  // rollback
  if (!["applied", "auto_allowed"].includes(row.status)) {
    return NextResponse.json(
      { error: `can only roll back applied ops (status is "${row.status}")` },
      { status: 409 },
    );
  }

  const result = await rollbackOp(row);
    if (!result.applied && executorIsLive()) {
    return NextResponse.json(
      {
        error: result.error ?? "Failed to roll back operation on InsForge",
        action: row,
      },
      { status: 502 },
    );
  }

  const updated = await store.update(id, {
    status: "rolled_back",
    reviewed_by: reviewer,
    reviewed_at: now,
  });
  return NextResponse.json({ action: updated, rolled_back: result.applied });
}
