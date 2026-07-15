// Operator identity for attributable approvals.
//
// Sources (merged):
//   1. FORGEGUARD_OPERATORS — JSON array of { id, token, name? }
//   2. FORGEGUARD_OPERATOR_TOKEN (+ optional FORGEGUARD_OPERATOR_ID / _NAME)
//
// Tokens are compared with timing-safe equality in lib/api-auth.ts.

export interface Operator {
  /** Stable id written to agent_actions.reviewed_by */
  id: string;
  /** Human-readable label (UI / logs) */
  displayName: string;
  token: string;
}

const LOCAL_DEV: Operator = {
  id: "local-dev",
  displayName: "local-dev",
  token: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOperatorsJson(raw: string): Operator[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[ForgeGuard] FORGEGUARD_OPERATORS is not valid JSON — ignoring.");
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.warn("[ForgeGuard] FORGEGUARD_OPERATORS must be a JSON array — ignoring.");
    return [];
  }

  const out: Operator[] = [];
  for (const item of parsed) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const token = typeof item.token === "string" ? item.token.trim() : "";
    if (!id || !token) continue;
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : typeof item.display_name === "string" && item.display_name.trim()
          ? item.display_name.trim()
          : id;
    out.push({ id, displayName: name, token });
  }
  return out;
}

/** Operators configured via env (may be empty in local demo). */
export function loadOperators(): Operator[] {
  const byToken = new Map<string, Operator>();

  const json = process.env.FORGEGUARD_OPERATORS?.trim();
  if (json) {
    for (const op of parseOperatorsJson(json)) {
      byToken.set(op.token, op);
    }
  }

  const single = process.env.FORGEGUARD_OPERATOR_TOKEN?.trim();
  if (single && !byToken.has(single)) {
    const id = process.env.FORGEGUARD_OPERATOR_ID?.trim() || "operator";
    const displayName =
      process.env.FORGEGUARD_OPERATOR_NAME?.trim() || id;
    byToken.set(single, { id, displayName, token: single });
  }

  return [...byToken.values()];
}

/** Identity used when no operator tokens are configured (non-production only). */
export function localDevOperator(): Operator {
  return LOCAL_DEV;
}
