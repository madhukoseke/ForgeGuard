import assert from "node:assert/strict";
import { test } from "node:test";
import { getAppVersion } from "../lib/version";
import { forgeguardVersionHeaders } from "../lib/version-headers";

test("forgeguardVersionHeaders includes package version", () => {
  const headers = forgeguardVersionHeaders() as Record<string, string>;
  assert.equal(headers["X-ForgeGuard-Version"], getAppVersion());
});
