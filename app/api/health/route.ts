import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/health-status";
import { readinessSnapshot } from "@/lib/readiness";
import { forgeguardVersionHeaders } from "@/lib/version-headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const minimal = url.searchParams.get("minimal");
  const headers = forgeguardVersionHeaders();

  if (minimal === "1") {
    return NextResponse.json({ ok: true }, { headers });
  }
  if (minimal === "ready") {
    const { ready } = readinessSnapshot();
    return NextResponse.json({ ok: ready }, { headers });
  }

  const status = await getHealthStatus();
  return NextResponse.json({ ...status, ok: status.ready }, { headers });
}
