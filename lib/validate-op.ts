import { ActionType, OpContext, ProposedOp } from "./types";

export const VALID_ACTION_TYPES: ActionType[] = [
  "db.migration",
  "function.deploy",
  "storage.config",
  "auth.config",
];

type ParseResult =
  | { ok: true; op: ProposedOp }
  | { ok: false; error: string };

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

export function parseProposedOp(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: "JSON body must be an object" };

  if (!VALID_ACTION_TYPES.includes(body.operation_type as ActionType)) {
    return {
      ok: false,
      error: "`operation_type` must be db.migration | function.deploy | storage.config | auth.config",
    };
  }

  if (typeof body.statement !== "string" || !body.statement.trim()) {
    return { ok: false, error: "`statement` is required" };
  }

  if (body.statement.length > 100_000) {
    return { ok: false, error: "`statement` is too large" };
  }

  const parsedContext = parseContext(body.context);
  if (parsedContext.error) return { ok: false, error: parsedContext.error };

  return {
    ok: true,
    op: {
      operation_type: body.operation_type as ActionType,
      statement: body.statement.trim(),
      context: parsedContext.context,
      agent: optionalString(body, "agent", 200),
      session_id: optionalString(body, "session_id", 200),
      target: optionalString(body, "target", 500),
      diff: optionalString(body, "diff", 50_000),
    },
  };
}
