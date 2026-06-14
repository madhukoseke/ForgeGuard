import { NextResponse } from "next/server";
import { getExecutorMode, getInsForgeConfig } from "@/lib/insforge-client";
import { isProduction, isStrictConfig } from "@/lib/production";

export const dynamic = "force-dynamic";

function collectWarnings(): string[] {
  const warnings: string[] = [];
  const store = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();

  if (isProduction() && !process.env.FORGEGUARD_OPERATOR_TOKEN?.trim()) {
    warnings.push("FORGEGUARD_OPERATOR_TOKEN is not set");
  }
  if (isProduction() && store === "memory") {
    warnings.push("FORGEGUARD_STORE=memory is ephemeral on serverless");
  }
  if (store === "postgres" && !process.env.DATABASE_URL?.trim()) {
    warnings.push("FORGEGUARD_STORE=postgres but DATABASE_URL is missing");
  }
  if (store === "insforge" && !getInsForgeConfig()) {
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

export async function GET() {
  const warnings = collectWarnings();
  const store = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();
  const backend = (process.env.FORGEGUARD_BACKEND || "memory").toLowerCase();
  const ready = warnings.length === 0;

  const body = {
    ready,
    warnings,
    store,
    backend,
    executor: getExecutorMode(),
    production: isProduction(),
    strict: isStrictConfig(),
  };

  if (isStrictConfig() && isProduction() && !ready) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}
