// Guard pipeline for the AI–data path (MCP tools `query` and `execute`).
//
// Every request — including reads — becomes an audit row. The flow is:
//   policy check → inbound injection scan → (reads) read-only enforcement →
//   classify (executes only) → execute via DataBackend → outbound scan +
//   masking → audit.

import { randomUUID } from "crypto";
import { getDataBackend } from "./backends";
import type { DataBackend } from "./backends";
import { noteWriteAndDetect } from "./anomaly";
import { probeBlastRadius } from "./blast-radius";
import { classify, heuristicVerdict } from "./classifier";
import {
  llmScanText,
  maxFindingSeverity,
  scanInbound,
  scanRows,
} from "./injection";
import { inverseSql } from "./inverse-sql";
import { emitPendingAlert } from "./pending-notify";
import {
  checkPolicy,
  loadPolicy,
  maskRows,
  referencedTables,
} from "./policy";
import { getStore } from "./store";
import {
  AgentAction,
  InjectionFinding,
  Severity,
  Transport,
  Verdict,
  computeRequiresApproval,
  maxSeverity,
  severityRank,
} from "./types";
import { prefilter } from "./prefilter";

export interface DataRequestInput {
  sql: string;
  agent?: string;
  session_id?: string;
  /** Free-text context the agent attached (also injection-scanned). */
  note?: string;
  /** Per-call row cap; clamped to the policy max. */
  max_rows?: number;
  /** How the request reached ForgeGuard. Defaults to "mcp". */
  transport?: Transport;
}

export interface DataQueryResult {
  action_id: string;
  status: "applied" | "rejected";
  rows: Record<string, unknown>[];
  row_count: number;
  truncated: boolean;
  redacted_cells: number;
  masked_cells: number;
  injection_findings: InjectionFinding[];
  error?: string;
}

export interface DataExecuteResult {
  action_id: string;
  status: "applied" | "pending" | "rejected";
  severity: Severity;
  rationale: string;
  safer_alternative: string | null;
  requires_approval: boolean;
  row_count?: number;
  injection_findings: InjectionFinding[];
  error?: string;
}

const MUTATION_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|reindex|cluster|refresh|call|do|merge|set\s+role|security\s+definer)\b/i;

/** Conservative read-only check: must be a single SELECT-ish statement. */
export function isReadOnlySql(sql: string): boolean {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!trimmed || trimmed.includes(";")) return false;
  if (!/^(select|with|explain|show)\b/i.test(trimmed)) return false;
  return !MUTATION_KEYWORDS.test(trimmed);
}

function baseAction(
  input: DataRequestInput,
  actionType: "data.query" | "data.execute",
): AgentAction {
  return {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    agent:
      input.agent ??
      (input.transport === "http" ? "http-agent" : "mcp-agent"),
    session_id: input.session_id ?? null,
    action_type: actionType,
    target: referencedTables(input.sql).join(", ") || null,
    statement: input.sql,
    diff: null,
    severity: "safe",
    category: "benign",
    rationale: null,
    blast_radius: null,
    requires_approval: false,
    status: "auto_allowed",
    reviewed_by: null,
    reviewed_at: null,
    safer_alternative: null,
    branch: null,
    rollback_ref: null,
    source: "deterministic",
    replica_id: null,
    pr_urls: null,
    preview_url: null,
    injection_findings: null,
    transport: input.transport ?? "mcp",
  };
}

