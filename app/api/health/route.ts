import { NextResponse } from "next/server";
import { activeBackendKind } from "@/lib/backends";
import {
  getExecutorMode,
  getInsForgeConfig,
  InsForgeClient,
  isBranchCliEnabled,
} from "@/lib/insforge-client";
import { isLimrunConfigured } from "@/lib/limrun";
import { isStrictConfig } from "@/lib/production";
import { readinessSnapshot } from "@/lib/readiness";
import { activeStoreKind, getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("minimal") === "1") {
    return NextResponse.json({ ok: true });
  }

  const configured = getInsForgeConfig() !== null;

  let insforge_reachable = false;
  if (configured) {
    const client = InsForgeClient.fromEnv();
    if (client) {
      try {
        insforge_reachable = await client.healthCheck();
      } catch {
        insforge_reachable = false;
      }
    }
  }

  try {
    await getStore().list();
  } catch {
    /* ignore */
  }

  const { ready } = readinessSnapshot();

  return NextResponse.json({
    store: activeStoreKind(),
    backend: activeBackendKind(),
    ready,
    executor: getExecutorMode(),
    insforge_configured: configured,
    insforge_reachable,
    strict: isStrictConfig(),
    branch_cli: isBranchCliEnabled(),
    replicas_webhook: Boolean(process.env.REPLICAS_WEBHOOK_SECRET?.trim()),
    limrun: isLimrunConfigured(),
    memoir_webhook: Boolean(process.env.MEMOIR_WEBHOOK_URL?.trim()),
  });
}
