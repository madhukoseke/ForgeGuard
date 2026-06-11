import assert from "node:assert/strict";
import test from "node:test";
import {
  createDataBackend,
  requestedBackendKind,
  setDataBackendForTests,
} from "../lib/backends";
import { MemoryBackend } from "../lib/backends/memory";
import { sqlCommand } from "../lib/backends/types";

function freshBackend() {
  const g = globalThis as unknown as { __forgeguard_memory_backend?: unknown };
  delete g.__forgeguard_memory_backend;
  return new MemoryBackend();
}

test("sqlCommand extracts the leading keyword", () => {
  assert.equal(sqlCommand("SELECT * FROM x"), "SELECT");
  assert.equal(sqlCommand("  insert into y values (1)"), "INSERT");
  assert.equal(sqlCommand("WITH t AS (SELECT 1) SELECT * FROM t"), "WITH");
});

test("memory backend serves the seeded demo table", async () => {
  const backend = freshBackend();
  const tables = await backend.listTables();
  assert.deepEqual(tables, [{ schema: "public", name: "users" }]);

  const columns = await backend.describeTable("users");
  assert.ok(columns.some((c) => c.name === "email" && !c.is_nullable));

  const result = await backend.executeSql("SELECT * FROM users");
  assert.equal(result.rowCount, 5);
  assert.equal(result.command, "SELECT");
  assert.equal(await backend.health(), true);
});

test("memory backend tracks simulated create/drop table", async () => {
  const backend = freshBackend();
  await backend.executeSql("CREATE TABLE notes (id uuid primary key)");
  assert.ok((await backend.listTables()).some((t) => t.name === "notes"));
  await backend.executeSql("DROP TABLE notes");
  assert.ok(!(await backend.listTables()).some((t) => t.name === "notes"));
});

test("backend selection falls back to memory without credentials", () => {
  const savedEnv = { ...process.env };
  delete process.env.FORGEGUARD_BACKEND;
  delete process.env.FORGEGUARD_DATABASE_URL;
  delete process.env.DATABASE_URL;
  delete process.env.INSFORGE_URL;
  delete process.env.INSFORGE_KEY;
  try {
    assert.equal(requestedBackendKind(), "memory");
    // Requesting postgres without DATABASE_URL degrades gracefully.
    assert.equal(createDataBackend("postgres").kind, "memory");
    assert.equal(createDataBackend("insforge").kind, "memory");
  } finally {
    process.env = savedEnv;
    setDataBackendForTests(null);
  }
});

test("backend selection honors explicit env", () => {
  const savedEnv = { ...process.env };
  process.env.FORGEGUARD_BACKEND = "postgres";
  process.env.DATABASE_URL = "postgres://localhost:5432/example";
  try {
    assert.equal(requestedBackendKind(), "postgres");
    assert.equal(createDataBackend("postgres").kind, "postgres");
  } finally {
    process.env = savedEnv;
    setDataBackendForTests(null);
  }
});
