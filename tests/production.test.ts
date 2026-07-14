import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { isProduction, isStrictConfig } from "../lib/production";

const ORIG = {
  FORGEGUARD_STRICT_CONFIG: process.env.FORGEGUARD_STRICT_CONFIG,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("isStrictConfig recognizes truthy values", () => {
  process.env.FORGEGUARD_STRICT_CONFIG = "1";
  assert.equal(isStrictConfig(), true);
  process.env.FORGEGUARD_STRICT_CONFIG = "true";
  assert.equal(isStrictConfig(), true);
});

test("isStrictConfig is false when unset outside production", () => {
  delete process.env.FORGEGUARD_STRICT_CONFIG;
  delete process.env.VERCEL;
  process.env.NODE_ENV = "test";
  assert.equal(isProduction(), false);
  assert.equal(isStrictConfig(), false);
});

test("isStrictConfig defaults on in production", () => {
  delete process.env.FORGEGUARD_STRICT_CONFIG;
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL;
  assert.equal(isStrictConfig(), true);
});

test("isStrictConfig can opt out in production with =0", () => {
  process.env.NODE_ENV = "production";
  process.env.FORGEGUARD_STRICT_CONFIG = "0";
  assert.equal(isStrictConfig(), false);
});
