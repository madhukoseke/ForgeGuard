import { activeBackendKind, type BackendKind } from "./backends";
import { probeRemoteInsforgeReachable, probeRuntimeHealth } from "./health-probe";
import { getExecutorMode, getInsForgeConfig } from "./insforge-client";
import { postgresConnectionUrl } from "./postgres-env";
import { isProduction } from "./production";
import { activeStoreKind, type StoreKind } from "./store";

export function collectReadinessWarnings(): string[] {
  const warnings: string[] = [];
  const storeRequested = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();
  const backendRequested = (process.env.FORGEGUARD_BACKEND || "").toLowerCase();
  const executorRequested = (process.env.FORGEGUARD_EXECUTOR || "simulated").toLowerCase();

  if (isProduction() && !process.env.FORGEGUARD_OPERATOR_TOKEN?.trim()) {
    warnings.push("FORGEGUARD_OPERATOR_TOKEN is not set");
  }
  if (isProduction() && storeRequested === "memory") {
    warnings.push("FORGEGUARD_STORE=memory is ephemeral on serverless");
  }
  if (storeRequested === "postgres" && !postgresConnectionUrl()) {
    warnings.push("FORGEGUARD_STORE=postgres but DATABASE_URL is missing");
  }
  if (backendRequested === "postgres" && !postgresConnectionUrl()) {
    warnings.push("FORGEGUARD_BACKEND=postgres but DATABASE_URL is missing");
  }
  if (backendRequested === "insforge" && !getInsForgeConfig()) {
    warnings.push("FORGEGUARD_BACKEND=insforge but INSFORGE_URL/INSFORGE_KEY missing");
  }
  if (executorRequested === "insforge" && !getInsForgeConfig()) {
    warnings.push("FORGEGUARD_EXECUTOR=insforge but INSFORGE_URL/INSFORGE_KEY missing");
  }
  if (storeRequested === "insforge" && !getInsForgeConfig()) {
    warnings.push("FORGEGUARD_STORE=insforge but INSFORGE_URL/INSFORGE_KEY missing");
  }
  if (
    process.env.REPLICAS_WEBHOOK_ENABLED === "1" &&
    !process.env.REPLICAS_WEBHOOK_SECRET?.trim()
  ) {
    warnings.push("Replicas enabled but REPLICAS_WEBHOOK_SECRET is missing");
  }
  return warnings;
}

export function readinessSnapshot() {
  const warnings = collectReadinessWarnings();
  return {
    warnings,
    store: activeStoreKind(),
    backend: activeBackendKind(),
    ready: warnings.length === 0,
  };
}

export function runtimeReadinessWarnings(
  store: StoreKind,
  backend: BackendKind,
  reachability: { store_reachable: boolean; backend_reachable: boolean },
): string[] {
  const warnings: string[] = [];
  if (store === "postgres" && !reachability.store_reachable) {
    warnings.push("Postgres audit store is not reachable");
  }
  if (store === "insforge" && !reachability.store_reachable) {
    warnings.push("InsForge audit store is not reachable");
  }
  if (backend === "postgres" && !reachability.backend_reachable) {
    warnings.push("Postgres data backend is not reachable");
  }
  if (backend === "insforge" && !reachability.backend_reachable) {
    warnings.push("InsForge data backend is not reachable");
  }
  return warnings;
}

export function executorReachabilityWarning(
  executor: ReturnType<typeof getExecutorMode>,
  store: StoreKind,
  backend: BackendKind,
  remoteInsforgeReachable: boolean,
): string | null {
  if (executor !== "insforge") return null;
  if (store === "insforge" || backend === "insforge") return null;
  if (!remoteInsforgeReachable) {
    return "InsForge executor is not reachable";
  }
  return null;
}

export async function readinessSnapshotWithRuntime() {
  const base = readinessSnapshot();
  const reachability = await probeRuntimeHealth();
  const warnings = [
    ...base.warnings,
    ...runtimeReadinessWarnings(base.store, base.backend, reachability),
  ];
  const executor = getExecutorMode();
  const remoteInsforgeReachable = await probeRemoteInsforgeReachable({
    store: base.store,
    backend: base.backend,
  });
  const executorWarning = executorReachabilityWarning(
    executor,
    base.store,
    base.backend,
    remoteInsforgeReachable,
  );
  if (executorWarning) warnings.push(executorWarning);

  return {
    store: base.store,
    backend: base.backend,
    warnings,
    ready: warnings.length === 0,
    remote_insforge_reachable: remoteInsforgeReachable,
    ...reachability,
  };
}
