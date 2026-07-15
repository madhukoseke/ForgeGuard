import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  loadOperators,
  localDevOperator,
  type Operator,
} from "./operators";
import { isProduction } from "./production";

const TOKEN_HEADER = "x-forgeguard-token";

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extractToken(req: NextRequest): string | undefined {
  const headerToken = req.headers.get(TOKEN_HEADER)?.trim();
  const bearer = req.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  return headerToken || bearer || undefined;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export type OperatorAuthResult =
  | { ok: true; operator: Operator }
  | { ok: false; response: NextResponse };

/**
 * Resolve the authenticated operator for a request.
 * `reviewed_by` must come from this result — never from the request body.
 */
export function authenticateOperator(req: NextRequest): OperatorAuthResult {
  const operators = loadOperators();

  if (operators.length === 0) {
    if (isProduction()) {
      return {
        ok: false,
        response: unauthorized(
          "unauthorized: set FORGEGUARD_OPERATOR_TOKEN or FORGEGUARD_OPERATORS in production",
        ),
      };
    }
    return { ok: true, operator: localDevOperator() };
  }

  const provided = extractToken(req);
  if (!provided) {
    return {
      ok: false,
      response: unauthorized(
        "unauthorized: missing or invalid ForgeGuard operator token",
      ),
    };
  }

  for (const op of operators) {
    if (tokensMatch(provided, op.token)) {
      return { ok: true, operator: op };
    }
  }

  return {
    ok: false,
    response: unauthorized(
      "unauthorized: missing or invalid ForgeGuard operator token",
    ),
  };
}

/** Gate protected routes; returns 401 response or null when allowed. */
export function requireOperatorToken(req: NextRequest): NextResponse | null {
  const result = authenticateOperator(req);
  return result.ok ? null : result.response;
}

/** Like requireOperatorToken, but also returns the verified operator identity. */
export function requireOperator(
  req: NextRequest,
): { operator: Operator } | { error: NextResponse } {
  const result = authenticateOperator(req);
  if (!result.ok) return { error: result.response };
  return { operator: result.operator };
}
