// The chokepoint. Agents POST proposed backend ops here instead of applying
// directly. ForgeGuard classifies (Layer 1 + Layer 2), writes the audit row,
// and either auto-allows or pauses for human approval.
//
// Also accepts data.query and data.execute operation types, routed through the
// same guard pipeline as the MCP server and /api/guard/query|execute.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit-http";
import { guardDataExecute, guardDataQuery } from "@/lib/data-guard";
import { guardOp } from "@/lib/guard";
import {
  executeHttpBody,
  executeHttpStatus,
  queryHttpBody,
  queryHttpStatus,
} from "@/lib/guard-data-http";
import { getExecutorMode } from "@/lib/insforge-client";
import {
  isDataActionType,
  parseProposedOp,
  proposedOpToDataInput,
} from "@/lib/validate-op";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const unauthorized = requireOperatorToken(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProposedOp(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (isDataActionType(parsed.op.operation_type)) {
    const input = proposedOpToDataInput(parsed.op);
    if (parsed.op.operation_type === "data.query") {
      const result = await guardDataQuery(input);
      return NextResponse.json(queryHttpBody(result), {
        status: queryHttpStatus(result),
      });
    }
    const result = await guardDataExecute(input);
    return NextResponse.json(executeHttpBody(result), {
      status: executeHttpStatus(result),
    });
  }

  const { action, verdict, status, applied, apply_error } = await guardOp(parsed.op);
  const executor = getExecutorMode();

  const autoMessage =
    executor === "insforge"
      ? applied
        ? "Auto-allowed and applied on InsForge."
        : apply_error
          ? `Auto-allowed but apply failed: ${apply_error}`
          : "Auto-allowed."
      : "Auto-allowed. Executor is simulated (set FORGEGUARD_EXECUTOR=insforge to apply for real).";

  return NextResponse.json(
    {
      id: action.id,
      status,
      severity: verdict.severity,
      category: verdict.category,
      requires_approval: verdict.requires_approval,
      rationale: verdict.rationale,
      safer_alternative: verdict.safer_alternative,
      blast_radius: verdict.blast_radius,
      source: action.source,
      applied,
      branch: action.branch,
      executor,
      apply_error,
      transport: "http",
      message: verdict.requires_approval
        ? "PAUSED — ForgeGuard requires human approval before this op can apply."
        : autoMessage,
    },
    { status: verdict.requires_approval ? 202 : 200 },
  );
}
