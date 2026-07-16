import type { HealthStatus } from "./types";

export const ACTIONS_POLL_HEALTHY_MS = 4_000;
export const ACTIONS_POLL_PENDING_MS = 2_000;
export const ACTIONS_POLL_DEGRADED_MS = 10_000;
export const HEALTH_FETCH_HEALTHY_MS = 15_000;
export const HEALTH_FETCH_DEGRADED_MS = 10_000;

export function isHealthDegraded(health: HealthStatus | null): boolean {
  if (!health) return false;
  if (!health.ready) return true;
  if (health.store === "insforge" && !health.insforge_reachable) return true;
  if (
    (health.store === "postgres" || health.backend === "postgres") &&
    (health.store_reachable === false || health.backend_reachable === false)
  ) {
    return true;
  }
  return false;
}

/** Slower when degraded; faster when pending approvals need operator attention. */
export function healthPollIntervalMs(
  health: HealthStatus | null,
  pendingCount = 0,
): number {
  if (isHealthDegraded(health)) return ACTIONS_POLL_DEGRADED_MS;
  if (pendingCount > 0) return ACTIONS_POLL_PENDING_MS;
  return ACTIONS_POLL_HEALTHY_MS;
}

export function healthFetchIntervalMs(health: HealthStatus | null): number {
  return isHealthDegraded(health)
    ? HEALTH_FETCH_DEGRADED_MS
    : HEALTH_FETCH_HEALTHY_MS;
}

export interface ConnectionState {
  label: string;
  dot: string;
  title: string;
}

export function connectionState(health: HealthStatus | null): ConnectionState {
  if (!health) {
    return { label: "…", dot: "bg-subtle", title: "Loading health status" };
  }

  const versionSuffix = health.version ? ` · v${health.version}` : "";

  if (!health.ready) {
    return {
      label: "Degraded",
      dot: "bg-warning",
      title:
        (health.warnings?.join(" · ") ?? "Configuration or connectivity issue") +
        versionSuffix,
    };
  }
  if (health.store === "postgres" || health.backend === "postgres") {
    const ok =
      health.store_reachable !== false && health.backend_reachable !== false;
    return {
      label: ok ? "Postgres" : "Postgres unreachable",
      dot: ok ? "bg-success" : "bg-warning",
      title: (ok ? "Postgres connected" : "Postgres connection failed") + versionSuffix,
    };
  }
  if (health.insforge_reachable) {
    return {
      label: "Connected",
      dot: "bg-success",
      title: "InsForge connected" + versionSuffix,
    };
  }
  if (health.insforge_configured) {
    return {
      label: "Unreachable",
      dot: "bg-warning",
      title: "InsForge unreachable" + versionSuffix,
    };
  }
  return {
    label: "Demo",
    dot: "bg-subtle",
    title:
      "Zero-credential demo mode — in-memory store and simulated executor (expected when no Postgres/InsForge is configured)" +
      versionSuffix,
  };
}
