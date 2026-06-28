import {
  getExecutorMode,
  getInsForgeConfig,
  InsForgeClient,
  isBranchCliEnabled,
} from "./insforge-client";
import { resolveInsforgeReachable } from "./health-probe";
import { isLimrunConfigured } from "./limrun";
import { isStrictConfig } from "./production";
import { readinessSnapshotWithRuntime } from "./readiness";

export async function getHealthStatus() {
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

  return {
    store: snapshot.store,
    backend: snapshot.backend,
    ready: snapshot.ready,
    warnings: snapshot.warnings,
    store_reachable: snapshot.store_reachable,
    backend_reachable: snapshot.backend_reachable,
    executor: getExecutorMode(),
    insforge_configured: configured,
    insforge_reachable: resolveInsforgeReachable(
      configured,
      snapshot,
      remoteInsforgeReachable,
    ),
    strict: isStrictConfig(),
    branch_cli: isBranchCliEnabled(),
    replicas_webhook: Boolean(process.env.REPLICAS_WEBHOOK_SECRET?.trim()),
    limrun: isLimrunConfigured(),
    memoir_webhook: Boolean(process.env.MEMOIR_WEBHOOK_URL?.trim()),
  };
}
