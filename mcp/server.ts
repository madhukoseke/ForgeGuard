// ForgeGuard MCP server — the middle layer between AI agents and your data.
//
// Agents connect to ForgeGuard as their database tool. Every tool call flows
// through the guard pipeline: policy checks, bidirectional prompt-injection
// scanning, destructive-statement classification, and a full audit trail.

import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDataBackend } from "../lib/backends";
import {
  guardDataExecute,
  guardDataQuery,
} from "../lib/data-guard";
import { getStore } from "../lib/store";

export interface ForgeGuardServerOptions {
  /** Reported agent name on audit rows (e.g. "claude-desktop"). */
  agent?: string;
}

function json(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/** Introspection calls are reads too — they get a lightweight audit row. */
async function auditIntrospection(
  agent: string,
  statement: string,
  target: string | null,
  sessionId?: string,
): Promise<void> {
  try {
    await getStore().insert({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      agent,
      session_id: sessionId ?? null,
      action_type: "data.query",
      target,
      statement,
      diff: null,
      severity: "safe",
      category: "benign",
      rationale: "Schema introspection.",
      blast_radius: "metadata only",
      requires_approval: false,
      status: "applied",
      reviewed_by: null,
      reviewed_at: null,
      safer_alternative: null,
      branch: null,
      rollback_ref: null,
      source: "deterministic",
      replica_id: null,
      pr_urls: null,
      preview_url: null,
      injection_findings: null,
      transport: "mcp",
    });
  } catch {
    // Auditing introspection is best-effort; never block the read.
  }
}

export function buildForgeGuardServer(
  options: ForgeGuardServerOptions = {},
): McpServer {
  const agent = options.agent || process.env.FORGEGUARD_AGENT || "mcp-agent";

  const server = new McpServer({
    name: "forgeguard",
    version: "0.3.0",
  });

  server.registerTool(
    "query",
    {
      title: "Run a read-only SQL query",
      description:
        "Run a single read-only SQL statement (SELECT/WITH/EXPLAIN/SHOW) against the guarded database. " +
        "Results are policy-masked, row-limited, and scanned for embedded prompt-injection payloads. " +
        "Every call is recorded on the ForgeGuard audit trail.",
      inputSchema: {
        sql: z.string().describe("A single read-only SQL statement."),
        max_rows: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional row cap for this call (clamped to policy max)."),
        note: z
          .string()
          .optional()
          .describe("Optional context about why you are running this query."),
      },
    },
    async ({ sql, max_rows, note }, extra) => {
      const result = await guardDataQuery({
        sql,
        max_rows,
        note,
        agent,
        session_id: extra?.sessionId,
        transport: "mcp",
      });
      return json(result);
    },
  );

  server.registerTool(
    "execute",
    {
      title: "Execute a SQL write or DDL statement",
      description:
        "Propose a SQL write/DDL statement (INSERT/UPDATE/DELETE/CREATE/ALTER/DROP...). ForgeGuard classifies " +
        "its risk: safe statements apply immediately; risky ones are HELD for human approval and you receive a " +
        "pending action_id plus a safer alternative when one exists. Poll get_action_status to learn the outcome. " +
        "Never retry a held statement verbatim — wait for approval or use the safer alternative.",
      inputSchema: {
        sql: z.string().describe("The SQL statement to execute."),
        note: z
          .string()
          .optional()
          .describe("Optional context about why this change is needed."),
      },
    },
    async ({ sql, note }, extra) => {
      const result = await guardDataExecute({
        sql,
        note,
        agent,
        session_id: extra?.sessionId,
        transport: "mcp",
      });
      return json(result);
    },
  );

  server.registerTool(
    "list_tables",
    {
      title: "List database tables",
      description: "List user tables in the guarded database.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const tables = await getDataBackend().listTables();
      await auditIntrospection(agent, "list_tables", null, extra?.sessionId);
      return json({ tables });
    },
  );

  server.registerTool(
    "describe_table",
    {
      title: "Describe a table",
      description: "Describe the columns of one table in the guarded database.",
      inputSchema: {
        table: z.string().describe("Table name."),
      },
    },
    async ({ table }, extra) => {
      const columns = await getDataBackend().describeTable(table);
      await auditIntrospection(
        agent,
        `describe_table ${table}`,
        table,
        extra?.sessionId,
      );
      return json({ table, columns });
    },
  );

  server.registerTool(
    "get_action_status",
    {
      title: "Check the status of a guarded action",
      description:
        "Check whether a held (pending) action has been approved, rejected, applied, or rolled back by a human operator.",
      inputSchema: {
        action_id: z.string().describe("The action_id returned by query/execute."),
      },
    },
    async ({ action_id }) => {
      const action = await getStore().get(action_id);
      if (!action) {
        return json({ error: `No action found with id ${action_id}` });
      }
      return json({
        action_id: action.id,
        status: action.status,
        severity: action.severity,
        rationale: action.rationale,
        safer_alternative: action.safer_alternative,
        reviewed_by: action.reviewed_by,
        reviewed_at: action.reviewed_at,
      });
    },
  );

  return server;
}
