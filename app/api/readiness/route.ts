import { NextResponse } from "next/server";
import { getExecutorMode } from "@/lib/insforge-client";
import { collectReadinessWarnings, readinessSnapshot } from "@/lib/readiness";
import { isProduction, isStrictConfig } from "@/lib/production";

export const dynamic = "force-dynamic";

export async function GET() {
  const { warnings, store, backend, ready } = readinessSnapshot();

  const body = {
    ready,
    warnings,
    store,
    backend,
    executor: getExecutorMode(),
    production: isProduction(),
    strict: isStrictConfig(),
  };

  if (isStrictConfig() && isProduction() && !ready) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}
