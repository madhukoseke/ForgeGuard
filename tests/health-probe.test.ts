import assert from "node:assert/strict";
import test from "node:test";
import { MemoryBackend } from "../lib/backends/memory";
import { setDataBackendForTests } from "../lib/backends";
import { probeRuntimeHealth, resolveInsforgeReachable } from "../lib/health-probe";
import { getStore } from "../lib/store";

test("probeRuntimeHealth reports memory store and backend as reachable", async () => {
  setDataBackendForTests(new MemoryBackend());
  const result = await probeRuntimeHealth();
  assert.equal(result.store_reachable, true);
  assert.equal(result.backend_reachable, true);
  await getStore().list();
  setDataBackendForTests(null);
});

test("resolveInsforgeReachable reuses store probe when store is insforge", () => {
  const snapshot = {
    store: "insforge" as const,
    backend: "memory" as const,
    store_reachable: true,
    backend_reachable: true,
  };
  assert.equal(resolveInsforgeReachable(true, snapshot, false), true);
  assert.equal(
    resolveInsforgeReachable(true, { ...snapshot, store_reachable: false }, true),
    false,
  );
});

test("resolveInsforgeReachable falls back to remote probe for executor-only InsForge", () => {
  const snapshot = {
    store: "postgres" as const,
    backend: "postgres" as const,
    store_reachable: true,
    backend_reachable: true,
  };
  assert.equal(resolveInsforgeReachable(true, snapshot, true), true);
  assert.equal(resolveInsforgeReachable(true, snapshot, false), false);
  assert.equal(resolveInsforgeReachable(false, snapshot, true), false);
});
