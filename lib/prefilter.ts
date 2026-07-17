// Layer 1 — deterministic pre-filter (see docs/ARCHITECTURE.md).
// Instant, free, reliable. Runs BEFORE the LLM. The LLM (Layer 2) only adds
// nuance + the safer alternative. These rules must be correct for the demo
// inputs and the obvious production killers; they intentionally stay simple.
//
// SQL destructive patterns prefer AST analysis (pgsql-ast-parser); regex remains
// as fallback when parse fails, and for non-SQL ops (storage/auth config).

import { loadPolicy } from "./policy";
import { analyzeSql } from "./sql-ast";
import {
  Category,
  OpContext,
  ProposedOp,
  Severity,
  computeRequiresApproval,
} from "./types";

export interface PrefilterHit {
  severity: Severity;
  category: Category;
  rule: string;
  rationale: string;
}

export interface PrefilterResult {
  severity: Severity;
  category: Category;
  requires_approval: boolean;
  matched: PrefilterHit[];
  // Highest-priority hit, or null when nothing matched (treated as safe/benign).
  top: PrefilterHit | null;
  /** How SQL structural rules were evaluated. */
  sql_source: "ast" | "regex" | "n/a";
}

interface Rule {
  name: string;
  test: (sql: string, ctx: RuleContext) => boolean;
  severity: Severity;
  category: Category;
  rationale: string;
}

interface RuleContext {
  opCtx?: OpContext;
  ast: ReturnType<typeof analyzeSql>;
}

const has = (sql: string, re: RegExp) => re.test(sql);

// Detects DELETE/UPDATE statements that lack a WHERE clause (unconditional).
function unconditionalWriteRegex(sql: string): boolean {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  return statements.some((stmt) => {
    const isMutation = /^\s*(delete\s+from|update)\b/i.test(stmt);
    if (!isMutation) return false;
    return !/\bwhere\b/i.test(stmt);
  });
}

// Ordered from most to least severe. First/highest match wins.
const RULES: Rule[] = [
  {
    name: "DROP TABLE",
    test: (s, ctx) =>
      ctx.ast.parsed ? ctx.ast.dropTable : has(s, /\bdrop\s+table\b/i),
    severity: "critical",
    category: "destructive",
    rationale: "Dropping a table permanently destroys the table and all its rows.",
  },
  {
    name: "TRUNCATE",
    test: (s, ctx) =>
      ctx.ast.parsed ? ctx.ast.truncate : has(s, /\btruncate\b/i),
    severity: "critical",
    category: "data_loss",
    rationale: "TRUNCATE irreversibly removes every row in the target table.",
  },
  {
    name: "DELETE/UPDATE without WHERE",
    test: (s, ctx) =>
      ctx.ast.parsed
        ? ctx.ast.unconditionalWrite
        : unconditionalWriteRegex(s),
    severity: "critical",
    category: "data_loss",
    rationale:
      "An unconditional DELETE/UPDATE affects every row in the table.",
  },
  {
    name: "DROP COLUMN",
    test: (s, ctx) =>
      ctx.ast.parsed ? ctx.ast.dropColumn : has(s, /\bdrop\s+column\b/i),
    severity: "high",
    category: "data_loss",
    rationale:
      "Dropping a column permanently deletes the data stored in it.",
  },
  {
    name: "ALTER COLUMN TYPE (narrowing)",
    test: (s, ctx) =>
      ctx.ast.parsed
        ? ctx.ast.alterColumnType
        : has(s, /\balter\s+column\b[\s\S]*\btype\b/i),
    severity: "high",
    category: "data_loss",
    rationale:
      "Changing a column type can truncate or fail to cast existing data.",
  },
  {
    name: "DISABLE RLS / DROP POLICY",
    // Parser does not cover these Postgres constructs yet — regex only.
    test: (s) =>
      has(s, /\bdisable\s+row\s+level\s+security\b/i) ||
      has(s, /\bdrop\s+policy\b/i),
    severity: "high",
    category: "security",
    rationale:
      "Disabling RLS or dropping a policy exposes rows that were previously protected.",
  },
  {
    name: "Bucket made public",
    test: (s) =>
      has(s, /\bpublic[-_\s]?read\b/i) ||
      has(s, /\bbucket\b[\s\S]*\bpublic\b/i) ||
      has(s, /"?public"?\s*[:=]\s*true/i),
    severity: "high",
    category: "security",
    rationale: "Making a bucket public exposes its objects to the internet.",
  },
  {
    name: "Remove auth provider / rotate JWT secret",
    test: (s) =>
      has(s, /\brotate\b[\s\S]*\bjwt\b/i) ||
      has(s, /\bjwt[_\s]?secret\b/i) ||
      has(s, /\bremove\b[\s\S]*\bauth\s+provider\b/i),
    severity: "high",
    category: "security",
    rationale:
      "Rotating the JWT secret or removing an auth provider can lock out every signed-in user.",
  },
  {
    name: "ADD COLUMN NOT NULL (no default)",
    test: (s, ctx) =>
      ctx.ast.parsed
        ? ctx.ast.addNotNullNoDefault
        : has(s, /\badd\s+column\b[\s\S]*\bnot\s+null\b/i) &&
          !has(s, /\bdefault\b/i),
    severity: "medium",
    category: "migration_risk",
    rationale:
      "Adding a NOT NULL column without a default fails on a populated table.",
  },
  {
    name: "CREATE INDEX (non-CONCURRENTLY)",
    test: (s, ctx) =>
      ctx.ast.parsed
        ? ctx.ast.createIndexNonConcurrent
        : has(s, /\bcreate\s+(unique\s+)?index\b/i) &&
          !has(s, /\bconcurrently\b/i),
    severity: "low",
    category: "migration_risk",
    rationale:
      "A non-concurrent index build takes a write lock; risky on large tables.",
  },
];

export function prefilter(op: ProposedOp): PrefilterResult {
  const sql = op.statement ?? "";
  const ast = analyzeSql(sql);
  const matched: PrefilterHit[] = [];
  const ctx: RuleContext = { opCtx: op.context, ast };

  for (const rule of RULES) {
    try {
      if (rule.test(sql, ctx)) {
        matched.push({
          severity: rule.severity,
          category: rule.category,
          rule: rule.name,
          rationale: rule.rationale,
        });
      }
    } catch {
      // A misbehaving rule must never break the chokepoint.
    }
  }

  const top = matched[0] ?? null;
  const severity: Severity = top?.severity ?? "safe";
  const category: Category = top?.category ?? "benign";
  const threshold = loadPolicy().approval_threshold;

  return {
    severity,
    category,
    requires_approval: computeRequiresApproval(severity, threshold),
    matched,
    top,
    sql_source: !sql.trim()
      ? "n/a"
      : ast.parsed
        ? "ast"
        : "regex",
  };
}
