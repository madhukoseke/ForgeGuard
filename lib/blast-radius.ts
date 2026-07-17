// Optional blast-radius probe for execute (Phase E).
// When enabled, estimates rows via count(*) on the target table before holding
// or applying a mutation. Fail-open: probe errors never block the guard path.

import type { DataBackend } from "./backends";
import { analyzeSql } from "./sql-ast";

export interface BlastRadiusProbeResult {
  estimate: string | null;
  probed: boolean;
}

function isSafeIdent(name: string): boolean {
  return /^[a-z_][a-z0-9_$]*$/i.test(name);
}

/**
 * Best-effort row estimate for DELETE/UPDATE/TRUNCATE targets.
 * Only runs when `enabled` and the AST yields a single safe table name.
 */
export async function probeBlastRadius(
  sql: string,
  backend: DataBackend,
  enabled: boolean,
): Promise<BlastRadiusProbeResult> {
  if (!enabled) return { estimate: null, probed: false };

  const analysis = analyzeSql(sql);
  if (!analysis.parsed) return { estimate: null, probed: false };

  const interesting =
    analysis.unconditionalWrite ||
    analysis.truncate ||
    analysis.dropTable ||
    analysis.statementClass === "delete" ||
    analysis.statementClass === "update" ||
    analysis.statementClass === "truncate";
  if (!interesting) return { estimate: null, probed: false };

  const table = analysis.tables[0];
  if (!table || !isSafeIdent(table) || analysis.tables.length !== 1) {
    return { estimate: null, probed: false };
  }

  try {
    const result = await backend.executeSql(
      `SELECT count(*)::bigint AS forgeguard_n FROM "${table}"`,
    );
    const raw = result.rows[0]?.forgeguard_n;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && /^\d+$/.test(raw)
          ? Number(raw)
          : null;
    if (n == null || !Number.isFinite(n)) {
      return { estimate: null, probed: true };
    }
    return {
      estimate: `${n} rows in ${table}`,
      probed: true,
    };
  } catch {
    return { estimate: null, probed: true };
  }
}
