import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getReadinessStatus } from "../lib/readiness-status";

const ORIG = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  FORGEGUARD_STORE: process.env.FORGEGUARD_STORE,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("getReadinessStatus reports ready memory demo defaults", async () => {
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  delete process.env.FORGEGUARD_STORE;

  const status = await getReadinessStatus();
  assert.equal(status.ready, true);
  assert.equal(status.store, "memory");
  assert.equal(status.production, false);
  assert.equal(status.strict, false);
});
