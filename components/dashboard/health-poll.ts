import type { HealthStatus } from "./types";

export const ACTIONS_POLL_HEALTHY_MS = 4_000;
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

/** Slower polling when health is degraded or backends are unreachable. */
export function healthPollIntervalMs(health: HealthStatus | null): number {
  return isHealthDegraded(health)
    ? ACTIONS_POLL_DEGRADED_MS
    : ACTIONS_POLL_HEALTHY_MS;
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
    title: "Offline demo" + versionSuffix,
  };
}
