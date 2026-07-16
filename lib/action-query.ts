// Client/server helpers for operator trail search, bulk candidates, and export.

import type { AgentAction, Severity } from "./types";

export interface ActionQuery {
  q?: string;
  agent?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

const LOW_RISK: Severity[] = ["safe", "low"];
const HIGH_RISK: Severity[] = ["high", "critical"];

function parseDayStart(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const t = Date.parse(`${isoDate}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : null;
}

function parseDayEnd(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const t = Date.parse(`${isoDate}T23:59:59.999Z`);
  return Number.isFinite(t) ? t : null;
}

export function matchesActionQuery(
  action: AgentAction,
  query: ActionQuery,
): boolean {
  const q = query.q?.trim().toLowerCase();
  if (q) {
    const hay = [
      action.id,
      action.agent,
      action.action_type,
      action.target ?? "",
      action.statement,
      action.rationale ?? "",
      action.status,
      action.severity,
    ]
      .join("\n")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const agent = query.agent?.trim().toLowerCase();
  if (agent && !action.agent.toLowerCase().includes(agent)) return false;

  if (query.dateFrom) {
    const start = parseDayStart(query.dateFrom);
    if (start !== null && Date.parse(action.created_at) < start) return false;
  }
  if (query.dateTo) {
    const end = parseDayEnd(query.dateTo);
    if (end !== null && Date.parse(action.created_at) > end) return false;
  }

  return true;
}

export function queryActions(
  actions: AgentAction[],
  query: ActionQuery,
): AgentAction[] {
  if (
    !query.q?.trim() &&
    !query.agent?.trim() &&
    !query.dateFrom?.trim() &&
    !query.dateTo?.trim()
  ) {
    return actions;
  }
  return actions.filter((a) => matchesActionQuery(a, query));
}

export function isLowRiskPending(action: AgentAction): boolean {
  return action.status === "pending" && LOW_RISK.includes(action.severity);
}

export function isHighRiskPending(action: AgentAction): boolean {
  return action.status === "pending" && HIGH_RISK.includes(action.severity);
}

export function uniqueAgents(actions: AgentAction[]): string[] {
  return [...new Set(actions.map((a) => a.agent))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function actionsToJson(actions: AgentAction[]): string {
  return JSON.stringify(actions, null, 2);
}

export function actionsToCsv(actions: AgentAction[]): string {
  const headers = [
    "id",
    "created_at",
    "agent",
    "action_type",
    "target",
    "status",
    "severity",
    "category",
    "requires_approval",
    "reviewed_by",
    "statement",
    "rationale",
  ];
  const lines = [headers.join(",")];
  for (const a of actions) {
    lines.push(
      [
        a.id,
        a.created_at,
        a.agent,
        a.action_type,
        a.target ?? "",
        a.status,
        a.severity,
        a.category,
        String(a.requires_approval),
        a.reviewed_by ?? "",
        a.statement,
        a.rationale ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}
