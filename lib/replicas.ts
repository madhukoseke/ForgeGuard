// Replicas webhook verification and audit enrichment.
// https://docs.tryreplicas.com/features/api

import { createHmac, timingSafeEqual } from "node:crypto";
import { AgentAction } from "./types";

export type ReplicasEventType =
  | "replica.ready"
  | "replica.turn_completed"
  | "replica.deleted"
  | "replica.error";

export interface ReplicasWebhookPayload {
  id: string;
  type: ReplicasEventType;
  created_at: string;
  replica: {
    id: string;
    name: string;
    status: string;
    source?: string;
    created_at?: string;
  };
  data?: {
    repository_statuses?: Array<{
      repository: string;
      branch: string;
      default_branch: string;
      pr_urls?: string[];
    }>;
    pr_urls?: string[];
    message?: string;
  };
}

export function verifyReplicasSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  if (signatureHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export function parseReplicasPayload(raw: unknown): ReplicasWebhookPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.type !== "string" || typeof body.replica !== "object") return null;
  const replica = body.replica as Record<string, unknown>;
  if (typeof replica.id !== "string") return null;
  return raw as ReplicasWebhookPayload;
}

export function extractPrUrls(payload: ReplicasWebhookPayload): string[] {
  const urls = new Set<string>();
  if (payload.data?.pr_urls) {
    for (const u of payload.data.pr_urls) {
      if (typeof u === "string") urls.add(u);
    }
  }
  if (payload.data?.repository_statuses) {
    for (const rs of payload.data.repository_statuses) {
      for (const u of rs.pr_urls ?? []) {
        if (typeof u === "string") urls.add(u);
      }
    }
  }
  return [...urls];
}

/** Match webhook events to audit rows by session_id or recent Replicas agent ops. */
export function pickActionsToEnrich(
  actions: AgentAction[],
  replicaId: string,
): AgentAction[] {
  const bySession = actions.filter(
    (a) => a.session_id === replicaId && (a.status === "pending" || a.replica_id === replicaId),
  );
  if (bySession.length > 0) return bySession;

  const recentReplicas = actions
    .filter((a) => a.agent === "replicas" && a.status === "pending" && !a.replica_id)
    .slice(0, 3);
  return recentReplicas;
}
