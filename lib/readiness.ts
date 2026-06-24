import { activeBackendKind } from "./backends";
import { getInsForgeConfig } from "./insforge-client";
import { postgresConnectionUrl } from "./postgres-env";
import { isProduction } from "./production";
import { activeStoreKind } from "./store";

export function collectReadinessWarnings(): string[] {
  const warnings: string[] = [];
  const storeRequested = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();
  const backendRequested = (process.env.FORGEGUARD_BACKEND || "").toLowerCase();

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
