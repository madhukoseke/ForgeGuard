// Executable safer SQL for approve flows. Layer 2 often returns prose guidance;
// this maps Layer 1 rules to concrete statements the executor can apply.

import { prefilter } from "./prefilter";
import type { AgentAction, ProposedOp } from "./types";

const SQL_PREFIX =
  /^\s*(alter|create|drop|insert|update|delete|grant|revoke|comment)\b/i;

export function isExecutableSql(statement: string): boolean {
  return SQL_PREFIX.test(statement.trim());
}

function tableName(op: ProposedOp): string {
  return op.context?.table ?? op.target ?? "table";
}

/** Concrete SQL for a matched Layer 1 rule (demo + common production patterns). */
export function saferSqlForRule(
  rule: string | undefined,
  op: ProposedOp,
): string | null {
  const table = tableName(op);
  switch (rule) {
    case "DROP COLUMN":
      return `ALTER TABLE ${table} ADD COLUMN deleted_at timestamptz;`;
    case "DROP TABLE":
      return `ALTER TABLE ${table} RENAME TO ${table}_archived;`;
    case "TRUNCATE":
    case "DELETE/UPDATE without WHERE":
      return `UPDATE ${table} SET deleted_at = now() WHERE deleted_at IS NULL;`;
    case "DISABLE RLS / DROP POLICY":
      return `CREATE POLICY scoped_read ON ${table} FOR SELECT USING (auth.uid() IS NOT NULL);`;
    default:
      return null;
  }
}

/** Statement to apply when operator approves the safer alternative. */
export function resolveSaferStatement(action: AgentAction): string | null {
  const alt = action.safer_alternative?.trim();
  if (alt && isExecutableSql(alt)) return alt;

  const op: ProposedOp = {
    operation_type: action.action_type,
    statement: action.statement,
    context: action.target ? { table: action.target } : undefined,
    target: action.target ?? undefined,
  };
  const hit = prefilter(op).top?.rule;
  return saferSqlForRule(hit, op);
}
