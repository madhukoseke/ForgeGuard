import assert from "node:assert/strict";
import test from "node:test";
import type { DataBackend } from "../lib/backends";
import { probeBlastRadius } from "../lib/blast-radius";

function fakeBackend(n: number): DataBackend {
  return {
    kind: "memory",
    async executeSql(sql: string) {
      assert.match(sql, /count\(\*\)/i);
      return { rows: [{ forgeguard_n: n }], rowCount: 1, command: "SELECT" };
    },
    async listTables() {
      return [];
    },
    async describeTable() {
      return [];
    },
    async health() {
      return true;
    },
  };
}

test("probeBlastRadius is a no-op when disabled", async () => {
  const result = await probeBlastRadius(
    "DELETE FROM orders;",
    fakeBackend(99),
    false,
  );
  assert.equal(result.probed, false);
  assert.equal(result.estimate, null);
});

test("probeBlastRadius estimates rows for unconditional DELETE", async () => {
  const result = await probeBlastRadius(
    "DELETE FROM orders;",
    fakeBackend(42),
    true,
  );
  assert.equal(result.probed, true);
  assert.equal(result.estimate, "42 rows in orders");
});

test("probeBlastRadius fails open on backend errors", async () => {
  const backend: DataBackend = {
    kind: "memory",
    async executeSql() {
      throw new Error("boom");
    },
    async listTables() {
      return [];
    },
    async describeTable() {
      return [];
    },
    async health() {
      return true;
    },
  };
  const result = await probeBlastRadius("TRUNCATE orders;", backend, true);
  assert.equal(result.probed, true);
  assert.equal(result.estimate, null);
});
