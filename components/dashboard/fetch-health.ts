import type { HealthStatus } from "./types";

const STORE_KINDS = new Set(["memory", "postgres", "insforge"]);
const EXECUTOR_MODES = new Set(["simulated", "insforge", "migrations"]);

export function parseHealthStatus(data: unknown): HealthStatus | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (
    typeof row.store !== "string" ||
    !STORE_KINDS.has(row.store) ||
    typeof row.backend !== "string" ||
    !STORE_KINDS.has(row.backend) ||
    typeof row.executor !== "string" ||
    !EXECUTOR_MODES.has(row.executor)
  ) {
    return null;
  }

  return {
    store: row.store as HealthStatus["store"],
    backend: row.backend as HealthStatus["backend"],
    ready: typeof row.ready === "boolean" ? row.ready : typeof row.ok === "boolean" ? row.ok : true,
    warnings: Array.isArray(row.warnings)
      ? row.warnings.filter((warning): warning is string => typeof warning === "string")
      : undefined,
    store_reachable:
      typeof row.store_reachable === "boolean" ? row.store_reachable : undefined,
    backend_reachable:
      typeof row.backend_reachable === "boolean" ? row.backend_reachable : undefined,
    executor: row.executor as HealthStatus["executor"],
    insforge_configured: Boolean(row.insforge_configured),
    insforge_reachable: Boolean(row.insforge_reachable),
    branch_cli: typeof row.branch_cli === "boolean" ? row.branch_cli : undefined,
    version: typeof row.version === "string" ? row.version : undefined,
  };
}

export async function fetchHealthStatus(): Promise<HealthStatus | null> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) return null;
    const status = parseHealthStatus(await res.json());
    if (!status) return null;

    const headerVersion = res.headers.get("X-ForgeGuard-Version");
    if (!status.version && headerVersion) {
      return { ...status, version: headerVersion };
    }
    return status;
  } catch {
    return null;
  }
}
