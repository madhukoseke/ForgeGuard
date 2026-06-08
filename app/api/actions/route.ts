// List the audit trail for the dashboard.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { getStore, getStoreListMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireOperatorToken(req);
  if (unauthorized) return unauthorized;
  try {
    const rows = await getStore().list();
    const meta = getStoreListMeta();

    return NextResponse.json({
      actions: rows,
      ...(meta.fromCache
        ? { degraded: true, stale: true, cache_age_ms: meta.cacheAgeMs }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Store unavailable";
    return NextResponse.json({
      actions: [],
      degraded: true,
      error: message,
    });
  }
}
