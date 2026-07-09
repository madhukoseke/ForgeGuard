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
import { guardOp } from "../lib/guard";
import { getExecutorMode } from "../lib/insforge-client";
import { DEFAULT_ACTIONS_LIMIT, MAX_ACTIONS_LIMIT } from "../lib/list-params";
import { getStore } from "../lib/store";
import type { ActionStatus, ActionType, OpContext } from "../lib/types";
import {
  BACKEND_CHANGE_TYPES,
  DATA_ACTION_TYPES,
  isDataActionType,
  parseProposedOp,
  proposedOpToDataInput,
} from "../lib/validate-op";

export interface ForgeGuardServerOptions {
  /** Reported agent name on audit rows (e.g. "claude-desktop"). */
  agent?: string;
}

const ACTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "applied",
  "rolled_back",
  "auto_allowed",
] as const satisfies readonly ActionStatus[];

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

function summarizeAction(action: {
  id: string;
  created_at: string;
  agent: string;
  action_type: ActionType;
  target: string | null;
  statement: string;
  severity: string;
  category: string;
  status: ActionStatus;
  requires_approval: boolean;
  rationale: string | null;
  safer_alternative: string | null;
  blast_radius: string | null;
  transport: string | null;
}) {
  return {
    action_id: action.id,
    created_at: action.created_at,
    agent: action.agent,
    action_type: action.action_type,
    target: action.target,
    statement: action.statement,
    severity: action.severity,
    category: action.category,
    status: action.status,
    requires_approval: action.requires_approval,
    rationale: action.rationale,
    safer_alternative: action.safer_alternative,
    blast_radius: action.blast_radius,
    transport: action.transport,
  };
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
    "propose_operation",
    {
      title: "Propose a backend-change operation",
      description:
        "Propose a backend-change op (db.migration, function.deploy, storage.config, auth.config) through the same " +
        "guard pipeline as POST /api/guard/op. Risky ops are held for human approval — poll get_action_status. " +
        "For SQL reads/writes prefer the query and execute tools. data.query / data.execute are also accepted here " +
        "for parity with the HTTP chokepoint.",
      inputSchema: {
        operation_type: z
          .enum([
            "db.migration",
            "function.deploy",
            "storage.config",
            "auth.config",
            "data.query",
            "data.execute",
          ])
          .describe("Operation type to propose."),
        statement: z
          .string()
          .describe(
            "SQL or JSON config payload for the operation (same as HTTP `statement` / `sql`).",
          ),
        target: z.string().optional().describe("Optional target (table, bucket, function name)."),
        diff: z.string().optional().describe("Optional unified diff or before/after context."),
        note: z.string().optional().describe("Optional free-text context (injection-scanned)."),
        max_rows: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional row cap when operation_type is data.query."),
        context: z
          .object({
            table: z.string().optional(),
            row_count: z.number().optional(),
            columns: z.array(z.string()).optional(),
            has_rls: z.boolean().optional(),
            is_public: z.boolean().optional(),
            environment: z.string().optional(),
          })
          .optional()
          .describe("Optional structured context for classification."),
      },
    },
    async (args, extra) => {
      const body = {
        operation_type: args.operation_type,
        statement: args.statement,
        target: args.target,
        diff: args.diff,
        note: args.note,
        max_rows: args.max_rows,
        context: args.context as OpContext | undefined,
        agent,
        session_id: extra?.sessionId,
      };
      const parsed = parseProposedOp(body);
      if (!parsed.ok) {
        return json({ error: parsed.error });
      }

      const op = { ...parsed.op, agent, transport: "mcp" as const };

      if (isDataActionType(op.operation_type)) {
        const input = {
          ...proposedOpToDataInput(op),
          agent,
          session_id: extra?.sessionId,
          transport: "mcp" as const,
        };
        if (op.operation_type === "data.query") {
          return json(await guardDataQuery(input));
        }
        return json(await guardDataExecute(input));
      }

      const { action, verdict, status, applied, apply_error } = await guardOp(op);
      const executor = getExecutorMode();
      const autoMessage =
        executor === "insforge"
          ? applied
            ? "Auto-allowed and applied on InsForge."
            : apply_error
              ? `Auto-allowed but apply failed: ${apply_error}`
              : "Auto-allowed."
          : "Auto-allowed. Executor is simulated (set FORGEGUARD_EXECUTOR=insforge to apply for real).";

      return json({
        action_id: action.id,
        status,
        severity: verdict.severity,
        category: verdict.category,
        requires_approval: verdict.requires_approval,
        rationale: verdict.rationale,
        safer_alternative: verdict.safer_alternative,
        blast_radius: verdict.blast_radius,
        source: action.source,
        applied,
        branch: action.branch,
        executor,
        apply_error: apply_error ?? null,
        transport: "mcp",
        message: verdict.requires_approval
          ? "PAUSED — ForgeGuard requires human approval before this op can apply. Poll get_action_status."
          : autoMessage,
      });
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
    "list_actions",
    {
      title: "List recent audit trail actions",
      description:
        "List recent ForgeGuard audit rows (newest first). Optionally filter by status. " +
        "Use get_action_status for a single action_id. Approval/reject/rollback remain operator HTTP/dashboard actions.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_ACTIONS_LIMIT)
          .optional()
          .describe(`Max rows to return (default ${DEFAULT_ACTIONS_LIMIT}, max ${MAX_ACTIONS_LIMIT}).`),
        offset: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Pagination offset (default 0)."),
        status: z
          .enum(ACTION_STATUSES)
          .optional()
          .describe("If set, only return actions with this status."),
      },
    },
    async ({ limit, offset, status }) => {
      const pageLimit = Math.min(
        Math.max(limit ?? DEFAULT_ACTIONS_LIMIT, 1),
        MAX_ACTIONS_LIMIT,
      );
      const pageOffset = Math.max(offset ?? 0, 0);

      if (status) {
        const filtered = (await getStore().list()).filter(
          (row) => row.status === status,
        );
        const rows = filtered.slice(pageOffset, pageOffset + pageLimit);
        return json({
          actions: rows.map(summarizeAction),
          pagination: {
            limit: pageLimit,
            offset: pageOffset,
            total: filtered.length,
            has_more: pageOffset + rows.length < filtered.length,
            status_filter: status,
          },
        });
      }

      const page = await getStore().listPage({
        limit: pageLimit,
        offset: pageOffset,
      });
      return json({
        actions: page.rows.map(summarizeAction),
        pagination: {
          limit: page.limit,
          offset: page.offset,
          total: page.total,
          has_more: page.has_more,
          status_filter: null,
        },
      });
    },
  );

  server.registerTool(
    "get_action_status",
    {
      title: "Check the status of a guarded action",
      description:
        "Check whether a held (pending) action has been approved, rejected, applied, or rolled back by a human operator.",
      inputSchema: {
        action_id: z
          .string()
          .describe("The action_id returned by query, execute, or propose_operation."),
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

// Re-export for tests / docs that want the supported backend-change set.
export { BACKEND_CHANGE_TYPES, DATA_ACTION_TYPES };
