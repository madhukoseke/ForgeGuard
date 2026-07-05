import type { HealthStatus } from "./types";

export function parseHealthStatus(data: unknown): HealthStatus | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (
    typeof row.store !== "string" ||
    typeof row.backend !== "string" ||
    typeof row.executor !== "string"
  ) {
    return null;
  }
  return data as HealthStatus;
}

export async function fetchHealthStatus(): Promise<HealthStatus | null> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) return null;
    return parseHealthStatus(await res.json());
  } catch {
    return null;
  }
}
