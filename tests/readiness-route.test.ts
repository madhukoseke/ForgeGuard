import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "../app/api/readiness/route";
import { restoreEnv, setEnv, snapshotEnv } from "./test-env";

const ORIG = snapshotEnv([
  "NODE_ENV",
  "VERCEL",
  "FORGEGUARD_STORE",
  "FORGEGUARD_STRICT_CONFIG",
  "FORGEGUARD_OPERATOR_TOKEN",
]);

afterEach(() => restoreEnv(ORIG));

test("GET /api/readiness returns ok and hides internal reachability fields", async () => {
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL", undefined);
  setEnv("FORGEGUARD_STORE", undefined);

  const res = await GET();
  const body = (await res.json()) as Record<string, unknown>;
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.ready, true);
  assert.equal("remote_insforge_reachable" in body, false);
});

test("GET /api/readiness returns 503 in strict production when misconfigured", async () => {
  setEnv("NODE_ENV", "production");
  setEnv("VERCEL", "1");
  setEnv("FORGEGUARD_STRICT_CONFIG", "1");
  setEnv("FORGEGUARD_STORE", "memory");
  setEnv("FORGEGUARD_OPERATOR_TOKEN", undefined);

  const res = await GET();
  const body = (await res.json()) as { ok: boolean; ready: boolean };
  assert.equal(res.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.ready, false);
});
