// Human review actions on a single audit row: approve / reject / rollback.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { applyOp, rollbackOp, getExecutorMode, executorIsLive } from "@/lib/insforge-executor";
import { emitMemoirAppliedEvent } from "@/lib/memoir-events";
import { resolveSaferStatement } from "@/lib/safer-sql";
import { getStore } from "@/lib/store";
import { ActionStatus, AgentAction } from "@/lib/types";

export const dynamic = "force-dynamic";

type Decision = "approve" | "reject" | "rollback";

function storeErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Store update failed";
  return NextResponse.json({ error: message }, { status: 502 });
}

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
    try {
      const updated = await store.update(id, {
        status: "rejected",
        reviewed_by: reviewer,
        reviewed_at: now,
      });
      if (!updated) {
        return NextResponse.json({ error: "action not found" }, { status: 404 });
      }
      return NextResponse.json({ action: updated });
    } catch (err) {
      return storeErrorResponse(err);
    }
  }

  if (decision === "approve") {
    if (!["pending", "approved"].includes(row.status)) {
      return NextResponse.json(
        { error: `cannot approve from status "${row.status}"` },
        { status: 409 },
      );
    }

    const wantsSafer =
      bodyRecord.apply_safer !== false && !!row.safer_alternative?.trim();
    let applySafer = false;
    let toApply: AgentAction = row;
    if (wantsSafer) {
      const saferStmt = resolveSaferStatement(row);
      if (!saferStmt) {
        return NextResponse.json(
          {
            error:
              "No executable safer SQL for this op — set apply_safer: false to approve the original statement",
          },
          { status: 400 },
        );
      }
      applySafer = true;
      toApply = { ...row, statement: saferStmt };
    }

    const result = await applyOp(toApply);
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
      applied_safer: boolean;
    }> = {
      status: "applied",
      reviewed_by: reviewer,
      reviewed_at: now,
      rollback_ref: result.rollback_ref,
      applied_safer: applySafer,
    };
    if (result.branch) patch.branch = result.branch;

    try {
      const updated = await store.update(id, patch);
      if (!updated) {
        return NextResponse.json({ error: "action not found" }, { status: 404 });
      }
      void emitMemoirAppliedEvent(updated);
      return NextResponse.json({ action: updated, applied: result.applied });
    } catch (err) {
      return storeErrorResponse(err);
    }
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

  try {
    const updated = await store.update(id, {
      status: "rolled_back",
      reviewed_by: reviewer,
      reviewed_at: now,
    });
    if (!updated) {
      return NextResponse.json({ error: "action not found" }, { status: 404 });
    }
    return NextResponse.json({ action: updated, rolled_back: result.applied });
  } catch (err) {
    return storeErrorResponse(err);
  }
}
