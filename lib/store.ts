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
class InsForgeStore implements ActionStore {
  private base: string;
  private key: string;
  private table = "agent_actions";

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

  async insert(row: AgentAction): Promise<AgentAction> {
    // InsForge requires an array body; Prefer header returns the created row.
    const resp = await fetch(this.url(), {
      method: "POST",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify([row]),
    });
    if (!resp.ok) throw new Error(`InsForge insert failed: ${resp.status}`);
    const data = await resp.json().catch(() => [row]);
    return Array.isArray(data) ? (data[0] ?? row) : (data ?? row);
  }

  async list(): Promise<AgentAction[]> {
    const resp = await fetch(this.url("?order=created_at.desc"), {
      headers: this.headers(),
    });
    if (!resp.ok) throw new Error(`InsForge list failed: ${resp.status}`);
    return (await resp.json()) as AgentAction[];
  }

  async get(id: string): Promise<AgentAction | null> {
    const resp = await fetch(this.url(`?id=eq.${encodeURIComponent(id)}`), {
      headers: this.headers(),
    });
    if (!resp.ok) return null;
    const rows = (await resp.json()) as AgentAction[];
    return rows[0] ?? null;
  }

  async update(
    id: string,
    patch: Partial<AgentAction>,
  ): Promise<AgentAction | null> {
    const resp = await fetch(this.url(`?id=eq.${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(patch),
    });
    if (!resp.ok) return null;
    const rows = (await resp.json()) as AgentAction[];
    return rows[0] ?? null;
  }

  async reset(): Promise<void> {
    const resp = await fetch(this.url("?id=not.is.null"), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`InsForge reset failed: ${resp.status}`);
    }
  }
}

let store: ActionStore | null = null;

export function getStore(): ActionStore {
  if (store) return store;
  const backend = (process.env.FORGEGUARD_STORE || "memory").toLowerCase();
  if (backend === "insforge" && process.env.INSFORGE_URL && process.env.INSFORGE_KEY) {
    store = new InsForgeStore(process.env.INSFORGE_URL, process.env.INSFORGE_KEY);
  } else {
    store = new MemoryStore();
  }
  return store;
}

export const TERMINAL_STATUSES: ActionStatus[] = [
  "rejected",
  "rolled_back",
];
