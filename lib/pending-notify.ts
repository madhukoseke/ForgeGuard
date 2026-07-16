// Optional webhook when an action is held for human approval.

import type { AgentAction } from "./types";

export async function emitPendingAlert(action: AgentAction): Promise<boolean> {
  if (action.status !== "pending" || !action.requires_approval) return false;

  const url = process.env.FORGEGUARD_PENDING_WEBHOOK_URL?.trim();
  if (!url) return false;

  const payload = {
    event: "forgeguard.action.pending",
    id: action.id,
    created_at: action.created_at,
    agent: action.agent,
    action_type: action.action_type,
    target: action.target,
    statement: action.statement,
    severity: action.severity,
    category: action.category,
    rationale: action.rationale,
    safer_alternative: action.safer_alternative,
    blast_radius: action.blast_radius,
    transport: action.transport,
    preview_url: action.preview_url,
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
