import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getReadinessStatus } from "../lib/readiness-status";
import { getAppVersion } from "../lib/version";
import { restoreEnv, setEnv, snapshotEnv } from "./test-env";

const ORIG = snapshotEnv(["NODE_ENV", "VERCEL", "FORGEGUARD_STORE"]);

afterEach(() => restoreEnv(ORIG));

test("getReadinessStatus reports ready memory demo defaults", async () => {
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL", undefined);
  setEnv("FORGEGUARD_STORE", undefined);

  const status = await getReadinessStatus();
  assert.equal(status.ready, true);
  assert.equal(status.store, "memory");
  assert.equal(status.production, false);
  assert.equal(status.strict, false);
  assert.equal(status.version, getAppVersion());
});
