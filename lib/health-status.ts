import {
  getExecutorMode,
  getInsForgeConfig,
  isBranchCliEnabled,
} from "./insforge-client";
import { resolveInsforgeReachable } from "./health-probe";
import { isLimrunConfigured } from "./limrun";
import { getReadinessStatus } from "./readiness-status";

export async function getHealthStatus() {
  const readiness = await getReadinessStatus();
  const configured = getInsForgeConfig() !== null;

  return {
    store: readiness.store,
    backend: readiness.backend,
    ready: readiness.ready,
    warnings: readiness.warnings,
    store_reachable: readiness.store_reachable,
    backend_reachable: readiness.backend_reachable,
    executor: getExecutorMode(),
    insforge_configured: configured,
    insforge_reachable: resolveInsforgeReachable(
      configured,
      readiness,
      readiness.remote_insforge_reachable,
    ),
    strict: readiness.strict,
    branch_cli: isBranchCliEnabled(),
    replicas_webhook: Boolean(process.env.REPLICAS_WEBHOOK_SECRET?.trim()),
    limrun: isLimrunConfigured(),
    memoir_webhook: Boolean(process.env.MEMOIR_WEBHOOK_URL?.trim()),
  };
}
