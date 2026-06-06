// The guard orchestration: merge Layer 1 + Layer 2, write the audit row, and
// pause for approval when required. Backend apply/rollback are simulated in this
// demo build until a real InsForge executor is wired in.

import { randomUUID } from "crypto";
import { classify, heuristicVerdict } from "./classifier";
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

// Merge the deterministic floor (Layer 1) with the LLM's nuance (Layer 2).
// Layer 1 can only RAISE severity, never lower it — a regex-caught DROP TABLE
// stays critical even if the model is unsure.
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
}

export async function guardOp(op: ProposedOp): Promise<GuardResult> {
  const { verdict: llm, source } = await classify(op);
  const verdict = mergeVerdicts(op, llm);

  const now = new Date().toISOString();
  const requiresApproval = verdict.requires_approval;

  // Auto-allowed ops are marked allowed immediately; risky ops pause.
  // The branch/rollback refs model the real executor contract.
  const branch = `forgeguard/op-${Date.now().toString(36)}`;
  const status = requiresApproval ? "pending" : "auto_allowed";

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
    rollback_ref: requiresApproval ? null : `pre-${branch}`,
    source,
  };

  await getStore().insert(action);
  return { action, verdict, status };
}

// Re-export for callers that only need a synchronous verdict (no persistence).
export { heuristicVerdict };
