import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actionsToCsv,
  isHighRiskPending,
  isLowRiskPending,
  matchesActionQuery,
  queryActions,
} from "../lib/action-query";
import type { AgentAction } from "../lib/types";

function row(partial: Partial<AgentAction>): AgentAction {
  return {
    id: partial.id ?? "1",
    created_at: partial.created_at ?? "2026-07-01T12:00:00.000Z",
    agent: partial.agent ?? "claude",
    session_id: null,
    action_type: partial.action_type ?? "data.execute",
    target: partial.target ?? "users",
    statement: partial.statement ?? "DROP TABLE users;",
    diff: null,
    severity: partial.severity ?? "critical",
    category: partial.category ?? "destructive",
    rationale: partial.rationale ?? "drop",
    blast_radius: null,
    requires_approval: true,
    status: partial.status ?? "pending",
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
    transport: "mcp",
  };
}

test("matchesActionQuery filters by text and agent", () => {
  const action = row({ statement: "ALTER TABLE users DROP COLUMN x" });
  assert.equal(matchesActionQuery(action, { q: "drop column" }), true);
  assert.equal(matchesActionQuery(action, { q: "payments" }), false);
  assert.equal(matchesActionQuery(action, { agent: "claude" }), true);
  assert.equal(matchesActionQuery(action, { agent: "replicas" }), false);
});

test("matchesActionQuery respects date bounds", () => {
  const action = row({ created_at: "2026-07-10T15:00:00.000Z" });
  assert.equal(matchesActionQuery(action, { dateFrom: "2026-07-10" }), true);
  assert.equal(matchesActionQuery(action, { dateTo: "2026-07-09" }), false);
});

test("risk helpers classify pending severities", () => {
  assert.equal(isLowRiskPending(row({ severity: "low", status: "pending" })), true);
  assert.equal(isLowRiskPending(row({ severity: "high", status: "pending" })), false);
  assert.equal(isHighRiskPending(row({ severity: "critical", status: "pending" })), true);
  assert.equal(isHighRiskPending(row({ severity: "critical", status: "applied" })), false);
});

test("queryActions and CSV export", () => {
  const actions = [
    row({ id: "a", agent: "claude" }),
    row({ id: "b", agent: "cursor", statement: "SELECT 1" }),
  ];
  assert.equal(queryActions(actions, { agent: "cursor" }).length, 1);
  const csv = actionsToCsv(actions);
  assert.ok(csv.includes("id,created_at,agent"));
  assert.ok(csv.includes("cursor"));
});
