// List the audit trail for the dashboard.

import { NextRequest, NextResponse } from "next/server";
import { requireOperatorToken } from "@/lib/api-auth";
import { parseListParams } from "@/lib/list-params";
import { getStore, getStoreListMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireOperatorToken(req);
  if (unauthorized) return unauthorized;

  const { limit, offset } = parseListParams(req.nextUrl.searchParams);

  try {
    const store = getStore();
    const page = await store.listPage({ limit, offset });
    const summary = await store.getSummary();
    const meta = getStoreListMeta();

    return NextResponse.json({
      actions: page.rows,
      pagination: {
        limit: page.limit,
        offset: page.offset,
        total: page.total,
        has_more: page.has_more,
      },
      summary,
      ...(meta.fromCache
        ? { degraded: true, stale: true, cache_age_ms: meta.cacheAgeMs }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Store unavailable";
    return NextResponse.json({
      actions: [],
      pagination: { limit, offset, total: 0, has_more: false },
      summary: {
        total: 0,
        blocked: 0,
        pending: 0,
        critical: 0,
        rolled_back: 0,
        filter_counts: {},
      },
      degraded: true,
      error: message,
    });
  }
}
