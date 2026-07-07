import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "../app/api/health/route";
import { restoreEnv, setEnv, snapshotEnv } from "./test-env";

const ORIG = snapshotEnv(["NODE_ENV", "VERCEL", "FORGEGUARD_STORE"]);

afterEach(() => restoreEnv(ORIG));

test("GET /api/health?minimal=ready reflects config readiness", async () => {
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL", undefined);
  setEnv("FORGEGUARD_STORE", undefined);

  const res = await GET(new Request("http://localhost/api/health?minimal=ready"));
  const body = (await res.json()) as { ok: boolean };
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(res.headers.get("X-ForgeGuard-Version"), "0.3.0");
});
