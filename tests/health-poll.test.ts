import assert from "node:assert/strict";
import { test } from "node:test";
import {
  connectionState,
  healthFetchIntervalMs,
  healthPollIntervalMs,
  isHealthDegraded,
} from "../components/dashboard/health-poll";
import type { HealthStatus } from "../components/dashboard/types";

const base: HealthStatus = {
  store: "memory",
  backend: "memory",
  ready: true,
  executor: "simulated",
  insforge_configured: false,
  insforge_reachable: false,
};

test("isHealthDegraded detects readiness and postgres failures", () => {
  assert.equal(isHealthDegraded(null), false);
  assert.equal(isHealthDegraded({ ...base, ready: false }), true);
  assert.equal(
    isHealthDegraded({
      ...base,
      store: "postgres",
      backend: "postgres",
      store_reachable: false,
    }),
    true,
  );
});

test("healthPollIntervalMs slows polling when not ready", () => {
  assert.equal(healthPollIntervalMs({ ...base, ready: false }), 10_000);
});

test("healthPollIntervalMs speeds up when pending approvals exist", () => {
  assert.equal(healthPollIntervalMs(base, 0), 4_000);
  assert.equal(healthPollIntervalMs(base, 3), 2_000);
});

test("healthFetchIntervalMs polls faster when degraded", () => {
  assert.equal(healthFetchIntervalMs(base), 15_000);
  assert.equal(healthFetchIntervalMs({ ...base, ready: false }), 10_000);
});

test("connectionState includes version in tooltip", () => {
  const state = connectionState({ ...base, version: "0.3.0" });
  assert.match(state.title, /v0\.3\.0/);
  assert.equal(state.label, "Demo");
  assert.match(state.title, /Zero-credential demo mode/);
});

test("connectionState shows degraded label with warnings", () => {
  const state = connectionState({
    ...base,
    ready: false,
    warnings: ["FORGEGUARD_OPERATOR_TOKEN is not set"],
  });
  assert.equal(state.label, "Degraded");
  assert.match(state.title, /FORGEGUARD_OPERATOR_TOKEN/);
});
