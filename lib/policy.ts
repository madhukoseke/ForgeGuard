// Read-side data safeguards, loaded from forgeguard.config.json (or the file
// named by FORGEGUARD_CONFIG). Enforced on the MCP query/execute path BEFORE
// the backend is touched; violations are written to the audit trail.

import { readFileSync } from "fs";
import { resolve } from "path";

export interface ForgeGuardPolicy {
  /** Tables agents may never read or write (case-insensitive). */
  denied_tables: string[];
  /** Columns whose values are masked in query results: "table.column" or "column". */
  masked_columns: string[];
  /** Hard cap on rows returned per query. */
  max_rows: number;
  /** Statement classes allowed through the `execute` tool. */
  allowed_statements: string[];
}

export const DEFAULT_POLICY: ForgeGuardPolicy = {
  denied_tables: [],
  masked_columns: [],
  max_rows: 200,
  allowed_statements: [
    "select",
    "insert",
    "update",
    "delete",
    "create",
    "alter",
    "drop",
    "truncate",
    "grant",
    "revoke",
    "comment",
    "with",
  ],
};

export const MASKED_PLACEHOLDER = "[FORGEGUARD:MASKED]";

function sanitize(raw: unknown): ForgeGuardPolicy {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const strings = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((s): s is string => typeof s === "string").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
  return {
    denied_tables: strings(obj.denied_tables),
    masked_columns: strings(obj.masked_columns),
    max_rows:
      typeof obj.max_rows === "number" && obj.max_rows > 0
        ? Math.floor(obj.max_rows)
        : DEFAULT_POLICY.max_rows,
    allowed_statements:
      strings(obj.allowed_statements).length > 0
        ? strings(obj.allowed_statements)
        : DEFAULT_POLICY.allowed_statements,
  };
}

let cached: ForgeGuardPolicy | null = null;

export function loadPolicy(): ForgeGuardPolicy {
  if (cached) return cached;
  const path = resolve(
    process.cwd(),
    process.env.FORGEGUARD_CONFIG || "forgeguard.config.json",
  );
  try {
    cached = sanitize(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    cached = { ...DEFAULT_POLICY };
  }
  return cached;
}

/** Test hook: override or clear ({@code null}) the cached policy. */
export function setPolicyForTests(policy: ForgeGuardPolicy | null): void {
  cached = policy;
}

// ─── Enforcement helpers ──────────────────────────────────────────────────────

/** Best-effort extraction of table names referenced by a statement. */
export function referencedTables(sql: string): string[] {
  const tables = new Set<string>();
  const re =
    /\b(?:from|join|into|update|table(?:\s+if\s+(?:not\s+)?exists)?|truncate)\s+(?:only\s+)?"?([a-zA-Z_][\w$]*)"?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql))) {
    const name = match[1].toLowerCase();
    if (!["select", "values", "lateral", "unnest"].includes(name)) {
      tables.add(name);
    }
  }
  return [...tables];
}

export interface PolicyViolation {
  rule: "denied_table" | "statement_not_allowed";
  detail: string;
}

export function checkPolicy(
  sql: string,
  policy: ForgeGuardPolicy = loadPolicy(),
): PolicyViolation | null {
  const firstWord = sql.trim().split(/[\s(;]+/, 1)[0]?.toLowerCase() ?? "";
  if (firstWord && !policy.allowed_statements.includes(firstWord)) {
    return {
      rule: "statement_not_allowed",
      detail: `Statement class "${firstWord.toUpperCase()}" is not allowed by policy.`,
    };
  }
  for (const table of referencedTables(sql)) {
    if (policy.denied_tables.includes(table)) {
      return {
        rule: "denied_table",
        detail: `Table "${table}" is denied by policy.`,
      };
    }
  }
  return null;
}

/** Apply masked_columns to result rows. Returns a copy when masking occurs. */
export function maskRows(
  rows: Record<string, unknown>[],
  tables: string[],
  policy: ForgeGuardPolicy = loadPolicy(),
): { rows: Record<string, unknown>[]; masked_cells: number } {
  if (policy.masked_columns.length === 0) return { rows, masked_cells: 0 };

  const bareColumns = new Set<string>();
  const qualified = new Set<string>();
  for (const entry of policy.masked_columns) {
    if (entry.includes(".")) qualified.add(entry);
    else bareColumns.add(entry);
  }
  const tableSet = tables.map((t) => t.toLowerCase());
  const columnMasked = (column: string): boolean => {
    const c = column.toLowerCase();
    if (bareColumns.has(c)) return true;
    return tableSet.some((t) => qualified.has(`${t}.${c}`));
  };

  let masked = 0;
  const out = rows.map((row) => {
    let copy: Record<string, unknown> | null = null;
    for (const key of Object.keys(row)) {
      if (row[key] != null && columnMasked(key)) {
        if (!copy) copy = { ...row };
        copy[key] = MASKED_PLACEHOLDER;
        masked += 1;
      }
    }
    return copy ?? row;
  });
  return { rows: out, masked_cells: masked };
}
