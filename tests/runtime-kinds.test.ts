import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { activeBackendKind } from "../lib/backends";
import { activeStoreKind } from "../lib/store";

const ORIG = {
  FORGEGUARD_STORE: process.env.FORGEGUARD_STORE,
  FORGEGUARD_BACKEND: process.env.FORGEGUARD_BACKEND,
  DATABASE_URL: process.env.DATABASE_URL,
  FORGEGUARD_DATABASE_URL: process.env.FORGEGUARD_DATABASE_URL,
  INSFORGE_URL: process.env.INSFORGE_URL,
  INSFORGE_KEY: process.env.INSFORGE_KEY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("activeStoreKind reports postgres when DATABASE_URL is set", () => {
  process.env.FORGEGUARD_STORE = "postgres";
  process.env.DATABASE_URL = "postgres://localhost:5432/forgeguard";
  assert.equal(activeStoreKind(), "postgres");
});

test("activeStoreKind falls back to memory without credentials", () => {
  process.env.FORGEGUARD_STORE = "postgres";
  delete process.env.DATABASE_URL;
  delete process.env.FORGEGUARD_DATABASE_URL;
  assert.equal(activeStoreKind(), "memory");
});

test("activeBackendKind reports postgres when DATABASE_URL is set", () => {
  process.env.FORGEGUARD_BACKEND = "postgres";
  process.env.DATABASE_URL = "postgres://localhost:5432/forgeguard";
  assert.equal(activeBackendKind(), "postgres");
});
