import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getHealthStatus } from "../lib/health-status";

const ORIG = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  FORGEGUARD_STORE: process.env.FORGEGUARD_STORE,
  FORGEGUARD_BACKEND: process.env.FORGEGUARD_BACKEND,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("getHealthStatus reports ready memory demo defaults", async () => {
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  delete process.env.FORGEGUARD_STORE;
  delete process.env.FORGEGUARD_BACKEND;

  const status = await getHealthStatus();
  assert.equal(status.store, "memory");
  assert.equal(status.backend, "memory");
  assert.equal(status.ready, true);
  assert.equal(status.store_reachable, true);
  assert.equal(status.backend_reachable, true);
  assert.deepEqual(status.warnings, []);
});
