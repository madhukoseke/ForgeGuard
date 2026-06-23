import { activeBackendKind } from "./backends";
import { getInsForgeConfig } from "./insforge-client";
import { isProduction } from "./production";
import { activeStoreKind } from "./store";

function postgresUrl(): string | undefined {
  return (
    process.env.FORGEGUARD_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

export function collectReadinessWarnings(): string[] {
  const warnings: string[] = [];
  const storeRequested = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();

  if (isProduction() && !process.env.FORGEGUARD_OPERATOR_TOKEN?.trim()) {
    warnings.push("FORGEGUARD_OPERATOR_TOKEN is not set");
  }
  if (isProduction() && storeRequested === "memory") {
    warnings.push("FORGEGUARD_STORE=memory is ephemeral on serverless");
  }
  if (storeRequested === "postgres" && !postgresUrl()) {
    warnings.push("FORGEGUARD_STORE=postgres but DATABASE_URL is missing");
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
