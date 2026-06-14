import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { isStrictConfig } from "../lib/production";

const ORIG_STRICT = process.env.FORGEGUARD_STRICT_CONFIG;

afterEach(() => {
  if (ORIG_STRICT === undefined) delete process.env.FORGEGUARD_STRICT_CONFIG;
  else process.env.FORGEGUARD_STRICT_CONFIG = ORIG_STRICT;
});

test("isStrictConfig recognizes truthy values", () => {
  process.env.FORGEGUARD_STRICT_CONFIG = "1";
  assert.equal(isStrictConfig(), true);
  process.env.FORGEGUARD_STRICT_CONFIG = "true";
  assert.equal(isStrictConfig(), true);
});

test("isStrictConfig is false when unset", () => {
  delete process.env.FORGEGUARD_STRICT_CONFIG;
  assert.equal(isStrictConfig(), false);
});
