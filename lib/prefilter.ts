// Layer 1 — deterministic pre-filter (see docs/ARCHITECTURE.md).
// Instant, free, reliable. Runs BEFORE the LLM. The LLM (Layer 2) only adds
// nuance + the safer alternative. These rules must be correct for the demo
// inputs and the obvious production killers; they intentionally stay simple.

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
}

interface Rule {
  name: string;
  test: (sql: string, ctx?: OpContext) => boolean;
  severity: Severity;
  category: Category;
  rationale: string;
}

const has = (sql: string, re: RegExp) => re.test(sql);

// Detects DELETE/UPDATE statements that lack a WHERE clause (unconditional).
function unconditionalWrite(sql: string): boolean {
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
    test: (s) => has(s, /\bdrop\s+table\b/i),
    severity: "critical",
    category: "destructive",
    rationale: "Dropping a table permanently destroys the table and all its rows.",
  },
  {
    name: "TRUNCATE",
    test: (s) => has(s, /\btruncate\b/i),
    severity: "critical",
    category: "data_loss",
    rationale: "TRUNCATE irreversibly removes every row in the target table.",
  },
  {
    name: "DELETE/UPDATE without WHERE",
    test: (s) => unconditionalWrite(s),
    severity: "critical",
    category: "data_loss",
    rationale:
      "An unconditional DELETE/UPDATE affects every row in the table.",
  },
  {
    name: "DROP COLUMN",
    test: (s) => has(s, /\bdrop\s+column\b/i),
    severity: "high",
    category: "data_loss",
    rationale:
      "Dropping a column permanently deletes the data stored in it.",
  },
  {
    name: "ALTER COLUMN TYPE (narrowing)",
    test: (s) => has(s, /\balter\s+column\b[\s\S]*\btype\b/i),
    severity: "high",
    category: "data_loss",
    rationale:
      "Changing a column type can truncate or fail to cast existing data.",
  },
  {
    name: "DISABLE RLS / DROP POLICY",
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
    test: (s) =>
      has(s, /\badd\s+column\b[\s\S]*\bnot\s+null\b/i) &&
      !has(s, /\bdefault\b/i),
    severity: "medium",
    category: "migration_risk",
    rationale:
      "Adding a NOT NULL column without a default fails on a populated table.",
  },
  {
    name: "CREATE INDEX (non-CONCURRENTLY)",
    test: (s) =>
      has(s, /\bcreate\s+(unique\s+)?index\b/i) &&
      !has(s, /\bconcurrently\b/i),
    severity: "low",
    category: "migration_risk",
    rationale:
      "A non-concurrent index build takes a write lock; risky on large tables.",
  },
];

export function prefilter(op: ProposedOp): PrefilterResult {
  const sql = op.statement ?? "";
  const matched: PrefilterHit[] = [];

  for (const rule of RULES) {
    try {
      if (rule.test(sql, op.context)) {
        matched.push({
          severity: rule.severity,
          category: rule.category,
          rule: rule.name,
          rationale: rule.rationale,
        });
      }
    } catch {
      // A misbehaving regex must never break the chokepoint.
    }
  }

  const top = matched[0] ?? null;
  const severity: Severity = top?.severity ?? "safe";
  const category: Category = top?.category ?? "benign";

  return {
    severity,
    category,
    requires_approval: computeRequiresApproval(severity),
    matched,
    top,
  };
}
