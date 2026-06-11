// Simulated backend for the zero-credential demo. Ships a small seeded
// `users` table so MCP `query` returns real-looking rows without any infra.

import {
  ColumnInfo,
  DataBackend,
  SqlResult,
  TableInfo,
  sqlCommand,
} from "./types";

interface MemoryTable {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
}

function demoTables(): Map<string, MemoryTable> {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86_400_000).toISOString();
  const users: MemoryTable = {
    columns: [
      { name: "id", data_type: "uuid", is_nullable: false, default: "gen_random_uuid()" },
      { name: "email", data_type: "text", is_nullable: false, default: null },
      { name: "created_at", data_type: "timestamptz", is_nullable: false, default: "now()" },
      { name: "last_login", data_type: "timestamptz", is_nullable: true, default: null },
    ],
    rows: [
      { id: "11111111-1111-4111-8111-111111111111", email: "ada@example.com", created_at: daysAgo(30), last_login: daysAgo(1) },
      { id: "22222222-2222-4222-8222-222222222222", email: "grace@example.com", created_at: daysAgo(28), last_login: daysAgo(2) },
      { id: "33333333-3333-4333-8333-333333333333", email: "linus@example.com", created_at: daysAgo(21), last_login: daysAgo(3) },
      { id: "44444444-4444-4444-8444-444444444444", email: "margaret@example.com", created_at: daysAgo(14), last_login: daysAgo(4) },
      { id: "55555555-5555-4555-8555-555555555555", email: "alan@example.com", created_at: daysAgo(7), last_login: daysAgo(5) },
    ],
  };
  return new Map([["users", users]]);
}

// Stash on globalThis so Next.js HMR / route modules share one instance.
const g = globalThis as unknown as {
  __forgeguard_memory_backend?: Map<string, MemoryTable>;
};

export class MemoryBackend implements DataBackend {
  readonly kind = "memory" as const;
  private tables: Map<string, MemoryTable>;

  constructor() {
    if (!g.__forgeguard_memory_backend) {
      g.__forgeguard_memory_backend = demoTables();
    }
    this.tables = g.__forgeguard_memory_backend;
  }

  async executeSql(sql: string): Promise<SqlResult> {
    const command = sqlCommand(sql);
    if (command === "SELECT" || command === "WITH") {
      const table = sql.match(/\bfrom\s+"?(\w+)"?/i)?.[1]?.toLowerCase();
      const found = table ? this.tables.get(table) : undefined;
      const rows = found ? found.rows.map((r) => ({ ...r })) : [];
      return { rows, rowCount: rows.length, command: "SELECT" };
    }

    // Mutations are simulated: track CREATE/DROP TABLE so introspection stays
    // coherent across a demo session; everything else is a no-op success.
    const created = sql.match(
      /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?/i,
    );
    if (created) {
      const name = created[1].toLowerCase();
      if (!this.tables.has(name)) {
        this.tables.set(name, { columns: [], rows: [] });
      }
      return { rows: [], rowCount: 0, command };
    }
    const dropped = sql.match(/\bdrop\s+table\s+(?:if\s+exists\s+)?"?(\w+)"?/i);
    if (dropped) {
      this.tables.delete(dropped[1].toLowerCase());
      return { rows: [], rowCount: 0, command };
    }
    return { rows: [], rowCount: 0, command };
  }

  async listTables(): Promise<TableInfo[]> {
    return [...this.tables.keys()].map((name) => ({ schema: "public", name }));
  }

  async describeTable(table: string): Promise<ColumnInfo[]> {
    return this.tables.get(table.toLowerCase())?.columns ?? [];
  }

  async health(): Promise<boolean> {
    return true;
  }
}
