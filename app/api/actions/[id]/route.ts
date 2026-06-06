// Human review actions on a single audit row: approve / reject / rollback.
//
// approve  → marks the op applied by the demo simulator, status -> applied
// reject   → discards the op,                              status -> rejected
// rollback → marks an applied op rolled back by simulator,  status -> rolled_back

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
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
  let patch: Partial<{ status: ActionStatus; reviewed_by: string; reviewed_at: string; rollback_ref: string }> = {};

  if (decision === "approve") {
    if (!["pending", "approved"].includes(row.status)) {
      return NextResponse.json(
        { error: `cannot approve from status "${row.status}"` },
        { status: 409 },
      );
    }
    // Demo simulator: record the rollback ref that a real executor would use.
    patch = {
      status: "applied",
      reviewed_by: reviewer,
      reviewed_at: now,
      rollback_ref: `pre-${row.branch ?? "branch"}`,
    };
  } else if (decision === "reject") {
    if (!["pending", "approved"].includes(row.status)) {
      return NextResponse.json(
        { error: `cannot reject from status "${row.status}"` },
        { status: 409 },
      );
    }
    patch = { status: "rejected", reviewed_by: reviewer, reviewed_at: now };
  } else {
    // rollback
    if (!["applied", "auto_allowed"].includes(row.status)) {
      return NextResponse.json(
        { error: `can only roll back applied ops (status is "${row.status}")` },
        { status: 409 },
      );
    }
    patch = { status: "rolled_back", reviewed_by: reviewer, reviewed_at: now };
  }

  const updated = await store.update(id, patch);
  return NextResponse.json({ action: updated });
}
