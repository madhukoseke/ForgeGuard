import assert from "node:assert/strict";
import { test } from "node:test";
import { getReadinessStatus, toReadinessResponse } from "../lib/readiness-status";

test("toReadinessResponse adds ok and strips internal fields", async () => {
  const status = await getReadinessStatus();
  const body = toReadinessResponse(status);
  assert.equal(body.ok, body.ready);
  assert.equal("remote_insforge_reachable" in body, false);
});
