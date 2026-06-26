import { NextResponse } from "next/server";
import { getExecutorMode } from "@/lib/insforge-client";
import { readinessSnapshotWithRuntime } from "@/lib/readiness";
import { isProduction, isStrictConfig } from "@/lib/production";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await readinessSnapshotWithRuntime();

  const body = {
    ready: snapshot.ready,
    warnings: snapshot.warnings,
    store: snapshot.store,
    backend: snapshot.backend,
    store_reachable: snapshot.store_reachable,
    backend_reachable: snapshot.backend_reachable,
    executor: getExecutorMode(),
    production: isProduction(),
    strict: isStrictConfig(),
  };

  if (isStrictConfig() && isProduction() && !snapshot.ready) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}
