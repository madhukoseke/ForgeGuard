import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  getBootstrapMigrations,
  loadSchemaSql,
  parseActionTypes,
  parseAgentActionColumns,
  splitSchemaMigrations,
} from "../lib/schema-sql";

const REQUIRED_ACTION_TYPES = [
  "auth.config",
  "data.execute",
  "data.query",
  "db.migration",
  "function.deploy",
  "storage.config",
].sort();

const REQUIRED_COLUMNS = [
  "action_type",
  "agent",
  "applied_safer",
  "blast_radius",
  "branch",
  "category",
  "created_at",
  "diff",
  "id",
  "injection_findings",
  "preview_url",
  "pr_urls",
  "rationale",
  "replica_id",
  "requires_approval",
  "reviewed_at",
  "reviewed_by",
  "rollback_ref",
  "safer_alternative",
  "session_id",
  "severity",
  "source",
  "statement",
  "status",
  "target",
  "transport",
].sort();

test("bootstrap migrations are derived from sql/schema.sql", () => {
  const schema = loadSchemaSql();
  const parts = splitSchemaMigrations(schema);
  const migrations = getBootstrapMigrations();

  assert.ok(parts.agentActions.includes("create table if not exists agent_actions"));
  assert.ok(parts.agentActionsUpgrade.includes("injection_findings"));
  assert.ok(parts.agentActionsUpgrade.includes("data.query"));
  assert.ok(parts.usersDemo.includes("create table if not exists users"));

  assert.equal(
    migrations["forgeguard-agent-actions"],
    parts.agentActions,
  );
  assert.equal(
    migrations["forgeguard-agent-actions-upgrade"],
    parts.agentActionsUpgrade,
  );
  assert.equal(migrations["forgeguard-users-demo"], parts.usersDemo);
});

test("schema.sql includes required action types and columns", () => {
  const schema = loadSchemaSql();
  const actionTypes = parseActionTypes(schema);
  const columns = parseAgentActionColumns(schema);

  assert.deepEqual(actionTypes, REQUIRED_ACTION_TYPES);
  for (const col of REQUIRED_COLUMNS) {
    assert.ok(columns.includes(col), `missing column: ${col}`);
  }
});

test("bootstrap script loads schema.sql instead of inline stale SQL", () => {
  const bootstrapSrc = readFileSync("scripts/bootstrap-insforge.ts", "utf8");
  assert.match(bootstrapSrc, /getBootstrapMigrations/);
  assert.doesNotMatch(bootstrapSrc, /AGENT_ACTIONS_SQL/);
  assert.doesNotMatch(bootstrapSrc, /ENRICHMENT_COLUMNS_SQL/);
});
