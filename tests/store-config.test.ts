import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ForgeGuardConfigError } from "../lib/production";
import { getStore, resetStoreForTests } from "../lib/store";

const ORIG = {
  FORGEGUARD_STORE: process.env.FORGEGUARD_STORE,
  DATABASE_URL: process.env.DATABASE_URL,
  FORGEGUARD_DATABASE_URL: process.env.FORGEGUARD_DATABASE_URL,
  INSFORGE_URL: process.env.INSFORGE_URL,
  INSFORGE_KEY: process.env.INSFORGE_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetStoreForTests();
});

test("getStore uses memory by default", () => {
  delete process.env.FORGEGUARD_STORE;
  const store = getStore();
  assert.ok(store);
});

test("getStore refuses postgres without DATABASE_URL", () => {
  process.env.FORGEGUARD_STORE = "postgres";
  delete process.env.DATABASE_URL;
  delete process.env.FORGEGUARD_DATABASE_URL;
  assert.throws(
    () => getStore(),
    (err: unknown) =>
      err instanceof ForgeGuardConfigError &&
      /refusing memory fallback/.test(err.message),
  );
});

test("getStore refuses insforge without credentials", () => {
  process.env.FORGEGUARD_STORE = "insforge";
  delete process.env.INSFORGE_URL;
  delete process.env.INSFORGE_KEY;
  assert.throws(
    () => getStore(),
    (err: unknown) =>
      err instanceof ForgeGuardConfigError &&
      /refusing memory fallback/.test(err.message),
  );
});
