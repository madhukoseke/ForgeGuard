import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { OPS, type OpKey } from "@/lib/ops";

// POST /api/guard/op  — the chokepoint.
// Body: { op: OpKey }. Every agent-proposed change is funnelled through here;
// ForgeGuard classifies it, writes the audit row, and pauses if risky.
export async function POST(req: Request) {
  let body: { op?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const op = body.op as OpKey;
  if (!op || !(op in OPS)) {
    return NextResponse.json({ error: `unknown op: ${body.op}` }, { status: 422 });
  }

  const action = store.guard(op);
  return NextResponse.json({ action }, { status: 201 });
}
