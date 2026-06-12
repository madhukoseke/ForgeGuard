import assert from "node:assert/strict";
import test from "node:test";
import { guardOp } from "../lib/guard";
import { prefilter } from "../lib/prefilter";
import { getStore } from "../lib/store";
import { parseProposedOp } from "../lib/validate-op";

test("prefilter marks destructive SQL as critical", () => {
  const verdict = prefilter({
    operation_type: "db.migration",
    statement: "DROP TABLE users;",
  });

  assert.equal(verdict.severity, "critical");
  assert.equal(verdict.category, "destructive");
  assert.equal(verdict.requires_approval, true);
});

test("prefilter catches unconditional mutations", () => {
  const verdict = prefilter({
    operation_type: "db.migration",
    statement: "DELETE FROM orders;",
  });

  assert.equal(verdict.severity, "critical");
  assert.equal(verdict.category, "data_loss");
});

test("safe additive migration is auto-allowed", async () => {
  await getStore().reset();

  const result = await guardOp({
    operation_type: "db.migration",
    statement: "ALTER TABLE users ADD COLUMN nickname text;",
    context: { table: "users", row_count: 5 },
  });

  assert.equal(result.status, "applied");
  assert.equal(result.action.requires_approval, false);
  assert.equal(result.applied, true);
  assert.equal(result.action.source, "deterministic");
});

test("dangerous migration pauses for approval", async () => {
  await getStore().reset();

  const result = await guardOp({
    operation_type: "db.migration",
    statement: "ALTER TABLE users DROP COLUMN last_login;",
    context: { table: "users", row_count: 5 },
  });

  assert.equal(result.status, "pending");
  assert.equal(result.action.requires_approval, true);
  assert.equal(result.action.severity, "high");
  assert.match(result.action.safer_alternative ?? "", /soft-delete|archived/i);
  assert.equal(result.action.blast_radius, "5 rows in users");
});

test("operation parser rejects unknown operation types", () => {
  const parsed = parseProposedOp({
    operation_type: "db.drop_everything",
    statement: "select 1",
  });

  assert.equal(parsed.ok, false);
  assert.match(parsed.error ?? "", /data\.query/);
});

test("operation parser accepts data.query", () => {
  const parsed = parseProposedOp({
    operation_type: "data.query",
    statement: "SELECT 1",
    note: "health check",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.op.note, "health check");
  }
});
