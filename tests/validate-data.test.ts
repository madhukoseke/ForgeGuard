import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_ACTION_TYPES,
  isDataActionType,
  parseDataRequest,
  parseProposedOp,
  proposedOpToDataInput,
} from "../lib/validate-op";

test("parseDataRequest accepts sql and optional fields", () => {
  const parsed = parseDataRequest({
    sql: "SELECT 1",
    agent: "curl",
    note: "weekly report",
    max_rows: 50,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.input.sql, "SELECT 1");
  assert.equal(parsed.input.agent, "curl");
  assert.equal(parsed.input.note, "weekly report");
  assert.equal(parsed.input.max_rows, 50);
  assert.equal(parsed.input.transport, "http");
});

test("parseDataRequest accepts statement alias", () => {
  const parsed = parseDataRequest({ statement: "SELECT 2" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.input.sql, "SELECT 2");
});

test("parseDataRequest rejects invalid max_rows", () => {
  const parsed = parseDataRequest({ sql: "SELECT 1", max_rows: -1 });
  assert.equal(parsed.ok, false);
});

test("parseProposedOp accepts data.query and data.execute", () => {
  for (const operation_type of DATA_ACTION_TYPES) {
    const parsed = parseProposedOp({
      operation_type,
      statement: "SELECT * FROM users",
      note: "context",
      max_rows: 10,
    });
    assert.equal(parsed.ok, true, operation_type);
  }
});

test("parseProposedOp still rejects unknown operation types", () => {
  const parsed = parseProposedOp({
    operation_type: "db.drop_everything",
    statement: "select 1",
  });
  assert.equal(parsed.ok, false);
  assert.match(parsed.error ?? "", /data\.query/);
});

test("isDataActionType and proposedOpToDataInput", () => {
  assert.equal(isDataActionType("data.query"), true);
  assert.equal(isDataActionType("db.migration"), false);
  const input = proposedOpToDataInput({
    operation_type: "data.execute",
    statement: "DROP TABLE t;",
    agent: "agent-x",
    note: "cleanup",
  });
  assert.equal(input.sql, "DROP TABLE t;");
  assert.equal(input.transport, "http");
  assert.equal(input.note, "cleanup");
});
