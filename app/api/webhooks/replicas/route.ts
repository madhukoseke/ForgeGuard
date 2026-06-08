// Replicas webhook: enrich audit rows with PR URLs and replica workspace id.
// Configure webhook_url when creating replicas → this endpoint.

import { NextRequest, NextResponse } from "next/server";
import {
  extractPrUrls,
  parseReplicasPayload,
  pickActionsToEnrich,
  verifyReplicasSignature,
} from "@/lib/replicas";
import { isProduction } from "@/lib/production";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Browser / health-check visits use GET; Replicas delivers events via POST. */
export async function GET() {
  const secretConfigured = Boolean(process.env.REPLICAS_WEBHOOK_SECRET?.trim());
  return NextResponse.json({
    ok: true,
    endpoint: "replicas-webhook",
    method: "POST",
    signature_required: secretConfigured,
    message:
      "Replicas webhook is active. Configure this URL in Replicas; events are delivered as POST with x-replicas-signature when REPLICAS_WEBHOOK_SECRET is set.",
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.REPLICAS_WEBHOOK_SECRET?.trim();

  if (!secret && isProduction()) {
    return NextResponse.json(
      { error: "REPLICAS_WEBHOOK_SECRET required in production" },
      { status: 401 },
    );
  }

  if (secret) {
    const sig = req.headers.get("x-replicas-signature");
    if (!verifyReplicasSignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const payload = parseReplicasPayload(json);
  if (!payload) {
    return NextResponse.json({ error: "unrecognized payload" }, { status: 400 });
  }

  const eventType = req.headers.get("x-replicas-event") ?? payload.type;
  const replicaId = payload.replica.id;
  const store = getStore();
  const actions = await store.list();
  const targets = pickActionsToEnrich(actions, replicaId);

  const prUrls = extractPrUrls(payload);
  let updated = 0;

  for (const action of targets) {
    const patch: {
      replica_id: string;
      pr_urls?: string[];
      rationale?: string;
    } = { replica_id: replicaId };

    if (prUrls.length > 0) {
      patch.pr_urls = prUrls;
    }

    if (eventType === "replica.error" && payload.data?.message) {
      patch.rationale = `${action.rationale ?? ""} Replicas error: ${payload.data.message}`.trim();
    }

    await store.update(action.id, patch);
    updated++;
  }

  return NextResponse.json({
    ok: true,
    event: eventType,
    replica_id: replicaId,
    enriched: updated,
    pr_urls: prUrls,
  });
}
