import { NextResponse } from "next/server";
import { getReadinessStatus } from "@/lib/readiness-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getReadinessStatus();
  const body = { ...status };

  if (status.strict && status.production && !status.ready) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}
