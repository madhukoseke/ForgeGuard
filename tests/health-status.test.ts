import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getHealthStatus } from "../lib/health-status";
import { getAppVersion } from "../lib/version";
import { restoreEnv, setEnv, snapshotEnv } from "./test-env";

const ORIG = snapshotEnv([
  "NODE_ENV",
  "VERCEL",
  "FORGEGUARD_STORE",
  "FORGEGUARD_BACKEND",
]);

afterEach(() => restoreEnv(ORIG));

test("getHealthStatus reports ready memory demo defaults", async () => {
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL", undefined);
  setEnv("FORGEGUARD_STORE", undefined);
  setEnv("FORGEGUARD_BACKEND", undefined);

  const status = await getHealthStatus();
  assert.equal(status.store, "memory");
  assert.equal(status.backend, "memory");
  assert.equal(status.ready, true);
  assert.equal(status.store_reachable, true);
  assert.equal(status.backend_reachable, true);
  assert.equal(status.version, getAppVersion());
  assert.deepEqual(status.warnings, []);
});
