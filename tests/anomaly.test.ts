import assert from "node:assert/strict";
import test from "node:test";
import {
  noteWriteAndDetect,
  resetAnomalyState,
} from "../lib/anomaly";

test("noteWriteAndDetect stays quiet under the burst limit", () => {
  resetAnomalyState();
  for (let i = 0; i < 3; i++) {
    assert.equal(
      noteWriteAndDetect("agent-a", "s1", {
        write_burst_limit: 5,
        write_burst_window_ms: 60_000,
      }),
      null,
    );
  }
});

test("noteWriteAndDetect signals when the burst limit is reached", () => {
  resetAnomalyState();
  let signal = null;
  for (let i = 0; i < 5; i++) {
    signal = noteWriteAndDetect("agent-b", "s2", {
      write_burst_limit: 5,
      write_burst_window_ms: 60_000,
    });
  }
  assert.ok(signal);
  assert.equal(signal!.rule, "write_burst");
  assert.match(signal!.detail, /5 writes/);
  resetAnomalyState();
});
