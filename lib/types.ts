// Core ForgeGuard domain types. Mirrors the agent_actions table in sql/schema.sql.

export type Severity = "safe" | "low" | "medium" | "high" | "critical";

export type Category =
  | "destructive"
  | "data_loss"
  | "security"
  | "cost"
  | "migration_risk"
  | "benign";

export type ActionType =
  | "db.migration"
  | "function.deploy"
  | "storage.config"
  | "auth.config";

export type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "rolled_back"
  | "auto_allowed";

// Context an agent may attach to a proposed op. All fields optional/partial.
export interface OpContext {
  table?: string;
  row_count?: number;
  columns?: string[];
  has_rls?: boolean;
  is_public?: boolean;
  environment?: string;
}

// The payload an agent POSTs to the chokepoint (/api/guard/op).
export interface ProposedOp {
  operation_type: ActionType;
  statement: string;
  context?: OpContext;
  agent?: string;
  session_id?: string;
  target?: string;
  diff?: string;
}

// The structured judgment produced by Layer 1 + Layer 2.
export interface Verdict {
  severity: Severity;
  category: Category;
  requires_approval: boolean;
  rationale: string;
  safer_alternative: string | null;
  blast_radius: string;
}

// A persisted row in the audit trail.
export interface AgentAction {
  id: string;
  created_at: string;
  agent: string;
  session_id: string | null;
  action_type: ActionType;
  target: string | null;
  statement: string;
  diff: string | null;
  severity: Severity;
  category: Category;
  rationale: string | null;
  blast_radius: string | null;
  requires_approval: boolean;
  status: ActionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  safer_alternative: string | null;
  branch: string | null;
  rollback_ref: string | null;
  // How the verdict was reached: "deterministic" (Layer 1 only) or "llm".
  source: "deterministic" | "llm";
}

export const SEVERITY_ORDER: Severity[] = [
  "safe",
  "low",
  "medium",
  "high",
  "critical",
];

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

// requires_approval is true for medium and above (§5/§6 of the prep kit).
export function computeRequiresApproval(severity: Severity): boolean {
  return severityRank(severity) >= severityRank("medium");
}
