import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { collectReadinessWarnings, executorReachabilityWarning, runtimeReadinessWarnings } from "../lib/readiness";
import { restoreEnv, setEnv, snapshotEnv } from "./test-env";

const ORIG = snapshotEnv([
  "FORGEGUARD_STORE",
  "FORGEGUARD_BACKEND",
  "FORGEGUARD_EXECUTOR",
  "DATABASE_URL",
  "FORGEGUARD_DATABASE_URL",
  "NODE_ENV",
  "VERCEL",
  "FORGEGUARD_OPERATOR_TOKEN",
  "INSFORGE_URL",
  "INSFORGE_KEY",
]);

afterEach(() => restoreEnv(ORIG));

test("collectReadinessWarnings accepts FORGEGUARD_DATABASE_URL for postgres store", () => {
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL", undefined);
  setEnv("FORGEGUARD_STORE", "postgres");
  setEnv("DATABASE_URL", undefined);
  setEnv("FORGEGUARD_DATABASE_URL", "postgres://localhost:5432/forgeguard");
  assert.deepEqual(collectReadinessWarnings(), []);
});

test("collectReadinessWarnings flags missing postgres credentials", () => {
  setEnv("NODE_ENV", "development");
  setEnv("FORGEGUARD_STORE", "postgres");
  setEnv("DATABASE_URL", undefined);
  setEnv("FORGEGUARD_DATABASE_URL", undefined);
  assert.ok(
    collectReadinessWarnings().some((w) => w.includes("DATABASE_URL is missing")),
  );
});

test("collectReadinessWarnings flags explicit postgres backend without credentials", () => {
  setEnv("NODE_ENV", "development");
  setEnv("FORGEGUARD_BACKEND", "postgres");
  setEnv("DATABASE_URL", undefined);
  setEnv("FORGEGUARD_DATABASE_URL", undefined);
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_BACKEND=postgres"),
    ),
  );
});

test("collectReadinessWarnings flags explicit insforge backend without credentials", () => {
  setEnv("NODE_ENV", "development");
  setEnv("FORGEGUARD_BACKEND", "insforge");
  setEnv("INSFORGE_URL", undefined);
  setEnv("INSFORGE_KEY", undefined);
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_BACKEND=insforge"),
    ),
  );
});

test("collectReadinessWarnings flags explicit insforge executor without credentials", () => {
  setEnv("NODE_ENV", "development");
  setEnv("FORGEGUARD_EXECUTOR", "insforge");
  setEnv("INSFORGE_URL", undefined);
  setEnv("INSFORGE_KEY", undefined);
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_EXECUTOR=insforge"),
    ),
  );
});

test("executorReachabilityWarning flags unreachable executor-only InsForge", () => {
  assert.equal(
    executorReachabilityWarning("insforge", "postgres", "postgres", false),
    "InsForge executor is not reachable",
  );
  assert.equal(
    executorReachabilityWarning("insforge", "insforge", "memory", false),
    null,
  );
  assert.equal(
    executorReachabilityWarning("simulated", "postgres", "postgres", false),
    null,
  );
});

test("runtimeReadinessWarnings flags unreachable postgres dependencies", () => {
  const warnings = runtimeReadinessWarnings(
    "postgres",
    "postgres",
    { store_reachable: false, backend_reachable: false },
  );
  assert.equal(warnings.length, 2);
  assert.ok(warnings.some((w) => w.includes("audit store")));
  assert.ok(warnings.some((w) => w.includes("data backend")));
});
