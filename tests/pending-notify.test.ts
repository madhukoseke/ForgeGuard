import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { emitPendingAlert } from "../lib/pending-notify";
import type { AgentAction } from "../lib/types";

const ORIG = process.env.FORGEGUARD_PENDING_WEBHOOK_URL;

afterEach(() => {
  if (ORIG === undefined) delete process.env.FORGEGUARD_PENDING_WEBHOOK_URL;
  else process.env.FORGEGUARD_PENDING_WEBHOOK_URL = ORIG;
});

function pendingAction(): AgentAction {
  return {
    id: "p1",
    created_at: new Date().toISOString(),
    agent: "test",
    session_id: null,
    action_type: "db.migration",
    target: "users",
    statement: "DROP TABLE users;",
    diff: null,
    severity: "critical",
    category: "destructive",
    rationale: "drop",
    blast_radius: "all",
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
    injection_findings: null,
    transport: "http",
  };
}

test("emitPendingAlert no-ops without webhook URL", async () => {
  delete process.env.FORGEGUARD_PENDING_WEBHOOK_URL;
  assert.equal(await emitPendingAlert(pendingAction()), false);
});

test("emitPendingAlert posts forgeguard.action.pending", async () => {
  const bodies: unknown[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  process.env.FORGEGUARD_PENDING_WEBHOOK_URL = "https://hooks.example/pending";
  try {
    assert.equal(await emitPendingAlert(pendingAction()), true);
    assert.equal((bodies[0] as { event: string }).event, "forgeguard.action.pending");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
