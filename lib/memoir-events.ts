// Optional outbound events for Memoir when MEMOIR_WEBHOOK_URL is configured.

import { AgentAction } from "./types";

export async function emitMemoirAppliedEvent(
  action: AgentAction,
): Promise<boolean> {
  const url = process.env.MEMOIR_WEBHOOK_URL?.trim();
  if (!url) return false;

  const payload = {
    event: "forgeguard.action.applied",
    id: action.id,
    created_at: action.created_at,
    agent: action.agent,
    action_type: action.action_type,
    statement: action.statement,
    diff: action.diff,
    severity: action.severity,
    category: action.category,
    rationale: action.rationale,
    safer_alternative: action.safer_alternative,
    blast_radius: action.blast_radius,
    pr_urls: action.pr_urls,
    preview_url: action.preview_url,
    branch: action.branch,
    demo_context: "ForgeGuard — reliability control plane for InsForge agent backends",
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
