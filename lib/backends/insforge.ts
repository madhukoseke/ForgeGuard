// InsForge backend adapter — wraps the existing admin REST client so the
// guard pipeline can treat InsForge like any other DataBackend.

import { InsForgeClient } from "../insforge-client";
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

const DESCRIBE_TABLE_SQL = (table: string) => `
  select column_name as name,
         data_type,
         is_nullable,
         column_default
  from information_schema.columns
  where table_name = '${table.replace(/'/g, "''")}'
    and table_schema not in ('pg_catalog', 'information_schema')
  order by ordinal_position
`;

export class InsForgeBackend implements DataBackend {
  readonly kind = "insforge" as const;
  private client: InsForgeClient;

  constructor(client: InsForgeClient) {
    this.client = client;
  }

  static fromEnv(): InsForgeBackend | null {
    const client = InsForgeClient.fromEnv();
    return client ? new InsForgeBackend(client) : null;
  }

  async executeSql(sql: string, params: unknown[] = []): Promise<SqlResult> {
    const result = await this.client.runRawSql(sql, params);
    return {
      rows: (result.rows ?? []) as Record<string, unknown>[],
      rowCount: result.rowCount ?? result.rows?.length ?? 0,
      command: result.command || sqlCommand(sql),
    };
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.client.runRawSql(LIST_TABLES_SQL);
    return (result.rows ?? []) as TableInfo[];
  }

  async describeTable(table: string): Promise<ColumnInfo[]> {
    const result = await this.client.runRawSql(DESCRIBE_TABLE_SQL(table));
    return ((result.rows ?? []) as Record<string, unknown>[]).map((r) => ({
      name: String(r.name),
      data_type: String(r.data_type),
      is_nullable: r.is_nullable === "YES",
      default: r.column_default == null ? null : String(r.column_default),
    }));
  }

  async health(): Promise<boolean> {
    return this.client.healthCheck();
  }
}
