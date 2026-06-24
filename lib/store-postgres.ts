// Audit-trail persistence in any Postgres (FORGEGUARD_STORE=postgres).
// The table is auto-created on first use so `npx forgeguard-mcp` against a
// fresh database needs zero setup. The dashboard and the MCP server share the
// trail when they point at the same DATABASE_URL.

import { Pool } from "pg";
import { computeActionSummary, type ActionSummary } from "./action-summary";
import { postgresConnectionUrl } from "./postgres-env";
import type { ActionListPage, ActionStore } from "./store";
import type { AgentAction } from "./types";

const AUDIT_TABLE = "forgeguard_actions";

const ENSURE_SQL = `
create table if not exists ${AUDIT_TABLE} (
  id                 uuid primary key,
  created_at         timestamptz not null default now(),
  agent              text not null,
  session_id         text,
  action_type        text not null,
  target             text,
  statement          text not null,
  diff               text,
  severity           text not null,
  category           text not null,
  rationale          text,
  blast_radius       text,
  requires_approval  boolean not null default false,
  status             text not null default 'pending',
  reviewed_by        text,
  reviewed_at        timestamptz,
  safer_alternative  text,
  branch             text,
  rollback_ref       text,
  source             text not null default 'deterministic',
  replica_id         text,
  pr_urls            jsonb,
  preview_url        text,
  applied_safer      boolean not null default false,
  injection_findings jsonb,
  transport          text
);
create index if not exists ${AUDIT_TABLE}_created_at_idx on ${AUDIT_TABLE} (created_at desc);
create index if not exists ${AUDIT_TABLE}_status_idx on ${AUDIT_TABLE} (status);
`;

const COLUMNS = [
  "id",
  "created_at",
  "agent",
  "session_id",
  "action_type",
  "target",
  "statement",
  "diff",
  "severity",
  "category",
  "rationale",
  "blast_radius",
  "requires_approval",
  "status",
  "reviewed_by",
  "reviewed_at",
  "safer_alternative",
  "branch",
  "rollback_ref",
  "source",
  "replica_id",
  "pr_urls",
  "preview_url",
  "applied_safer",
  "injection_findings",
  "transport",
] as const;

type ColumnName = (typeof COLUMNS)[number];

const JSON_COLUMNS: ReadonlySet<ColumnName> = new Set([
  "pr_urls",
  "injection_findings",
]);

function toDbValue(key: ColumnName, value: unknown): unknown {
  if (value === undefined) return null;
  if (JSON_COLUMNS.has(key) && value !== null) return JSON.stringify(value);
  return value;
}

function fromDbRow(raw: Record<string, unknown>): AgentAction {
  const row = { ...raw } as Record<string, unknown>;
  for (const key of ["created_at", "reviewed_at"]) {
    if (row[key] instanceof Date) row[key] = (row[key] as Date).toISOString();
  }
  row.applied_safer = row.applied_safer === true;
  return row as unknown as AgentAction;
}

export class PostgresStore implements ActionStore {
  private pool: Pool;
  private ensured: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.FORGEGUARD_PG_POOL_MAX || 5),
      connectionTimeoutMillis: 8_000,
    });
  }

  static fromEnv(): PostgresStore | null {
    const url = postgresConnectionUrl();
    return url ? new PostgresStore(url) : null;
  }

  private ensure(): Promise<void> {
    if (!this.ensured) {
      this.ensured = this.pool.query(ENSURE_SQL).then(() => undefined);
    }
    return this.ensured;
  }

  async insert(row: AgentAction): Promise<AgentAction> {
    await this.ensure();
    const record = row as unknown as Record<string, unknown>;
    const keys = COLUMNS.filter((c) => record[c] !== undefined);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => toDbValue(k, record[k]));
    await this.pool.query(
      `insert into ${AUDIT_TABLE} (${keys.join(", ")}) values (${placeholders})`,
      values as never[],
    );
    return row;
  }

  async list(): Promise<AgentAction[]> {
    await this.ensure();
    const result = await this.pool.query(
      `select * from ${AUDIT_TABLE} order by created_at desc`,
    );
    return (result.rows as Record<string, unknown>[]).map(fromDbRow);
  }

  async listPage(opts: { limit: number; offset: number }): Promise<ActionListPage> {
    await this.ensure();
    const { limit, offset } = opts;
    const [rowsResult, countResult] = await Promise.all([
      this.pool.query(
        `select * from ${AUDIT_TABLE} order by created_at desc limit $1 offset $2`,
        [limit, offset] as never[],
      ),
      this.pool.query(`select count(*)::int as total from ${AUDIT_TABLE}`),
    ]);
    const rows = (rowsResult.rows as Record<string, unknown>[]).map(fromDbRow);
    const total = Number(
      (countResult.rows[0] as { total?: number } | undefined)?.total ?? rows.length,
    );
    return {
      rows,
      total,
      limit,
      offset,
      has_more: offset + rows.length < total,
    };
  }

  async getSummary(): Promise<ActionSummary> {
    return computeActionSummary(await this.list());
  }

  async get(id: string): Promise<AgentAction | null> {
    await this.ensure();
    const result = await this.pool.query(
      `select * from ${AUDIT_TABLE} where id = $1`,
      [id] as never[],
    );
    const row = (result.rows as Record<string, unknown>[])[0];
    return row ? fromDbRow(row) : null;
  }

  async update(
    id: string,
    patch: Partial<AgentAction>,
  ): Promise<AgentAction | null> {
    await this.ensure();
    const record = patch as Record<string, unknown>;
    const keys = COLUMNS.filter((c) => c !== "id" && record[c] !== undefined);
    if (keys.length === 0) return this.get(id);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = keys.map((k) => toDbValue(k, record[k]));
    const result = await this.pool.query(
      `update ${AUDIT_TABLE} set ${sets} where id = $1 returning *`,
      [id, ...values] as never[],
    );
    const row = (result.rows as Record<string, unknown>[])[0];
    return row ? fromDbRow(row) : null;
  }

  async reset(): Promise<void> {
    await this.ensure();
    await this.pool.query(`delete from ${AUDIT_TABLE}`);
  }
}
