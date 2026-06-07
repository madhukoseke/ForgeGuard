// ============================================================
// ForgeGuard — domain model
// ============================================================

export type Agent = "claude-code" | "devin" | "replicas";

export type ActionType =
  | "db.migration"
  | "function.deploy"
  | "storage.config"
  | "auth.config";

export type Severity = "safe" | "low" | "medium" | "high" | "critical";

export type Category =
  | "destructive"
  | "data_loss"
  | "security"
  | "cost"
  | "migration_risk"
  | "benign";

export type Status =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "rolled_back"
  | "auto_allowed";

/** "deterministic" = Layer 1 regex filter · "llm" = Layer 2 model classifier */
export type Source = "deterministic" | "llm";

/**
 * A single diff line: [kind, text] where kind is "add" | "del" | "ctx"
 * (kept as string[] so object-literal op definitions don't need `as const`).
 */
export type DiffLine = string[];

export interface AgentAction {
  id: string;
  created_at: string; // ISO
  agent: Agent;
  session_id: string;
  action_type: ActionType;
  target: string;
  statement: string;
  diff: DiffLine[];
  severity: Severity;
  category: Category;
  rationale: string;
  blast_radius: string;
  requires_approval: boolean;
  status: Status;
  reviewed_by: string | null;
  reviewed_at: string | null;
  safer_alternative: string | null;
  branch: string;
  rollback_ref: string;
  source: Source;
  /** internal: was the safer alternative applied on approve */
  applied_safer?: boolean;
}

export const SEVERITY_RANK: Record<Severity, number> = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
