import assert from "node:assert/strict";
import { test } from "node:test";
import { getAppVersion } from "../lib/version";

test("getAppVersion matches package.json", () => {
  assert.match(getAppVersion(), /^\d+\.\d+\.\d+$/);
});
