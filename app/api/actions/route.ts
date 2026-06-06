// List the audit trail for the dashboard.

import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getStore().list();
  return NextResponse.json({ actions: rows });
}