async function inboundFindings(
  input: DataRequestInput,
): Promise<InjectionFinding[]> {
  const deterministic = scanInbound([input.sql, input.note]);
  const llm = await llmScanText(
    [input.sql, input.note].filter(Boolean).join("\n\n"),
    "inbound",
  );
  return [...deterministic, ...llm];
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function guardDataQuery(
  input: DataRequestInput,
  backend: DataBackend = getDataBackend(),
): Promise<DataQueryResult> {
  const policy = loadPolicy();
  const action = baseAction(input, "data.query");
  const findings = await inboundFindings(input);
  action.injection_findings = findings.length > 0 ? findings : null;

  const reject = async (
    rationale: string,
    severity: Severity = "medium",
  ): Promise<DataQueryResult> => {
    action.status = "rejected";
    action.severity = severity;
    action.category = "security";
    action.rationale = rationale;
    await getStore().insert(action);
    return {
      action_id: action.id,
      status: "rejected",
      rows: [],
      row_count: 0,
      truncated: false,
      redacted_cells: 0,
      masked_cells: 0,
      injection_findings: findings,
      error: rationale,
    };
  };

  // Inbound prompt injection: high-confidence hits never reach the database.
  const topInjection = maxFindingSeverity(findings);
  if (topInjection && severityRank(topInjection) >= severityRank("high")) {
    return reject(
      `Blocked: inbound prompt-injection pattern detected (${findings
        .map((f) => f.rule)
        .join(", ")}).`,
      topInjection,
    );
  }

  if (!isReadOnlySql(input.sql)) {
    return reject(
      "Blocked: the query tool only accepts a single read-only SELECT/WITH/EXPLAIN/SHOW statement. Use the execute tool for writes.",
    );
  }

  const violation = checkPolicy(input.sql, policy);
  if (violation) {
    return reject(`Blocked by policy: ${violation.detail}`);
  }

  const limit = Math.min(
    input.max_rows && input.max_rows > 0 ? input.max_rows : policy.max_rows,
    policy.max_rows,
  );

  let result;
  try {
    result = await backend.executeSql(input.sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return reject(`Query failed: ${msg}`, "low");
  }

  const truncated = result.rows.length > limit;
  const limited = truncated ? result.rows.slice(0, limit) : result.rows;

  const tables = referencedTables(input.sql);
  const { rows: maskedRows, masked_cells } = maskRows(limited, tables, policy);
  const { rows: cleanRows, findings: outbound, redacted_cells } =
    scanRows(maskedRows);

  if (outbound.length > 0) {
    findings.push(...outbound);
    action.injection_findings = findings;
  }

  action.status = "applied";
  action.severity = maxFindingSeverity(findings) ?? "safe";
  action.category = findings.length > 0 ? "security" : "benign";
  action.rationale =
    findings.length > 0
      ? `Read-only query returned ${limited.length} rows; ${redacted_cells} cell(s) redacted for embedded injection payloads.`
      : `Read-only query returned ${limited.length} rows.`;
  action.blast_radius = `${result.rowCount} rows read`;
  await getStore().insert(action);

  return {
    action_id: action.id,
    status: "applied",
    rows: cleanRows,
    row_count: cleanRows.length,
    truncated,
    redacted_cells,
    masked_cells,
    injection_findings: findings,
  };
}

// ─── Writes / DDL ─────────────────────────────────────────────────────────────

function mergeExecuteVerdict(
  input: DataRequestInput,
  llm: Verdict,
  findings: InjectionFinding[],
  blastOverride?: string | null,
): Verdict {
  const op = { operation_type: "data.execute" as const, statement: input.sql };
  const pf = prefilter(op);
  const deterministic = heuristicVerdict(op);
  const injectionSeverity = maxFindingSeverity(findings) ?? "safe";
  const severity = maxSeverity(
    maxSeverity(pf.severity, llm.severity),
    injectionSeverity,
  );
  const category =
    severityRank(injectionSeverity) > severityRank(pf.severity) &&
    severityRank(injectionSeverity) > severityRank(llm.severity)
      ? "security"
      : severityRank(pf.severity) >= severityRank(llm.severity)
        ? pf.category
        : llm.category;
  const policy = loadPolicy();
  const anomaly = noteWriteAndDetect(input.agent, input.session_id, {
    write_burst_limit: policy.anomaly_write_burst_limit,
    write_burst_window_ms: policy.anomaly_write_burst_window_ms,
  });
  let rationale =
    findings.length > 0
      ? `${llm.rationale} Inbound injection patterns detected: ${findings.map((f) => f.rule).join(", ")}.`
      : llm.rationale;
  if (anomaly) rationale = `${rationale} [anomaly] ${anomaly.detail}`;

  const blast_radius =
    blastOverride ||
    (deterministic.blast_radius !== "unknown"
      ? deterministic.blast_radius
      : llm.blast_radius);

  return {
    severity,
    category,
    requires_approval: computeRequiresApproval(
      severity,
      policy.approval_threshold,
    ),
    rationale,
    safer_alternative: llm.safer_alternative ?? deterministic.safer_alternative,
    blast_radius,
  };
}

export async function guardDataExecute(
  input: DataRequestInput,
  backend: DataBackend = getDataBackend(),
): Promise<DataExecuteResult> {
  const policy = loadPolicy();
  const action = baseAction(input, "data.execute");
  const findings = await inboundFindings(input);
  action.injection_findings = findings.length > 0 ? findings : null;

  const violation = checkPolicy(input.sql, policy);
  if (violation) {
    action.status = "rejected";
    action.severity = "medium";
    action.category = "security";
    action.rationale = `Blocked by policy: ${violation.detail}`;
    await getStore().insert(action);
    return {
      action_id: action.id,
      status: "rejected",
      severity: action.severity,
      rationale: action.rationale,
      safer_alternative: null,
      requires_approval: false,
      injection_findings: findings,
      error: action.rationale,
    };
  }

  const { verdict: llm, source } = await classify({
    operation_type: "data.execute",
    statement: input.sql,
    agent: input.agent,
    session_id: input.session_id,
  });
  const blast = await probeBlastRadius(
    input.sql,
    backend,
    policy.blast_radius_probe,
  );
  const verdict = mergeExecuteVerdict(
    input,
    llm,
    findings,
    blast.estimate,
  );

  action.severity = verdict.severity;
  action.category = verdict.category;
  action.rationale = verdict.rationale;
  action.blast_radius = verdict.blast_radius;
  action.safer_alternative = verdict.safer_alternative;
  action.requires_approval = verdict.requires_approval;
  action.source = source;

  if (verdict.requires_approval) {
    action.status = "pending";
    await getStore().insert(action);
    void emitPendingAlert(action);
    return {
      action_id: action.id,
      status: "pending",
      severity: verdict.severity,
      rationale: verdict.rationale,
      safer_alternative: verdict.safer_alternative,
      requires_approval: true,
      injection_findings: findings,
    };
  }

  // Auto-allowed: execute through the backend, keep a compensating-SQL
  // snapshot for rollback when one can be derived.
  try {
    const result = await backend.executeSql(input.sql);
    const compensating = inverseSql(input.sql);
    action.status = "applied";
    action.blast_radius = `${result.rowCount} rows affected`;
    action.rollback_ref = JSON.stringify({
      compensating_sql: compensating ?? "",
      applied_sql: input.sql,
      mode: backend.kind === "memory" ? "simulated" : backend.kind,
    });
    await getStore().insert(action);
    return {
      action_id: action.id,
      status: "applied",
      severity: verdict.severity,
      rationale: verdict.rationale,
      safer_alternative: verdict.safer_alternative,
      requires_approval: false,
      row_count: result.rowCount,
      injection_findings: findings,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    action.status = "rejected";
    action.rationale = `${verdict.rationale} Execution failed: ${msg}`.trim();
    await getStore().insert(action);
    return {
      action_id: action.id,
      status: "rejected",
      severity: verdict.severity,
      rationale: action.rationale,
      safer_alternative: verdict.safer_alternative,
      requires_approval: false,
      injection_findings: findings,
      error: msg,
    };
  }
}

// ─── Approval-path execution for held data ops ───────────────────────────────

export interface DataApplyResult {
  applied: boolean;
  rollback_ref: string;
  error?: string;
  /** Unused for data actions; present for parity with the executor result. */
  branch?: string;
}

/** Apply an approved `data.*` action through the DataBackend. */
export async function applyDataAction(
  action: AgentAction,
  backend: DataBackend = getDataBackend(),
): Promise<DataApplyResult> {
  try {
    const result = await backend.executeSql(action.statement);
    const compensating = inverseSql(action.statement);
    return {
      applied: true,
      rollback_ref: JSON.stringify({
        compensating_sql: compensating ?? "",
        applied_sql: action.statement,
        mode: backend.kind === "memory" ? "simulated" : backend.kind,
        row_count: result.rowCount,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: "", error: msg };
  }
}

/** Roll back an applied `data.*` action via its compensating-SQL snapshot. */
export async function rollbackDataAction(
  action: AgentAction,
  backend: DataBackend = getDataBackend(),
): Promise<DataApplyResult> {
  let snapshot: { compensating_sql?: string; mode?: string } | null = null;
  try {
    snapshot = action.rollback_ref ? JSON.parse(action.rollback_ref) : null;
  } catch {
    snapshot = null;
  }
  if (snapshot?.mode === "simulated" || backend.kind === "memory") {
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  }
  if (!snapshot?.compensating_sql) {
    return {
      applied: false,
      rollback_ref: action.rollback_ref ?? "",
      error: "No compensating SQL recorded for this action",
    };
  }
  try {
    await backend.executeSql(snapshot.compensating_sql);
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: msg };
  }
}
