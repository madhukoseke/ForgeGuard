import { NextResponse } from "next/server";
import { getReadinessStatus, toReadinessResponse } from "@/lib/readiness-status";
import { forgeguardVersionHeaders } from "@/lib/version-headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getReadinessStatus();
  const body = toReadinessResponse(status);
  const headers = forgeguardVersionHeaders();

  if (status.strict && status.production && !status.ready) {
    return NextResponse.json(body, { status: 503, headers });
  }

  return NextResponse.json(body, { headers });
}
