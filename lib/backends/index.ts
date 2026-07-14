// Backend selection. FORGEGUARD_BACKEND=memory|postgres|insforge.
// Explicit postgres/insforge without credentials hard-fails (no silent memory
// fallback). Unset / memory keeps the zero-credential demo path.

import { InsForgeBackend } from "./insforge";
import { MemoryBackend } from "./memory";
import { PostgresBackend } from "./postgres";
import { isInsForgeConfigured } from "../insforge-client";
import { hasPostgresConnectionUrl } from "../postgres-env";
import { ForgeGuardConfigError } from "../production";
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
    throw new ForgeGuardConfigError(
      "FORGEGUARD_BACKEND=postgres but DATABASE_URL is unset — refusing memory fallback.",
    );
  }
  if (kind === "insforge") {
    const insforge = InsForgeBackend.fromEnv();
    if (insforge) return insforge;
    throw new ForgeGuardConfigError(
      "FORGEGUARD_BACKEND=insforge but INSFORGE_URL/INSFORGE_KEY are unset — refusing memory fallback.",
    );
  }
  return new MemoryBackend();
}

/** Resolved data backend (after credential check), without using the cached singleton. */
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
