import { NextResponse } from "next/server";
import { store } from "@/lib/store";

type Verb = "approve" | "reject" | "rollback";

// POST /api/actions/:id  — Body: { action: "approve" | "reject" | "rollback" }
// approve → applied (safer alternative substituted when present)
// reject  → rejected   ·   rollback → rolled_back
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { action?: Verb; reviewed_by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const verb = body.action;
  const reviewer = body.reviewed_by ?? "you@forgeguard";

  const result =
    verb === "approve"
      ? store.approve(id, reviewer)
      : verb === "reject"
      ? store.reject(id, reviewer)
      : verb === "rollback"
      ? store.rollback(id, reviewer)
      : undefined;

  if (result === undefined) {
    return NextResponse.json({ error: `unknown action: ${verb}` }, { status: 422 });
  }
  if (result === null) {
    return NextResponse.json({ error: `no action ${id}` }, { status: 404 });
  }
  return NextResponse.json({ action: result });
}
