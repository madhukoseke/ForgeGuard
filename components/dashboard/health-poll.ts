import type { HealthStatus } from "./types";

/** Slower polling when health is degraded or backends are unreachable. */
export function healthPollIntervalMs(health: HealthStatus | null): number {
  if (!health) return 4_000;
  if (!health.ready) return 10_000;
  if (health.store === "insforge" && !health.insforge_reachable) return 10_000;
  if (
    (health.store === "postgres" || health.backend === "postgres") &&
    (health.store_reachable === false || health.backend_reachable === false)
  ) {
    return 10_000;
  }
  return 4_000;
}
