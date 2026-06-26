import { NextResponse } from "next/server";
import {
  getExecutorMode,
  getInsForgeConfig,
  InsForgeClient,
  isBranchCliEnabled,
} from "@/lib/insforge-client";
import { probeRuntimeHealth, resolveInsforgeReachable } from "@/lib/health-probe";
import { isLimrunConfigured } from "@/lib/limrun";
import { isStrictConfig } from "@/lib/production";
import { readinessSnapshotWithRuntime } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("minimal") === "1") {
    return NextResponse.json({ ok: true });
  }

  const configured = getInsForgeConfig() !== null;
  const snapshot = await readinessSnapshotWithRuntime();

  let remoteInsforgeReachable = false;
  if (configured && snapshot.store !== "insforge" && snapshot.backend !== "insforge") {
    const client = InsForgeClient.fromEnv();
    if (client) {
      try {
        remoteInsforgeReachable = await client.healthCheck();
      } catch {
        remoteInsforgeReachable = false;
      }
    }
  }

  const insforge_reachable = resolveInsforgeReachable(
    configured,
    snapshot,
    remoteInsforgeReachable,
  );

  return NextResponse.json({
    store: snapshot.store,
    backend: snapshot.backend,
    ready: snapshot.ready,
    warnings: snapshot.warnings,
    store_reachable: snapshot.store_reachable,
    backend_reachable: snapshot.backend_reachable,
    executor: getExecutorMode(),
    insforge_configured: configured,
    insforge_reachable,
    strict: isStrictConfig(),
    branch_cli: isBranchCliEnabled(),
    replicas_webhook: Boolean(process.env.REPLICAS_WEBHOOK_SECRET?.trim()),
    limrun: isLimrunConfigured(),
    memoir_webhook: Boolean(process.env.MEMOIR_WEBHOOK_URL?.trim()),
  });
}
