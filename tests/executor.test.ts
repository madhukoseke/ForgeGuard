import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOp,
  rollbackOp,
  buildCompensatingSql,
  getExecutorMode,
} from "../lib/insforge-executor";
import type { AgentAction } from "../lib/types";

const baseAction = (): AgentAction => ({
  id: "00000000-0000-4000-8000-000000000001",
  created_at: new Date().toISOString(),
  agent: "test",
  session_id: null,
  action_type: "db.migration",
  target: "users",
  statement: "ALTER TABLE users DROP COLUMN last_login;",
  diff: null,
  severity: "high",
  category: "data_loss",
  rationale: "test",
  blast_radius: "5 rows",
  requires_approval: true,
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  safer_alternative: null,
  branch: "forgeguard-test",
  rollback_ref: null,
  source: "deterministic",
  replica_id: null,
  pr_urls: null,
  preview_url: null,
});

test("buildCompensatingSql reverses DROP COLUMN", () => {
  const sql = buildCompensatingSql("ALTER TABLE users DROP COLUMN last_login;");
  assert.match(sql ?? "", /ADD COLUMN last_login/i);
});

test("simulated applyOp stores rollback SQL", async () => {
  const prev = process.env.FORGEGUARD_EXECUTOR;
  process.env.FORGEGUARD_EXECUTOR = "simulated";
  try {
    const result = await applyOp(baseAction());
    assert.equal(result.applied, true);
    assert.match(result.rollback_ref, /ADD COLUMN last_login/i);
  } finally {
    if (prev === undefined) delete process.env.FORGEGUARD_EXECUTOR;
    else process.env.FORGEGUARD_EXECUTOR = prev;
  }
});

test("simulated rollbackOp succeeds", async () => {
  const prev = process.env.FORGEGUARD_EXECUTOR;
  process.env.FORGEGUARD_EXECUTOR = "simulated";
  try {
    const applied = await applyOp(baseAction());
    const result = await rollbackOp({
      ...baseAction(),
      status: "applied",
      rollback_ref: applied.rollback_ref,
    });
    assert.equal(result.applied, true);
  } finally {
    if (prev === undefined) delete process.env.FORGEGUARD_EXECUTOR;
    else process.env.FORGEGUARD_EXECUTOR = prev;
  }
});

test("getExecutorMode defaults to simulated without credentials", () => {
  const prevUrl = process.env.INSFORGE_URL;
  const prevKey = process.env.INSFORGE_KEY;
  const prevExec = process.env.FORGEGUARD_EXECUTOR;
  delete process.env.INSFORGE_URL;
  delete process.env.INSFORGE_KEY;
  process.env.FORGEGUARD_EXECUTOR = "insforge";
  try {
    assert.equal(getExecutorMode(), "simulated");
  } finally {
    if (prevUrl === undefined) delete process.env.INSFORGE_URL;
    else process.env.INSFORGE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.INSFORGE_KEY;
    else process.env.INSFORGE_KEY = prevKey;
    if (prevExec === undefined) delete process.env.FORGEGUARD_EXECUTOR;
    else process.env.FORGEGUARD_EXECUTOR = prevExec;
  }
});
