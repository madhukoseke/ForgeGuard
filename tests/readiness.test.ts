import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { collectReadinessWarnings, runtimeReadinessWarnings } from "../lib/readiness";

const ORIG = {
  FORGEGUARD_STORE: process.env.FORGEGUARD_STORE,
  FORGEGUARD_BACKEND: process.env.FORGEGUARD_BACKEND,
  FORGEGUARD_EXECUTOR: process.env.FORGEGUARD_EXECUTOR,
  DATABASE_URL: process.env.DATABASE_URL,
  FORGEGUARD_DATABASE_URL: process.env.FORGEGUARD_DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  FORGEGUARD_OPERATOR_TOKEN: process.env.FORGEGUARD_OPERATOR_TOKEN,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("collectReadinessWarnings accepts FORGEGUARD_DATABASE_URL for postgres store", () => {
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  process.env.FORGEGUARD_STORE = "postgres";
  delete process.env.DATABASE_URL;
  process.env.FORGEGUARD_DATABASE_URL = "postgres://localhost:5432/forgeguard";
  assert.deepEqual(collectReadinessWarnings(), []);
});

test("collectReadinessWarnings flags missing postgres credentials", () => {
  process.env.NODE_ENV = "development";
  process.env.FORGEGUARD_STORE = "postgres";
  delete process.env.DATABASE_URL;
  delete process.env.FORGEGUARD_DATABASE_URL;
  assert.ok(
    collectReadinessWarnings().some((w) => w.includes("DATABASE_URL is missing")),
  );
});

test("collectReadinessWarnings flags explicit postgres backend without credentials", () => {
  process.env.NODE_ENV = "development";
  process.env.FORGEGUARD_BACKEND = "postgres";
  delete process.env.DATABASE_URL;
  delete process.env.FORGEGUARD_DATABASE_URL;
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_BACKEND=postgres"),
    ),
  );
});

test("collectReadinessWarnings flags explicit insforge backend without credentials", () => {
  process.env.NODE_ENV = "development";
  process.env.FORGEGUARD_BACKEND = "insforge";
  delete process.env.INSFORGE_URL;
  delete process.env.INSFORGE_KEY;
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_BACKEND=insforge"),
    ),
  );
});

test("collectReadinessWarnings flags explicit insforge executor without credentials", () => {
  process.env.NODE_ENV = "development";
  process.env.FORGEGUARD_EXECUTOR = "insforge";
  delete process.env.INSFORGE_URL;
  delete process.env.INSFORGE_KEY;
  assert.ok(
    collectReadinessWarnings().some((w) =>
      w.includes("FORGEGUARD_EXECUTOR=insforge"),
    ),
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
