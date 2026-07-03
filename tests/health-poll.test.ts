import assert from "node:assert/strict";
import { test } from "node:test";
import { healthPollIntervalMs } from "../components/dashboard/health-poll";
import type { HealthStatus } from "../components/dashboard/types";

const base: HealthStatus = {
  store: "memory",
  backend: "memory",
  ready: true,
  executor: "simulated",
  insforge_configured: false,
  insforge_reachable: false,
};

test("healthPollIntervalMs slows polling when not ready", () => {
  assert.equal(healthPollIntervalMs({ ...base, ready: false }), 10_000);
});

test("healthPollIntervalMs slows polling for unreachable postgres", () => {
  assert.equal(
    healthPollIntervalMs({
      ...base,
      store: "postgres",
      backend: "postgres",
      store_reachable: false,
      backend_reachable: true,
    }),
    10_000,
  );
});

test("healthPollIntervalMs uses default interval when healthy", () => {
  assert.equal(healthPollIntervalMs(base), 4_000);
  assert.equal(healthPollIntervalMs(null), 4_000);
});
