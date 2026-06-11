// The guard orchestration: merge Layer 1 + Layer 2, write the audit row, and
// pause for approval when required. Auto-allowed ops apply via the InsForge
// executor when FORGEGUARD_EXECUTOR=insforge.

import { randomUUID } from "crypto";
import { classify, heuristicVerdict } from "./classifier";
import { scanInbound } from "./injection";
import { applyOp } from "./insforge-executor";
import { getExecutorMode } from "./insforge-client";
import { resolvePreviewUrl, shouldAttachPreview } from "./limrun";
import { prefilter } from "./prefilter";
import { getStore } from "./store";
import {
  AgentAction,
  ProposedOp,
  Verdict,
  maxSeverity,
  severityRank,
  computeRequiresApproval,
} from "./types";

function mergeVerdicts(op: ProposedOp, llm: Verdict): Verdict {
  const pf = prefilter(op);
  const deterministic = heuristicVerdict(op);
  const severity = maxSeverity(pf.severity, llm.severity);
  const category =
    severityRank(pf.severity) >= severityRank(llm.severity)
      ? pf.category
      : llm.category;
  const deterministicBlastKnown = deterministic.blast_radius !== "unknown";
  const llmBlastIsWeak =
    llm.blast_radius === "unknown" || /^\d+$/.test(llm.blast_radius.trim());

  return {
    severity,
    category,
    requires_approval: computeRequiresApproval(severity),
    rationale: llm.rationale,
    safer_alternative: llm.safer_alternative ?? deterministic.safer_alternative,
    blast_radius:
      deterministicBlastKnown && llmBlastIsWeak
        ? deterministic.blast_radius
        : llm.blast_radius,
  };
}

export interface GuardResult {
  action: AgentAction;
  verdict: Verdict;
  status: AgentAction["status"];
  applied: boolean;
  apply_error?: string;
}

export async function guardOp(op: ProposedOp): Promise<GuardResult> {
  const { verdict: llm, source } = await classify(op);
  const verdict = mergeVerdicts(op, llm);
  // Record (but don't escalate on) inbound injection patterns for the HTTP path.
  const injectionFindings = scanInbound([op.statement, op.diff]);

  const now = new Date().toISOString();
  const requiresApproval = verdict.requires_approval;
  const branch = `forgeguard/op-${Date.now().toString(36)}`;
  let status: AgentAction["status"] = requiresApproval ? "pending" : "auto_allowed";

  const action: AgentAction = {
    id: randomUUID(),
    created_at: now,
    agent: op.agent ?? "claude-code",
    session_id: op.session_id ?? null,
    action_type: op.operation_type,
    target: op.target ?? op.context?.table ?? null,
    statement: op.statement,
    diff: op.diff ?? null,
    severity: verdict.severity,
    category: verdict.category,
    rationale: verdict.rationale,
    blast_radius: verdict.blast_radius,
    requires_approval: requiresApproval,
    status,
    reviewed_by: null,
    reviewed_at: null,
    safer_alternative: verdict.safer_alternative,
    branch,
    rollback_ref: null,
    source,
    replica_id: null,
    pr_urls: null,
    preview_url: null,
    injection_findings: injectionFindings.length > 0 ? injectionFindings : null,
    transport: "http",
  };

  await getStore().insert(action);

  if (requiresApproval && shouldAttachPreview(action)) {
    try {
      const preview = await resolvePreviewUrl();
      if (preview) {
        action.preview_url = preview.previewUrl;
        await getStore().update(action.id, { preview_url: preview.previewUrl });
      }
    } catch {
      /* preview is best-effort */
    }
  }

  let applied = false;
  let apply_error: string | undefined;

  if (!requiresApproval) {
    const result = await applyOp(action);
    if (result.applied) {
      applied = true;
      status = "applied";
      await getStore().update(action.id, {
        status: "applied",
        rollback_ref: result.rollback_ref,
        branch: result.branch ?? action.branch,
      });
      action.status = "applied";
      action.rollback_ref = result.rollback_ref;
      if (result.branch) action.branch = result.branch;
    } else if (getExecutorMode() !== "simulated") {
      status = "pending";
      apply_error = result.error ?? "Apply failed";
      await getStore().update(action.id, {
        status: "pending",
        rationale: `${action.rationale ?? ""} Apply failed: ${apply_error}`.trim(),
      });
      action.status = "pending";
      action.rationale = `${action.rationale ?? ""} Apply failed: ${apply_error}`.trim();
    }
  }

  return { action, verdict, status, applied, apply_error };
}

export { heuristicVerdict };
