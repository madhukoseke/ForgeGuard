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
  | "auth.config"
  | "data.query"
  | "data.execute";

// How the op reached ForgeGuard.
export type Transport = "http" | "mcp";

// A prompt-injection finding from the inbound/outbound scanner (lib/injection.ts).
export interface InjectionFinding {
  rule: string;
  severity: Severity;
  direction: "inbound" | "outbound";
  excerpt: string;
}

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

// The payload an agent POSTs to the chokepoint (/api/guard/op) or proposes via MCP.
export interface ProposedOp {
  operation_type: ActionType;
  statement: string;
  context?: OpContext;
  agent?: string;
  session_id?: string;
  target?: string;
  diff?: string;
  /** Free-text context for data.query / data.execute (injection-scanned). */
  note?: string;
  /** Per-call row cap for data.query (clamped to policy max). */
  max_rows?: number;
  /** How the op reached ForgeGuard (defaults to http when omitted). */
  transport?: Transport;
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
  // Cross-platform audit enrichment (Replicas webhooks, Limrun mobile preview).
  replica_id: string | null;
  pr_urls: string[] | null;
  preview_url: string | null;
  /** True when approve applied safer_alternative SQL instead of the original statement. */
  applied_safer?: boolean;
  /** Prompt-injection findings recorded by the inbound/outbound scanner. */
  injection_findings?: InjectionFinding[] | null;
  /** How the op reached ForgeGuard ("http" chokepoint or "mcp" tool call). */
  transport?: Transport | null;
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

/**
 * requires_approval when severity is at or above the configured threshold.
 * Default threshold is medium (see docs/ARCHITECTURE.md / forgeguard.config.json).
 */
export function computeRequiresApproval(
  severity: Severity,
  threshold: Severity = "medium",
): boolean {
  return severityRank(severity) >= severityRank(threshold);
}
