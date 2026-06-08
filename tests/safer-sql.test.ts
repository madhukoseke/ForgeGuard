import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isExecutableSql,
  resolveSaferStatement,
  saferSqlForRule,
} from "../lib/safer-sql";
import type { AgentAction } from "../lib/types";

const baseAction = (overrides: Partial<AgentAction>): AgentAction => ({
  id: "1",
  created_at: new Date().toISOString(),
  agent: "test",
  session_id: null,
  action_type: "db.migration",
  target: "users",
  statement: "ALTER TABLE users DROP COLUMN last_login;",
  diff: null,
  severity: "high",
  category: "data_loss",
  rationale: "drop",
  blast_radius: "5",
  requires_approval: true,
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  safer_alternative: "Use soft-delete instead.",
  branch: null,
  rollback_ref: null,
  source: "deterministic",
  replica_id: null,
  pr_urls: null,
  preview_url: null,
  ...overrides,
});

describe("safer-sql", () => {
  it("detects executable SQL", () => {
    assert.equal(
      isExecutableSql("ALTER TABLE users ADD COLUMN deleted_at timestamptz;"),
      true,
    );
    assert.equal(isExecutableSql("Use soft-delete instead."), false);
  });

  it("maps DROP COLUMN to ADD deleted_at", () => {
    const sql = saferSqlForRule("DROP COLUMN", {
      operation_type: "db.migration",
      statement: "ALTER TABLE users DROP COLUMN last_login;",
      target: "users",
    });
    assert.match(sql!, /ADD COLUMN deleted_at/i);
  });

  it("resolves prose safer_alternative to executable SQL via prefilter", () => {
    const stmt = resolveSaferStatement(baseAction({}));
    assert.match(stmt!, /ADD COLUMN deleted_at/i);
  });

  it("prefers executable safer_alternative when provided", () => {
    const custom = "ALTER TABLE users ADD COLUMN archived_at timestamptz;";
    const stmt = resolveSaferStatement(
      baseAction({ safer_alternative: custom }),
    );
    assert.equal(stmt, custom);
  });
});
