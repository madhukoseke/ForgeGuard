/**
 * Canonical ForgeGuard Postgres schema — loaded from sql/schema.sql.
 * Used by bootstrap-insforge and schema-drift tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SCHEMA_PATH = join(process.cwd(), "sql", "schema.sql");

export const MIGRATION_NAMES = {
  agentActions: "forgeguard-agent-actions",
  agentActionsUpgrade: "forgeguard-agent-actions-upgrade",
  usersDemo: "forgeguard-users-demo",
  /** Legacy name kept so drift tests can detect stale bootstrap paths. */
  legacyEnrichment: "forgeguard-agent-actions-enrichment",
} as const;

/** Strip SQL line comments (-- ...) for parsing; keep statement text. */
export function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

export function loadSchemaSql(path = SCHEMA_PATH): string {
  return readFileSync(path, "utf8");
}

/** Extract action_type values from CHECK constraints in SQL text. */
export function parseActionTypes(sql: string): string[] {
  const normalized = stripSqlComments(sql);
  const matches = [
    ...normalized.matchAll(
      /action_type\s+in\s*\(([^)]+)\)/gi,
    ),
  ];
  if (matches.length === 0) return [];
  const last = matches[matches.length - 1]![1]!;
  return last
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, ""))
    .filter(Boolean)
    .sort();
}

/** Column names declared on agent_actions (from create table block). */
export function parseAgentActionColumns(sql: string): string[] {
  const normalized = stripSqlComments(sql);
  const createMatch = normalized.match(
    /create\s+table\s+if\s+not\s+exists\s+agent_actions\s*\(([\s\S]*?)\);/i,
  );
  if (!createMatch) return [];
  const body = createMatch[1]!;
  const cols: string[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("check ") || trimmed.startsWith("constraint "))
      continue;
    const col = trimmed.match(/^(\w+)\s+/);
    if (col) cols.push(col[1]!);
  }
  return cols.sort();
}

/** Split canonical schema.sql into InsForge migration SQL blocks. */
export function splitSchemaMigrations(schemaSql: string): {
  agentActions: string;
  agentActionsUpgrade: string;
  usersDemo: string;
} {
  const lines = schemaSql.split("\n");
  const agentActionsLines: string[] = [];
  const upgradeLines: string[] = [];
  const usersLines: string[] = [];

  let section: "header" | "create" | "upgrade" | "users" = "header";
  for (const line of lines) {
    const trimmed = line.trim();
    if (section === "header" && /^create\s+table\s+if\s+not\s+exists\s+agent_actions/i.test(trimmed)) {
      section = "create";
    } else if (section === "create" && /^--\s*Upgrade path/i.test(trimmed)) {
      section = "upgrade";
      continue;
    } else if (section === "upgrade" && /^--\s*Demo seed/i.test(trimmed)) {
      section = "users";
      continue;
    }

    if (section === "create") agentActionsLines.push(line);
    else if (section === "upgrade") upgradeLines.push(line);
    else if (section === "users") usersLines.push(line);
  }

  return {
    agentActions: agentActionsLines.join("\n").trim(),
    agentActionsUpgrade: upgradeLines.join("\n").trim(),
    usersDemo: usersLines.join("\n").trim(),
  };
}

export function getBootstrapMigrations(path = SCHEMA_PATH) {
  const schema = loadSchemaSql(path);
  const parts = splitSchemaMigrations(schema);
  return {
    [MIGRATION_NAMES.agentActions]: parts.agentActions,
    [MIGRATION_NAMES.agentActionsUpgrade]: parts.agentActionsUpgrade,
    [MIGRATION_NAMES.usersDemo]: parts.usersDemo,
  };
}
