// Layer 2 — the risk-classifier (see docs/ARCHITECTURE.md). This is the core IP.
// Calls the InsForge Model Gateway (OpenAI-compatible) requesting JSON mode.
// If no gateway is configured OR the call fails, it gracefully degrades to a
// deterministic heuristic built on Layer 1 — so the demo NEVER hard-fails.

import { loadPolicy } from "./policy";
import { prefilter } from "./prefilter";
import {
  Category,
  ProposedOp,
  Severity,
  Verdict,
  computeRequiresApproval,
} from "./types";

export const RISK_PROMPT = `You are ForgeGuard's backend-change risk classifier. You receive ONE proposed
backend operation that an AI coding agent wants to apply to a PRODUCTION
InsForge backend, plus context about current state. Classify its risk and
return STRICT JSON only — no prose, no markdown.

INPUT
- operation_type: db.migration | function.deploy | storage.config | auth.config
- statement: the raw SQL, config diff, or deploy descriptor
- context: { table?, row_count?, columns?, has_rls?, is_public?, environment } (may be partial)

JUDGE BY: irreversible DATA LOSS, SECURITY exposure, LOCKOUT, and MIGRATION-FAILURE risk.

RULES
- Destroying/truncating data on a populated table is at least "high".
- DROP TABLE, TRUNCATE, or unconditional DELETE/UPDATE is "critical".
- Disabling RLS/policies, making a bucket public, or rotating auth secrets is at least "high" (security).
- ADD COLUMN NOT NULL without default on a populated table, or non-concurrent
  index builds on large tables, are "medium".
- Additive, reversible changes (create table, add nullable column, add concurrent index) are "safe".
- requires_approval = true for medium and above.
- Always propose a concrete safer_alternative when one exists
  (soft-delete column instead of DROP; backfill then NOT NULL in two steps;
  CREATE INDEX CONCURRENTLY; scoped WHERE clause), else null.

RETURN EXACTLY:
{
  "severity": "safe|low|medium|high|critical",
  "category": "destructive|data_loss|security|cost|migration_risk|benign",
  "requires_approval": true|false,
  "rationale": "one or two sentences, specific to THIS statement",
  "safer_alternative": "concrete suggestion or null",
  "blast_radius": "rows/objects affected if known, else 'unknown'"
}`;

const VALID_SEVERITY: Severity[] = [
  "safe",
  "low",
  "medium",
  "high",
  "critical",
];
const VALID_CATEGORY: Category[] = [
  "destructive",
  "data_loss",
  "security",
  "cost",
  "migration_risk",
  "benign",
];

function coerceVerdict(raw: any): Verdict | null {
  if (!raw || typeof raw !== "object") return null;
  const severity: Severity = VALID_SEVERITY.includes(raw.severity)
    ? raw.severity
    : "medium";
  const category: Category = VALID_CATEGORY.includes(raw.category)
    ? raw.category
    : "migration_risk";
  const threshold = loadPolicy().approval_threshold;
  return {
    severity,
    category,
    requires_approval:
      typeof raw.requires_approval === "boolean"
        ? raw.requires_approval
        : computeRequiresApproval(severity, threshold),
    rationale:
      typeof raw.rationale === "string" && raw.rationale.trim()
        ? raw.rationale.trim()
        : "Classified by ForgeGuard.",
    safer_alternative:
      typeof raw.safer_alternative === "string" &&
      raw.safer_alternative.trim() &&
      raw.safer_alternative.trim().toLowerCase() !== "null"
        ? raw.safer_alternative.trim()
        : null,
    blast_radius:
      typeof raw.blast_radius === "string" && raw.blast_radius.trim()
        ? raw.blast_radius.trim()
        : "unknown",
  };
}

// Deterministic fallback: derive a verdict from Layer 1 + simple heuristics.
// Used when the Model Gateway is unconfigured or the call fails.
export function heuristicVerdict(op: ProposedOp): Verdict {
  const pf = prefilter(op);
  const rows = op.context?.row_count;
  const populated = typeof rows === "number" && rows > 0;

  const blast_radius =
    populated && op.context?.table
      ? `${rows} rows in ${op.context.table}`
      : populated
        ? `${rows} rows`
        : "unknown";

  return {
    severity: pf.severity,
    category: pf.category,
    requires_approval: pf.requires_approval,
    rationale: pf.top?.rationale ?? "No destructive pattern detected.",
    safer_alternative: saferAlternativeFor(pf.top?.rule, op),
    blast_radius,
  };
}

function saferAlternativeFor(
  rule: string | undefined,
  op: ProposedOp,
): string | null {
  switch (rule) {
    case "DROP COLUMN":
      return "Add a `deleted_at`/soft-delete column or rename to `_archived` instead of dropping; drop later once verified.";
    case "DROP TABLE":
      return "Rename the table to `<name>_archived` and drop it after a retention window.";
    case "TRUNCATE":
    case "DELETE/UPDATE without WHERE":
      return "Add a scoped WHERE clause, or soft-delete via a status flag, then purge in a controlled job.";
    case "ALTER COLUMN TYPE (narrowing)":
      return "Add a new column, backfill with a validated cast, then swap in two steps.";
    case "ADD COLUMN NOT NULL (no default)":
      return "Add the column nullable, backfill values, then set NOT NULL in a second migration.";
    case "CREATE INDEX (non-CONCURRENTLY)":
      return "Use CREATE INDEX CONCURRENTLY to avoid taking a write lock.";
    case "DISABLE RLS / DROP POLICY":
      return "Keep RLS enabled; add a scoped policy for the specific access you need.";
    case "Bucket made public":
      return "Keep the bucket private and serve via signed URLs scoped to the request.";
    case "Remove auth provider / rotate JWT secret":
      return "Stage the rotation with overlapping validity, or roll out provider changes behind a flag.";
    default:
      return null;
  }
}

async function callModelGateway(op: ProposedOp): Promise<Verdict | null> {
  // InsForge's AI gateway is OpenRouter (OpenAI-compatible). `insforge ai setup`
  // writes OPENROUTER_API_KEY; INSFORGE_KEY is kept as a fallback.
  const baseUrl =
    process.env.INSFORGE_MODEL_GATEWAY_URL || "https://openrouter.ai/api/v1";
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.INSFORGE_KEY;
  if (!baseUrl || !apiKey) return null;

  const model = process.env.FORGEGUARD_MODEL || "openai/gpt-4o-mini";
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: RISK_PROMPT },
          { role: "user", content: JSON.stringify(op) },
        ],
      }),
      // Keep the live demo snappy; fall back if the gateway is slow.
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return coerceVerdict(JSON.parse(content));
  } catch {
    return null;
  }
}

// Layer 2 entry point. Returns the verdict + how it was reached.
export async function classify(
  op: ProposedOp,
): Promise<{ verdict: Verdict; source: "deterministic" | "llm" }> {
  const llm = await callModelGateway(op);
  if (llm) return { verdict: llm, source: "llm" };
  return { verdict: heuristicVerdict(op), source: "deterministic" };
}
