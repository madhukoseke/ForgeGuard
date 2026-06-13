// HTTP chokepoint for write/DDL data access (data.execute).
// Mirrors the MCP `execute` tool: classify, audit, auto-apply or hold for approval.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { guardDataExecute } from "@/lib/data-guard";
import { executeHttpBody, executeHttpStatus } from "@/lib/guard-data-http";
import { enforceRateLimit } from "@/lib/rate-limit-http";
import { parseDataRequest } from "@/lib/validate-op";

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

  const parsed = parseDataRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await guardDataExecute(parsed.input);
  return NextResponse.json(executeHttpBody(result), {
    status: executeHttpStatus(result),
  });
}
