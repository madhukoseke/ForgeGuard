import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIpFromHeaders } from "./rate-limit";

const MUTATION_LIMIT = 120;
const WINDOW_MS = 60_000;

/** Returns 429 response when rate limited, else null. */
export function enforceRateLimit(req: NextRequest): NextResponse | null {
  const ip = clientIpFromHeaders(req.headers);
  const result = checkRateLimit(`mut:${ip}`, {
    limit: MUTATION_LIMIT,
    windowMs: WINDOW_MS,
  });
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "rate limit exceeded" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec ?? 60),
      },
    },
  );
}
