// Persistence for the audit trail (agent_actions).
//
// Two backends:
//   - "memory"   (default): a process-global array. Survives across requests in
//                 a single Next.js server, so the whole demo works with zero infra.
//   - "insforge": REST calls to the InsForge data API
//                 (/api/database/records/<table>, PostgREST-style). Verified
//                 against the linked cloud project using the ik_ admin key.
//
// The interface is identical either way, so the dashboard/API don't care.

import { isProduction } from "./production";
import { AgentAction, ActionStatus } from "./types";

export interface ActionStore {
  insert(row: AgentAction): Promise<AgentAction>;
  list(): Promise<AgentAction[]>;
  get(id: string): Promise<AgentAction | null>;
  update(id: string, patch: Partial<AgentAction>): Promise<AgentAction | null>;
  reset(): Promise<void>;
}

// ─── In-memory store ─────────────────────────────────────────────────────────
// Stash on globalThis so Next.js dev HMR / route modules share one instance.
const g = globalThis as unknown as { __forgeguard_rows?: AgentAction[] };
if (!g.__forgeguard_rows) g.__forgeguard_rows = [];

class MemoryStore implements ActionStore {
  async insert(row: AgentAction): Promise<AgentAction> {
    g.__forgeguard_rows!.unshift(row);
    return row;
  }
  async list(): Promise<AgentAction[]> {
    return [...g.__forgeguard_rows!].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  async get(id: string): Promise<AgentAction | null> {
    return g.__forgeguard_rows!.find((r) => r.id === id) ?? null;
  }
  async update(
    id: string,
    patch: Partial<AgentAction>,
  ): Promise<AgentAction | null> {
    const row = g.__forgeguard_rows!.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }
  async reset(): Promise<void> {
    g.__forgeguard_rows!.length = 0;
  }
}

// ─── InsForge store (best-effort REST) ───────────────────────────────────────
const INSFORGE_FETCH_TIMEOUT_MS = 8_000;

class InsForgeStore implements ActionStore {
  private base: string;
  private key: string;
  private table = "agent_actions";
  private listCache: AgentAction[] | null = null;
  private listCacheAt = 0;

  constructor(base: string, key: string) {
    this.base = base.replace(/\/$/, "");
    this.key = key;
  }

  private headers(extra?: Record<string, string>) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  // InsForge data API (PostgREST-style): /api/database/records/<table>
  private url(path = "") {
    return `${this.base}/api/database/records/${this.table}${path}`;
  }

