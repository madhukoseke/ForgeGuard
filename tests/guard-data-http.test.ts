import assert from "node:assert/strict";
import test from "node:test";
import {
  executeHttpBody,
  executeHttpStatus,
  queryHttpBody,
  queryHttpStatus,
} from "../lib/guard-data-http";
import type { DataExecuteResult, DataQueryResult } from "../lib/data-guard";

test("queryHttpStatus and queryHttpBody", () => {
  const applied: DataQueryResult = {
    action_id: "a1",
    status: "applied",
    rows: [{ id: 1 }],
    row_count: 1,
    truncated: false,
    redacted_cells: 0,
    masked_cells: 0,
    injection_findings: [],
  };
  assert.equal(queryHttpStatus(applied), 200);
  const body = queryHttpBody(applied);
  assert.equal(body.id, "a1");
  assert.equal(body.transport, "http");
  assert.match(body.message ?? "", /1 row/);

  const rejected: DataQueryResult = { ...applied, status: "rejected", error: "nope" };
  assert.equal(queryHttpStatus(rejected), 400);
  assert.match(queryHttpBody(rejected).message ?? "", /nope/);
});

test("executeHttpStatus and executeHttpBody", () => {
  const pending: DataExecuteResult = {
    action_id: "e1",
    status: "pending",
    severity: "critical",
    rationale: "bad",
    safer_alternative: "rename instead",
    requires_approval: true,
    injection_findings: [],
  };
  assert.equal(executeHttpStatus(pending), 202);
  assert.equal(executeHttpBody(pending).requires_approval, true);

  const applied: DataExecuteResult = { ...pending, status: "applied", requires_approval: false };
  assert.equal(executeHttpStatus(applied), 200);

  const rejected: DataExecuteResult = { ...pending, status: "rejected", error: "blocked" };
  assert.equal(executeHttpStatus(rejected), 400);
});
