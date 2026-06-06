import { NextRequest, NextResponse } from "next/server";

const TOKEN_HEADER = "x-forgeguard-token";

export function requireOperatorToken(req: NextRequest): NextResponse | null {
  const expected = process.env.FORGEGUARD_OPERATOR_TOKEN;
  if (!expected) return null;

  const headerToken = req.headers.get(TOKEN_HEADER);
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (headerToken === expected || bearer === expected) return null;

  return NextResponse.json(
    { error: "unauthorized: missing or invalid ForgeGuard operator token" },
    { status: 401 },
  );
}
