// Backend selection. FORGEGUARD_BACKEND=memory|postgres|insforge.
// Falls back to memory (simulated) when the requested backend is missing
// credentials, so the demo never hard-fails.

import { InsForgeBackend } from "./insforge";
import { MemoryBackend } from "./memory";
import { PostgresBackend } from "./postgres";
import { isInsForgeConfigured } from "../insforge-client";
import { hasPostgresConnectionUrl } from "../postgres-env";
import type { BackendKind, DataBackend } from "./types";

export type { BackendKind, ColumnInfo, DataBackend, SqlResult, TableInfo } from "./types";
export { sqlCommand } from "./types";
export { MemoryBackend } from "./memory";
export { PostgresBackend } from "./postgres";
export { InsForgeBackend } from "./insforge";

let backend: DataBackend | null = null;

export function requestedBackendKind(): BackendKind {
  const raw = (process.env.FORGEGUARD_BACKEND || "").toLowerCase();
  if (raw === "postgres" || raw === "insforge" || raw === "memory") return raw;
  // Back-compat: infer from existing env when FORGEGUARD_BACKEND is unset.
  if (hasPostgresConnectionUrl()) {
    return "postgres";
  }
  if (
    (process.env.FORGEGUARD_EXECUTOR || "").toLowerCase() !== "" &&
    (process.env.FORGEGUARD_EXECUTOR || "").toLowerCase() !== "simulated" &&
    process.env.INSFORGE_URL &&
    process.env.INSFORGE_KEY
  ) {
    return "insforge";
  }
  return "memory";
}

export function createDataBackend(kind: BackendKind): DataBackend {
  if (kind === "postgres") {
    const pg = PostgresBackend.fromEnv();
    if (pg) return pg;
    console.warn(
      "[ForgeGuard] FORGEGUARD_BACKEND=postgres but DATABASE_URL is unset — falling back to memory backend.",
    );
    return new MemoryBackend();
  }
  if (kind === "insforge") {
    const insforge = InsForgeBackend.fromEnv();
    if (insforge) return insforge;
    console.warn(
      "[ForgeGuard] FORGEGUARD_BACKEND=insforge but INSFORGE_URL/INSFORGE_KEY are unset — falling back to memory backend.",
    );
    return new MemoryBackend();
  }
  return new MemoryBackend();
}

/** Resolved data backend (after credential fallback), without using the cached singleton. */
export function activeBackendKind(): BackendKind {
  const kind = requestedBackendKind();
  if (kind === "postgres" && hasPostgresConnectionUrl()) return "postgres";
  if (kind === "insforge" && isInsForgeConfigured()) return "insforge";
  return "memory";
}

export function getDataBackend(): DataBackend {
  if (!backend) backend = createDataBackend(requestedBackendKind());
  return backend;
}

/** Test hook: replace or clear the cached backend. */
export function setDataBackendForTests(next: DataBackend | null): void {
  backend = next;
}
