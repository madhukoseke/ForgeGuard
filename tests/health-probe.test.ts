import assert from "node:assert/strict";
import test from "node:test";
import { MemoryBackend } from "../lib/backends/memory";
import { setDataBackendForTests } from "../lib/backends";
import { probeRuntimeHealth } from "../lib/health-probe";
import { getStore } from "../lib/store";

test("probeRuntimeHealth reports memory store and backend as reachable", async () => {
  setDataBackendForTests(new MemoryBackend());
  const result = await probeRuntimeHealth();
  assert.equal(result.store_reachable, true);
  assert.equal(result.backend_reachable, true);
  await getStore().list();
  setDataBackendForTests(null);
});
