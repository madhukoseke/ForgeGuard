// HTTP response shaping for /api/guard/query and /api/guard/execute.

import type { DataExecuteResult, DataQueryResult } from "./data-guard";

export function queryHttpStatus(result: DataQueryResult): number {
  return result.status === "rejected" ? 400 : 200;
}

export function executeHttpStatus(result: DataExecuteResult): number {
  if (result.status === "pending") return 202;
  if (result.status === "rejected") return 400;
  return 200;
}

export function queryHttpBody(result: DataQueryResult) {
  return {
    id: result.action_id,
    status: result.status,
    rows: result.rows,
    row_count: result.row_count,
    truncated: result.truncated,
    redacted_cells: result.redacted_cells,
    masked_cells: result.masked_cells,
    injection_findings: result.injection_findings,
    transport: "http" as const,
    error: result.error,
    message:
      result.status === "rejected"
        ? result.error ?? "Query rejected by ForgeGuard."
        : `Read-only query returned ${result.row_count} row(s).`,
  };
}

export function executeHttpBody(result: DataExecuteResult) {
  return {
    id: result.action_id,
    status: result.status,
    severity: result.severity,
    rationale: result.rationale,
    safer_alternative: result.safer_alternative,
    requires_approval: result.requires_approval,
    row_count: result.row_count,
    injection_findings: result.injection_findings,
    transport: "http" as const,
    error: result.error,
    message:
      result.status === "pending"
        ? "PAUSED — ForgeGuard requires human approval before this statement can run."
        : result.status === "rejected"
          ? result.error ?? "Statement rejected by ForgeGuard."
          : "Statement applied.",
  };
}
