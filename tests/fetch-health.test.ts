import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHealthStatus } from "../components/dashboard/fetch-health";

test("parseHealthStatus accepts a valid health payload", () => {
  const status = parseHealthStatus({
    store: "memory",
    backend: "memory",
    ready: true,
    executor: "simulated",
    insforge_configured: false,
    insforge_reachable: false,
    version: "0.3.0",
  });
  assert.equal(status?.store, "memory");
  assert.equal(status?.version, "0.3.0");
});

test("parseHealthStatus rejects malformed payloads", () => {
  assert.equal(parseHealthStatus(null), null);
  assert.equal(parseHealthStatus({ store: "memory" }), null);
});
