import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// GET /api/actions — the live audit trail (polled every ~2s by the dashboard)
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ actions: store.list() });
}
