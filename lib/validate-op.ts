import { ActionType, OpContext, ProposedOp, Transport } from "./types";

export const BACKEND_CHANGE_TYPES: ActionType[] = [
  "db.migration",
  "function.deploy",
  "storage.config",
  "auth.config",
];

export const DATA_ACTION_TYPES: ActionType[] = ["data.query", "data.execute"];

export const VALID_ACTION_TYPES: ActionType[] = [
  ...BACKEND_CHANGE_TYPES,
  ...DATA_ACTION_TYPES,
];

type ParseResult =
  | { ok: true; op: ProposedOp }
  | { ok: false; error: string };

export type DataRequestParseResult =
  | { ok: true; input: DataRequestFields }
  | { ok: false; error: string };

/** Fields shared by /api/guard/query, /api/guard/execute, and data.* ops on /api/guard/op. */
export interface DataRequestFields {
  sql: string;
  agent?: string;
  session_id?: string;
  note?: string;
  max_rows?: number;
  transport?: Transport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
  maxLength = 1000,
): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function optionalPositiveInt(
  body: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function parseContext(raw: unknown): { context?: OpContext; error?: string } {
  if (raw === undefined || raw === null) return {};
  if (!isRecord(raw)) return { error: "`context` must be an object" };

  const context: OpContext = {};

  if (raw.table !== undefined) {
    if (typeof raw.table !== "string") return { error: "`context.table` must be a string" };
    context.table = raw.table.trim();
  }

  if (raw.row_count !== undefined) {
    if (
      typeof raw.row_count !== "number" ||
      !Number.isFinite(raw.row_count) ||
      raw.row_count < 0
    ) {
      return { error: "`context.row_count` must be a non-negative number" };
    }
    context.row_count = raw.row_count;
  }

  if (raw.columns !== undefined) {
    if (!Array.isArray(raw.columns) || !raw.columns.every((c) => typeof c === "string")) {
      return { error: "`context.columns` must be an array of strings" };
    }
    context.columns = raw.columns.slice(0, 100).map((c) => c.trim()).filter(Boolean);
  }

  if (raw.has_rls !== undefined) {
    if (typeof raw.has_rls !== "boolean") return { error: "`context.has_rls` must be a boolean" };
    context.has_rls = raw.has_rls;
  }

  if (raw.is_public !== undefined) {
    if (typeof raw.is_public !== "boolean") return { error: "`context.is_public` must be a boolean" };
    context.is_public = raw.is_public;
  }

  if (raw.environment !== undefined) {
    if (typeof raw.environment !== "string") {
      return { error: "`context.environment` must be a string" };
    }
    context.environment = raw.environment.trim();
  }

  return { context };
}

function parseSqlField(body: Record<string, unknown>): { sql?: string; error?: string } {
  const sql =
    typeof body.sql === "string" && body.sql.trim()
      ? body.sql.trim()
      : typeof body.statement === "string" && body.statement.trim()
        ? body.statement.trim()
        : undefined;
  if (!sql) {
    return { error: "`sql` (or `statement`) is required" };
  }
  if (sql.length > 100_000) {
    return { error: "`sql` is too large" };
  }
  return { sql };
}

function parseDataFields(
  body: Record<string, unknown>,
  transport: Transport = "http",
): DataRequestParseResult {
  const { sql, error: sqlError } = parseSqlField(body);
  if (sqlError || !sql) return { ok: false, error: sqlError ?? "`sql` is required" };

  const max_rows = optionalPositiveInt(body, "max_rows");
  if (body.max_rows !== undefined && max_rows === undefined) {
    return { ok: false, error: "`max_rows` must be a positive integer" };
  }

  return {
    ok: true,
    input: {
      sql,
      agent: optionalString(body, "agent", 200),
      session_id: optionalString(body, "session_id", 200),
      note: optionalString(body, "note", 8_000),
      max_rows,
      transport,
    },
  };
}

/** Parse POST /api/guard/query or /api/guard/execute bodies. */
export function parseDataRequest(body: unknown): DataRequestParseResult {
  if (!isRecord(body)) return { ok: false, error: "JSON body must be an object" };
  return parseDataFields(body, "http");
}

export function proposedOpToDataInput(op: ProposedOp): DataRequestFields {
  return {
    sql: op.statement,
    agent: op.agent,
    session_id: op.session_id,
    note: op.note,
    max_rows: op.max_rows,
    transport: "http",
  };
}

export function isDataActionType(type: ActionType): boolean {
  return DATA_ACTION_TYPES.includes(type);
}

export function parseProposedOp(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: "JSON body must be an object" };

  if (!VALID_ACTION_TYPES.includes(body.operation_type as ActionType)) {
    return {
      ok: false,
      error:
        "`operation_type` must be db.migration | function.deploy | storage.config | auth.config | data.query | data.execute",
    };
  }

  const operationType = body.operation_type as ActionType;

  const { sql, error: sqlError } = parseSqlField(body);
  if (sqlError || !sql) {
    return { ok: false, error: "`statement` is required" };
  }

  const max_rows = optionalPositiveInt(body, "max_rows");
  if (body.max_rows !== undefined && max_rows === undefined) {
    return { ok: false, error: "`max_rows` must be a positive integer" };
  }

  const parsedContext = parseContext(body.context);
  if (parsedContext.error) return { ok: false, error: parsedContext.error };

  return {
    ok: true,
    op: {
      operation_type: operationType,
      statement: sql,
      context: parsedContext.context,
      agent: optionalString(body, "agent", 200),
      session_id: optionalString(body, "session_id", 200),
      target: optionalString(body, "target", 500),
      diff: optionalString(body, "diff", 50_000),
      note: optionalString(body, "note", 8_000),
      max_rows,
    },
  };
}