  private async fetchWithTimeout(
    input: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INSFORGE_FETCH_TIMEOUT_MS);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `InsForge request timed out after ${INSFORGE_FETCH_TIMEOUT_MS}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private cacheList(rows: AgentAction[]) {
    this.listCache = rows;
    this.listCacheAt = Date.now();
  }

  private cachedList(): AgentAction[] | null {
    return this.listCache;
  }

  private patchCache(id: string, patch: Partial<AgentAction>) {
    if (!this.listCache) return;
    const row = this.listCache.find((r) => r.id === id);
    if (row) Object.assign(row, patch);
  }

  listCacheAgeMs(): number | null {
    return this.listCache ? Date.now() - this.listCacheAt : null;
  }

  private lastListFromCache = false;

  getListMeta(): { fromCache: boolean; cacheAgeMs: number | null } {
    return {
      fromCache: this.lastListFromCache,
      cacheAgeMs: this.listCacheAgeMs(),
    };
  }

  // Omit optional enrichment columns when null so older agent_actions schemas
  // (pre-replica_id / pr_urls / preview_url) still accept inserts.
  private serializeRow(row: AgentAction | Partial<AgentAction>) {
    const out: Record<string, unknown> = { ...row };
    for (const key of [
      "replica_id",
      "pr_urls",
      "preview_url",
      "applied_safer",
    ] as const) {
      if (out[key] == null) delete out[key];
    }
    return out;
  }

  private async insforgeError(
    action: string,
    resp: Response,
  ): Promise<never> {
    const body = await resp.text().catch(() => "");
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) detail = parsed.message;
    } catch {
      /* keep raw body */
    }
    throw new Error(
      `InsForge ${action} failed: ${resp.status}${detail ? ` — ${detail}` : ""}`,
    );
  }

  async insert(row: AgentAction): Promise<AgentAction> {
    // InsForge requires an array body; Prefer header returns the created row.
    const resp = await this.fetchWithTimeout(this.url(), {
      method: "POST",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify([this.serializeRow(row)]),
    });
    if (!resp.ok) await this.insforgeError("insert", resp);
    const data = await resp.json().catch(() => [row]);
    const saved = Array.isArray(data) ? (data[0] ?? row) : (data ?? row);
    if (this.listCache) {
      this.listCache.unshift(saved);
      this.listCacheAt = Date.now();
    }
    return saved;
  }

  async list(): Promise<AgentAction[]> {
    try {
      const resp = await this.fetchWithTimeout(this.url("?order=created_at.desc"), {
        headers: this.headers(),
      });
      if (!resp.ok) throw new Error(`InsForge list failed: ${resp.status}`);
      const rows = (await resp.json()) as AgentAction[];
      this.cacheList(rows);
      this.lastListFromCache = false;
      return rows;
    } catch (err) {
      const cached = this.cachedList();
      if (cached) {
        this.lastListFromCache = true;
        return cached;
      }
      this.lastListFromCache = false;
      throw err;
    }
  }

  async get(id: string): Promise<AgentAction | null> {
    const cached = this.cachedList()?.find((r) => r.id === id);
    try {
      const resp = await this.fetchWithTimeout(
        this.url(`?id=eq.${encodeURIComponent(id)}`),
        { headers: this.headers() },
      );
      if (!resp.ok) return cached ?? null;
      const rows = (await resp.json()) as AgentAction[];
      return rows[0] ?? cached ?? null;
    } catch {
      return cached ?? null;
    }
  }

  async update(
    id: string,
    patch: Partial<AgentAction>,
  ): Promise<AgentAction | null> {
    try {
      const resp = await this.fetchWithTimeout(
        this.url(`?id=eq.${encodeURIComponent(id)}`),
        {
          method: "PATCH",
          headers: this.headers({ prefer: "return=representation" }),
          body: JSON.stringify(this.serializeRow(patch)),
        },
      );
      if (!resp.ok) await this.insforgeError("update", resp);
      const rows = (await resp.json()) as AgentAction[];
      const updated = rows[0] ?? null;
      if (!updated) {
        throw new Error(`InsForge update failed: no row returned for id ${id}`);
      }
      this.patchCache(id, updated);
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("InsForge update")) {
        throw err;
      }
      throw new Error(
        `InsForge update failed: ${err instanceof Error ? err.message : "network error"}`,
      );
    }
  }

  async reset(): Promise<void> {
    const resp = await this.fetchWithTimeout(this.url("?id=not.is.null"), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`InsForge reset failed: ${resp.status}`);
    }
    this.listCache = null;
    this.listCacheAt = 0;
  }
}

let store: ActionStore | null = null;

export function getStore(): ActionStore {
  if (store) return store;
  const backend = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();
  if (backend === "insforge" && process.env.INSFORGE_URL && process.env.INSFORGE_KEY) {
    store = new InsForgeStore(process.env.INSFORGE_URL, process.env.INSFORGE_KEY);
  } else {
    if (isProduction() && process.env.VERCEL === "1") {
      console.warn(
        "[ForgeGuard] FORGEGUARD_STORE=memory on Vercel — audit data is per-instance and ephemeral. Set FORGEGUARD_STORE=insforge for production.",
      );
    }
    store = new MemoryStore();
  }
  return store;
}

export function getStoreListMeta(): {
  fromCache: boolean;
  cacheAgeMs: number | null;
} {
  const current = getStore();
  if (
    typeof (current as InsForgeStore).getListMeta === "function"
  ) {
    return (current as InsForgeStore).getListMeta();
  }
  return { fromCache: false, cacheAgeMs: null };
}

export const TERMINAL_STATUSES: ActionStatus[] = [
  "rejected",
  "rolled_back",
];
