// AST-backed Postgres SQL analysis (pgsql-ast-parser).
// Used by prefilter + policy for table/statement detection. When parse fails,
// callers keep the existing regex path as fallback.

import { astVisitor, parse, type Statement } from "pgsql-ast-parser";

export type SqlParseSource = "ast" | "none";

export interface SqlAstAnalysis {
  source: SqlParseSource;
  /** True when at least one statement parsed successfully. */
  parsed: boolean;
  statements: Statement[];
  /** Lowercased table names (no schema). */
  tables: string[];
  /** First statement class for policy allowlists: select|insert|update|… */
  statementClass: string | null;
  dropTable: boolean;
  truncate: boolean;
  unconditionalWrite: boolean;
  dropColumn: boolean;
  alterColumnType: boolean;
  addNotNullNoDefault: boolean;
  createIndexNonConcurrent: boolean;
}

const EMPTY: SqlAstAnalysis = {
  source: "none",
  parsed: false,
  statements: [],
  tables: [],
  statementClass: null,
  dropTable: false,
  truncate: false,
  unconditionalWrite: false,
  dropColumn: false,
  alterColumnType: false,
  addNotNullNoDefault: false,
  createIndexNonConcurrent: false,
};

function statementClassOf(stmt: Statement): string {
  if (stmt.type === "with" || stmt.type === "with recursive") {
    return statementClassOf(stmt.in);
  }
  const t = stmt.type;
  if (t === "truncate table") return "truncate";
  if (t.startsWith("drop ")) return "drop";
  if (t.startsWith("create ")) return "create";
  if (t.startsWith("alter ")) return "alter";
  if (t === "union" || t === "union all") return "select";
  return t.split(/\s+/)[0]?.toLowerCase() || "unknown";
}

function collectTables(statements: Statement[]): string[] {
  const tables = new Set<string>();
  const visitor = astVisitor((map) => ({
    tableRef: (t) => {
      if (t.name) tables.add(String(t.name).toLowerCase());
      map.super().tableRef(t);
    },
  }));
  for (const stmt of statements) {
    try {
      visitor.statement(stmt);
    } catch {
      // Visitor must never break the chokepoint.
    }
  }
  // Statement roots that carry tables outside tableRef visits.
  for (const stmt of statements) {
    walkTables(stmt, tables);
  }
  return [...tables];
}

function walkTables(stmt: Statement, tables: Set<string>): void {
  const add = (name: unknown) => {
    if (typeof name === "string" && name) tables.add(name.toLowerCase());
    else if (name && typeof name === "object" && "name" in name) {
      const n = (name as { name?: string }).name;
      if (typeof n === "string" && n) tables.add(n.toLowerCase());
    }
  };
  switch (stmt.type) {
    case "drop table":
      for (const n of stmt.names ?? []) add(n);
      break;
    case "truncate table":
      for (const t of stmt.tables ?? []) add(t);
      break;
    case "delete":
      add(stmt.from);
      break;
    case "update":
      add(stmt.table);
      break;
    case "insert":
      add(stmt.into);
      break;
    case "alter table":
      add(stmt.table);
      break;
    case "create index":
      add(stmt.table);
      break;
    case "with":
      walkTables(stmt.in, tables);
      break;
    default:
      break;
  }
}

function unwrap(stmt: Statement): Statement {
  return stmt.type === "with" || stmt.type === "with recursive"
    ? unwrap(stmt.in)
    : stmt;
}

function analyzeStatements(statements: Statement[]): Omit<
  SqlAstAnalysis,
  "source" | "parsed" | "statements"
> {
  let dropTable = false;
  let truncate = false;
  let unconditionalWrite = false;
  let dropColumn = false;
  let alterColumnType = false;
  let addNotNullNoDefault = false;
  let createIndexNonConcurrent = false;

  for (const raw of statements) {
    const stmt = unwrap(raw);
    if (stmt.type === "drop table") dropTable = true;
    if (stmt.type === "truncate table") truncate = true;
    if (stmt.type === "delete" && !stmt.where) unconditionalWrite = true;
    if (stmt.type === "update" && !stmt.where) unconditionalWrite = true;
    if (stmt.type === "create index" && !stmt.concurrently) {
      createIndexNonConcurrent = true;
    }
    if (stmt.type === "alter table") {
      for (const change of stmt.changes ?? []) {
        if (change.type === "drop column") dropColumn = true;
        if (
          change.type === "alter column" &&
          change.alter &&
          typeof change.alter === "object" &&
          "type" in change.alter &&
          change.alter.type === "set type"
        ) {
          alterColumnType = true;
        }
        if (change.type === "add column") {
          const constraints = change.column?.constraints ?? [];
          const hasNotNull = constraints.some(
            (c) => c && typeof c === "object" && c.type === "not null",
          );
          const hasDefault = constraints.some(
            (c) => c && typeof c === "object" && c.type === "default",
          );
          if (hasNotNull && !hasDefault) addNotNullNoDefault = true;
        }
      }
    }
  }

  return {
    tables: collectTables(statements),
    statementClass: statements[0] ? statementClassOf(statements[0]) : null,
    dropTable,
    truncate,
    unconditionalWrite,
    dropColumn,
    alterColumnType,
    addNotNullNoDefault,
    createIndexNonConcurrent,
  };
}

/** Parse SQL with pgsql-ast-parser; returns empty analysis when parse fails. */
export function analyzeSql(sql: string): SqlAstAnalysis {
  const trimmed = sql?.trim();
  if (!trimmed) return { ...EMPTY };

  try {
    const statements = parse(trimmed);
    if (!statements.length) return { ...EMPTY };
    return {
      source: "ast",
      parsed: true,
      statements,
      ...analyzeStatements(statements),
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Prefer AST tables; empty when unparsed (caller may use regex). */
export function astReferencedTables(sql: string): string[] | null {
  const analysis = analyzeSql(sql);
  return analysis.parsed ? analysis.tables : null;
}

/** Prefer AST statement class; null when unparsed. */
export function astStatementClass(sql: string): string | null {
  return analyzeSql(sql).statementClass;
}
