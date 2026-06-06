import assert from "node:assert/strict";
import test from "node:test";
import { shouldAttachPreview } from "../lib/limrun";

test("shouldAttachPreview requires pending + approval + severity threshold", () => {
  const prev = process.env.LIMRUN_INSTANCE_ID;
  process.env.LIMRUN_INSTANCE_ID = "ios_test";

  assert.equal(
    shouldAttachPreview({
      status: "pending",
      requires_approval: true,
      severity: "high",
    }),
    true,
  );
  assert.equal(
    shouldAttachPreview({
      status: "applied",
      requires_approval: false,
      severity: "high",
    }),
    false,
  );
  assert.equal(
    shouldAttachPreview({
      status: "pending",
      requires_approval: true,
      severity: "low",
    }),
    false,
  );

  if (prev === undefined) delete process.env.LIMRUN_INSTANCE_ID;
  else process.env.LIMRUN_INSTANCE_ID = prev;
});
