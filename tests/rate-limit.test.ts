import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit } from "../lib/rate-limit";

test("checkRateLimit allows under limit", () => {
  const key = "test-" + Date.now();
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit(key, { limit: 5, windowMs: 60_000 }).allowed, true);
  }
});

test("checkRateLimit blocks over limit", () => {
  const key = "block-" + Date.now();
  for (let i = 0; i < 3; i++) {
    checkRateLimit(key, { limit: 3, windowMs: 60_000 });
  }
  const blocked = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0);
});
