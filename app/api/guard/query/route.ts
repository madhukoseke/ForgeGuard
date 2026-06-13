// HTTP chokepoint for read-only data access (data.query).
// Mirrors the MCP `query` tool: policy, injection scan, masking, audit.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { guardDataQuery } from "@/lib/data-guard";
import { queryHttpBody, queryHttpStatus } from "@/lib/guard-data-http";
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

  const result = await guardDataQuery(parsed.input);
  return NextResponse.json(queryHttpBody(result), { status: queryHttpStatus(result) });
}
