// Demo controls: list the canned ops, run one (or all) through the guard, and
// reset the audit trail. Used by the dashboard's demo panel.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { DEMO_OPS } from "@/lib/demo-ops";
import { guardOp } from "@/lib/guard";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ops: DEMO_OPS.map((o, i) => ({ index: i, label: o.label, statement: o.statement })),
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireOperatorToken(req);
  if (unauthorized) return unauthorized;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const bodyRecord =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  if (bodyRecord.action === "reset") {
    await getStore().reset();
    return NextResponse.json({ ok: true, reset: true });
  }

  if (bodyRecord.action === "seed_all") {
    const results = [];
    for (const op of DEMO_OPS) {
      const { action } = await guardOp(op);
      results.push({ id: action.id, severity: action.severity });
    }
    return NextResponse.json({ ok: true, count: results.length });
  }

  if (bodyRecord.action === "seed_baseline") {
    const baseline = DEMO_OPS[DEMO_OPS.length - 1];
    const { action } = await guardOp(baseline);
    return NextResponse.json({ ok: true, id: action.id, severity: action.severity });
  }

  const index = Number(bodyRecord.index);
  if (!Number.isInteger(index) || index < 0 || index >= DEMO_OPS.length) {
    return NextResponse.json({ error: "invalid op index" }, { status: 400 });
  }

  const { action, verdict } = await guardOp(DEMO_OPS[index]);
  return NextResponse.json({ ok: true, id: action.id, verdict });
}
