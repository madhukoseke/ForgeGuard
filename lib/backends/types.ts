// Backend-agnostic data layer. ForgeGuard's guard pipeline talks to a
// DataBackend so the same audit/classification flow works against any
// Postgres, an InsForge project, or an in-memory simulation (zero-credential
// demo mode).

export type BackendKind = "memory" | "postgres" | "insforge";

export interface SqlResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
}

export interface TableInfo {
  schema: string;
  name: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  default: string | null;
}

export interface DataBackend {
  readonly kind: BackendKind;
  /** Execute arbitrary SQL. Callers are responsible for guarding it first. */
  executeSql(sql: string, params?: unknown[]): Promise<SqlResult>;
  /** List user tables (excludes system schemas). */
  listTables(): Promise<TableInfo[]>;
  /** Describe the columns of one table. */
  describeTable(table: string): Promise<ColumnInfo[]>;
  /** Cheap connectivity check. */
  health(): Promise<boolean>;
}

/** First SQL keyword, uppercased — used as the result `command`. */
export function sqlCommand(sql: string): string {
  return sql.trim().split(/[\s(;]+/, 1)[0]?.toUpperCase() || "SQL";
}
