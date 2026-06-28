import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/health-status";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("minimal") === "1") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(await getHealthStatus());
}
