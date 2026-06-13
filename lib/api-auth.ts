import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isProduction } from "./production";

const TOKEN_HEADER = "x-forgeguard-token";

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireOperatorToken(req: NextRequest): NextResponse | null {
  const expected = process.env.FORGEGUARD_OPERATOR_TOKEN?.trim();

  if (!expected) {
    if (isProduction()) {
      return NextResponse.json(
        {
          error:
            "unauthorized: set FORGEGUARD_OPERATOR_TOKEN in production",
        },
        { status: 401 },
      );
    }
    return null;
  }

  const headerToken = req.headers.get(TOKEN_HEADER);
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = headerToken ?? bearer;

  if (provided && tokensMatch(provided, expected)) return null;

  return NextResponse.json(
    { error: "unauthorized: missing or invalid ForgeGuard operator token" },
    { status: 401 },
  );
}
