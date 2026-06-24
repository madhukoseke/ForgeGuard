// Any-Postgres backend (node-postgres). Configure with DATABASE_URL.

import { Pool } from "pg";
import { postgresConnectionUrl } from "../postgres-env";
import {
  ColumnInfo,
  DataBackend,
  SqlResult,
  TableInfo,
  sqlCommand,
} from "./types";

const LIST_TABLES_SQL = `
  select table_schema as schema, table_name as name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema not in ('pg_catalog', 'information_schema')
  order by table_schema, table_name
`;

const DESCRIBE_TABLE_SQL = `
  select column_name as name,
         data_type,
         is_nullable,
         column_default
  from information_schema.columns
  where table_name = $1
    and table_schema not in ('pg_catalog', 'information_schema')
  order by ordinal_position
`;

export class PostgresBackend implements DataBackend {
  readonly kind = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.FORGEGUARD_PG_POOL_MAX || 5),
      connectionTimeoutMillis: 8_000,
      statement_timeout: Number(
        process.env.FORGEGUARD_PG_STATEMENT_TIMEOUT_MS || 30_000,
      ),
    });
  }

  static fromEnv(): PostgresBackend | null {
    const url = postgresConnectionUrl();
    return url ? new PostgresBackend(url) : null;
  }

  async executeSql(sql: string, params: unknown[] = []): Promise<SqlResult> {
    const result = await this.pool.query(sql, params as never[]);
    return {
      rows: (result.rows ?? []) as Record<string, unknown>[],
      rowCount: result.rowCount ?? result.rows?.length ?? 0,
      command: result.command || sqlCommand(sql),
    };
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.pool.query(LIST_TABLES_SQL);
    return result.rows as TableInfo[];
  }

  async describeTable(table: string): Promise<ColumnInfo[]> {
    const result = await this.pool.query(DESCRIBE_TABLE_SQL, [table]);
    return (result.rows as Record<string, unknown>[]).map((r) => ({
      name: String(r.name),
      data_type: String(r.data_type),
      is_nullable: r.is_nullable === "YES",
      default: r.column_default == null ? null : String(r.column_default),
    }));
  }

  async health(): Promise<boolean> {
    try {
      await this.pool.query("select 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
