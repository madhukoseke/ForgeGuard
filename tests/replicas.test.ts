import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  extractPrUrls,
  parseReplicasPayload,
  pickActionsToEnrich,
  verifyReplicasSignature,
} from "../lib/replicas";
import type { AgentAction } from "../lib/types";

test("verifyReplicasSignature accepts valid sha256", () => {
  const secret = "whsec_test";
  const body = '{"type":"replica.turn_completed"}';
  const sig = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
  assert.equal(verifyReplicasSignature(body, sig, secret), true);
});

test("verifyReplicasSignature rejects tampered body", () => {
  const secret = "whsec_test";
  const body = '{"type":"replica.turn_completed"}';
  const sig = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
  assert.equal(verifyReplicasSignature('{"type":"replica.deleted"}', sig, secret), false);
});

test("extractPrUrls merges top-level and repository statuses", () => {
  const payload = parseReplicasPayload({
    id: "wh_1",
    type: "replica.turn_completed",
    created_at: "2026-01-01T00:00:00Z",
    replica: { id: "rep-1", name: "fix", status: "active" },
    data: {
      pr_urls: ["https://github.com/o/r/pull/1"],
      repository_statuses: [
        {
          repository: "monorepo",
          branch: "fix",
          default_branch: "main",
          pr_urls: ["https://github.com/o/r/pull/2"],
        },
      ],
    },
  });
  assert.ok(payload);
  const urls = extractPrUrls(payload);
  assert.equal(urls.length, 2);
  assert.ok(urls.includes("https://github.com/o/r/pull/1"));
  assert.ok(urls.includes("https://github.com/o/r/pull/2"));
});

test("pickActionsToEnrich prefers session_id match", () => {
  const actions: AgentAction[] = [
    {
      id: "a1",
      created_at: "2026-01-01T00:00:00Z",
      agent: "replicas",
      session_id: "rep-1",
      action_type: "db.migration",
      target: "users",
      statement: "DROP TABLE x;",
      diff: null,
      severity: "critical",
      category: "destructive",
      rationale: null,
      blast_radius: null,
      requires_approval: true,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      safer_alternative: null,
      branch: null,
      rollback_ref: null,
      source: "deterministic",
      replica_id: null,
      pr_urls: null,
      preview_url: null,
    },
  ];
  const picked = pickActionsToEnrich(actions, "rep-1");
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "a1");
});
