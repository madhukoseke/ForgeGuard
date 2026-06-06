// Best-effort compensating SQL for demo migrations (Option A rollback).

const DROP_COLUMN = /^\s*alter\s+table\s+(\w+)\s+drop\s+column\s+(\w+)\s*;?\s*$/i;
const ADD_COLUMN =
  /^\s*alter\s+table\s+(\w+)\s+add\s+column\s+(\w+)\s+([\w\s().,'"-]+)\s*;?\s*$/i;
const CREATE_TABLE =
  /^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)\s/i;

/** Known demo column types when we cannot introspect. */
const DEMO_COLUMN_TYPES: Record<string, string> = {
  last_login: "timestamptz",
  deleted_at: "timestamptz",
  archived_at: "timestamptz",
  nickname: "text",
};

export function inverseSql(statement: string): string | null {
  const sql = statement.trim();

  const drop = sql.match(DROP_COLUMN);
  if (drop) {
    const [, table, column] = drop;
    const type = DEMO_COLUMN_TYPES[column.toLowerCase()] ?? "text";
    return `ALTER TABLE ${table} ADD COLUMN ${column} ${type};`;
  }

  const add = sql.match(ADD_COLUMN);
  if (add) {
    const [, table, column] = add;
    return `ALTER TABLE ${table} DROP COLUMN ${column};`;
  }

  const create = sql.match(CREATE_TABLE);
  if (create) {
    const [, table] = create;
    return `DROP TABLE IF EXISTS ${table};`;
  }

  return null;
}

export function migrationNameFromStatement(statement: string): string {
  const compact = statement.replace(/\s+/g, " ").trim().slice(0, 48);
  const slug = compact
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "forgeguard-migration";
}

export function migrationVersion(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}
