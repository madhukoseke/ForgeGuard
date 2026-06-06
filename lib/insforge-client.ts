// InsForge admin REST client.
// Docs: https://docs.insforge.dev/sdks/rest/database

export type ExecutorMode = "simulated" | "insforge" | "migrations";

export interface InsForgeCredentials {
  url: string;
  key: string;
}

export interface RawSqlResult {
  rows: unknown[];
  rowCount: number;
  command: string;
}

export interface MigrationRecord {
  version: string;
  name: string;
  statements?: string[];
  createdAt?: string;
}

function normalizeCredentials(
  input: InsForgeCredentials | { baseUrl: string; adminKey: string },
): InsForgeCredentials {
  if ("url" in input && "key" in input) {
    return { url: input.url.replace(/\/$/, ""), key: input.key };
  }
  return {
    url: input.baseUrl.replace(/\/$/, ""),
    key: input.adminKey,
  };
}

export function getInsForgeConfig(): InsForgeCredentials | null {
  const url = process.env.INSFORGE_URL?.trim();
  const key = process.env.INSFORGE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function isInsForgeConfigured(): boolean {
  return getInsForgeConfig() !== null;
}

export function isBranchCliEnabled(): boolean {
  return (
    process.env.FORGEGUARD_BRANCH_MODE?.toLowerCase() === "cli" &&
    !process.env.VERCEL
  );
}

/** Falls back to simulated when credentials are missing. */
export function getExecutorMode(): ExecutorMode {
  const requested = (process.env.FORGEGUARD_EXECUTOR || "simulated").toLowerCase();
  if (requested === "simulated") return "simulated";
  if (!isInsForgeConfigured()) return "simulated";
  if (requested === "migrations") return "migrations";
  return "insforge";
}

export function migrationVersion(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

export class InsForgeClient {
  readonly url: string;
  readonly key: string;

  constructor(credentials: InsForgeCredentials | { baseUrl: string; adminKey: string }) {
    const normalized = normalizeCredentials(credentials);
    this.url = normalized.url;
    this.key = normalized.key;
  }

  static fromEnv(): InsForgeClient | null {
    const config = getInsForgeConfig();
    return config ? new InsForgeClient(config) : null;
  }

  private headers(extra?: Record<string, string>) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.url}/api/database/migrations`, {
        headers: this.headers(),
      });
      return resp.ok || resp.status === 404;
    } catch {
      return false;
    }
  }

  async runRawSql(query: string, params: unknown[] = []): Promise<RawSqlResult> {
    const resp = await fetch(`${this.url}/api/database/advance/rawsql`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ query, params }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : `InsForge rawsql failed (${resp.status})`;
      throw new Error(msg);
    }
    return body as RawSqlResult;
  }

  async createMigration(input: {
    version: string;
    name: string;
    sql: string;
  }): Promise<MigrationRecord> {
    const resp = await fetch(`${this.url}/api/database/migrations`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : `InsForge migration failed (${resp.status})`;
      throw new Error(msg);
    }
    return body as MigrationRecord;
  }

  async listMigrations(): Promise<MigrationRecord[]> {
    const resp = await fetch(`${this.url}/api/database/migrations`, {
      headers: this.headers(),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(`InsForge list migrations failed (${resp.status})`);
    }
    if (typeof body === "object" && body !== null && "migrations" in body) {
      return (body as { migrations: MigrationRecord[] }).migrations;
    }
    return Array.isArray(body) ? (body as MigrationRecord[]) : [];
  }

  async queryRecords<T = unknown>(
    table: string,
    query = "",
  ): Promise<T[]> {
    const resp = await fetch(
      `${this.url}/api/database/records/${table}${query}`,
      { headers: this.headers() },
    );
    if (!resp.ok) {
      throw new Error(`InsForge query ${table} failed (${resp.status})`);
    }
    return (await resp.json()) as T[];
  }
}
