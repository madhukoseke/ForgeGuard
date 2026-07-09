import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildForgeGuardServer } from "../mcp/server";
import { DEFAULT_POLICY, setPolicyForTests } from "../lib/policy";
import { getStore } from "../lib/store";

function resetMemoryBackend() {
  const g = globalThis as unknown as { __forgeguard_memory_backend?: unknown };
  delete g.__forgeguard_memory_backend;
}

async function connectedClient() {
  const server = buildForgeGuardServer({ agent: "test-mcp" });
  const client = new Client({ name: "test-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function parseToolResult(result: unknown): Record<string, unknown> {
  const content = (result as { content: Array<{ type: string; text: string }> })
    .content;
  return JSON.parse(content[0].text) as Record<string, unknown>;
}

test.beforeEach(async () => {
  resetMemoryBackend();
  setPolicyForTests({ ...DEFAULT_POLICY });
  await getStore().reset();
});

test.afterEach(() => {
  setPolicyForTests(null);
});

test("MCP server exposes the guarded tool set", async () => {
  const client = await connectedClient();
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    [
      "describe_table",
      "execute",
      "get_action_status",
      "list_actions",
      "list_tables",
      "propose_operation",
      "query",
    ],
  );
  await client.close();
});

test("query tool returns guarded rows and audits the request", async () => {
  const client = await connectedClient();
  const result = parseToolResult(
    await client.callTool({
      name: "query",
      arguments: { sql: "SELECT * FROM users" },
    }),
  );
  assert.equal(result.status, "applied");
  assert.equal(result.row_count, 5);

  const rows = await getStore().list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].agent, "test-mcp");
  assert.equal(rows[0].transport, "mcp");
  await client.close();
});

test("execute tool holds destructive SQL and get_action_status reflects it", async () => {
  const client = await connectedClient();
  const held = parseToolResult(
    await client.callTool({
      name: "execute",
      arguments: { sql: "DROP TABLE users;" },
    }),
  );
  assert.equal(held.status, "pending");
  assert.equal(held.severity, "critical");
  assert.ok(held.safer_alternative);

  const status = parseToolResult(
    await client.callTool({
      name: "get_action_status",
      arguments: { action_id: held.action_id as string },
    }),
  );
  assert.equal(status.status, "pending");
  await client.close();
});

test("introspection tools work and are audited", async () => {
  const client = await connectedClient();
  const tables = parseToolResult(
    await client.callTool({ name: "list_tables", arguments: {} }),
  );
  assert.deepEqual(tables.tables, [{ schema: "public", name: "users" }]);

  const described = parseToolResult(
    await client.callTool({
      name: "describe_table",
      arguments: { table: "users" },
    }),
  );
  assert.equal(described.table, "users");

  const rows = await getStore().list();
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.action_type === "data.query"));
  await client.close();
});

test("propose_operation holds a destructive migration and audits as mcp", async () => {
  const client = await connectedClient();
  const held = parseToolResult(
    await client.callTool({
      name: "propose_operation",
      arguments: {
        operation_type: "db.migration",
        statement: "ALTER TABLE users DROP COLUMN last_login;",
        context: { table: "users", row_count: 5 },
      },
    }),
  );
  assert.equal(held.status, "pending");
  assert.ok(
    held.severity === "high" || held.severity === "critical",
    `unexpected severity ${held.severity}`,
  );
  assert.equal(held.transport, "mcp");
  assert.ok(typeof held.action_id === "string");

  const status = parseToolResult(
    await client.callTool({
      name: "get_action_status",
      arguments: { action_id: held.action_id as string },
    }),
  );
  assert.equal(status.status, "pending");

  const listed = parseToolResult(
    await client.callTool({
      name: "list_actions",
      arguments: { status: "pending", limit: 10 },
    }),
  );
  const actions = listed.actions as Array<Record<string, unknown>>;
  assert.ok(actions.some((a) => a.action_id === held.action_id));
  assert.equal(
    (listed.pagination as { status_filter: string }).status_filter,
    "pending",
  );

  const rows = await getStore().list();
  assert.equal(rows[0].transport, "mcp");
  assert.equal(rows[0].action_type, "db.migration");
  await client.close();
});

test("propose_operation routes data.execute like the execute tool", async () => {
  const client = await connectedClient();
  const held = parseToolResult(
    await client.callTool({
      name: "propose_operation",
      arguments: {
        operation_type: "data.execute",
        statement: "DROP TABLE users;",
      },
    }),
  );
  assert.equal(held.status, "pending");
  assert.equal(held.severity, "critical");
  await client.close();
});

test("list_actions returns recent trail rows", async () => {
  const client = await connectedClient();
  await client.callTool({
    name: "query",
    arguments: { sql: "SELECT * FROM users" },
  });
  const listed = parseToolResult(
    await client.callTool({
      name: "list_actions",
      arguments: { limit: 5 },
    }),
  );
  const actions = listed.actions as Array<Record<string, unknown>>;
  assert.ok(actions.length >= 1);
  assert.equal(actions[0].action_type, "data.query");
  assert.equal(
    (listed.pagination as { has_more: boolean }).has_more,
    false,
  );
  await client.close();
});
