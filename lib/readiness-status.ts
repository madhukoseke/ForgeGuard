import { getExecutorMode } from "./insforge-client";
import { isProduction, isStrictConfig } from "./production";
import { readinessSnapshotWithRuntime } from "./readiness";
import { getAppVersion } from "./version";

export async function getReadinessStatus() {
  const snapshot = await readinessSnapshotWithRuntime();

  return {
    ready: snapshot.ready,
    warnings: snapshot.warnings,
    store: snapshot.store,
    backend: snapshot.backend,
    store_reachable: snapshot.store_reachable,
    backend_reachable: snapshot.backend_reachable,
    remote_insforge_reachable: snapshot.remote_insforge_reachable,
    executor: getExecutorMode(),
    production: isProduction(),
    strict: isStrictConfig(),
    version: getAppVersion(),
  };
}
