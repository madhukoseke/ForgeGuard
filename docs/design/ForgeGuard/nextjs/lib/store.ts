// ============================================================
// ForgeGuard — in-memory audit store (server module singleton)
//
// A real deployment would persist AgentActions to Postgres on InsForge and
// stream them over SSE/websocket. For the demo this is an in-process store the
// route handlers mutate; it survives HMR via globalThis.
// ============================================================
import type { AgentAction, Status } from "./types";
import { OPS, type OpKey } from "./ops";

interface StoreState {
  actions: AgentAction[];
  seq: number;
}

const g = globalThis as unknown as { __forgeguard?: StoreState };
const state: StoreState = (g.__forgeguard ??= { actions: [], seq: 1 });

const rid = (n = 4) =>
  Array.from({ length: n }, () => "0123456789abcdef"[(Math.random() * 16) | 0]).join("");

function build(key: OpKey): AgentAction {
  const op = OPS[key];
  const now = new Date().toISOString();
  return {
    id: "act_" + String(state.seq++).padStart(4, "0") + "_" + rid(3),
    created_at: now,
    agent: op.agent,
    session_id: "sess_" + rid(6),
    action_type: op.action_type,
    target: op.target,
    statement: op.statement,
    diff: op.diff,
    severity: op.severity,
    category: op.category,
    rationale: op.rationale,
    blast_radius: op.blast_radius,
    requires_approval: op.requires_approval,
    status: op.requires_approval ? "pending" : "auto_allowed",
    reviewed_by: null,
    reviewed_at: null,
    safer_alternative: op.safer_alternative,
    branch: "agent/" + op.agent + "/" + rid(4),
    rollback_ref: "fg_" + rid(8),
    source: op.source,
    applied_safer: false,
  };
}

function find(id: string) {
  return state.actions.find((a) => a.id === id);
}

function review(id: string, status: Status, reviewer: string) {
  const a = find(id);
  if (!a) return null;
  a.status = status;
  a.reviewed_by = reviewer;
  a.reviewed_at = new Date().toISOString();
  if (status === "applied") a.applied_safer = !!a.safer_alternative;
  return a;
}

export const store = {
  /** GET /api/actions — newest first */
  list(): AgentAction[] {
    return state.actions.slice().reverse();
  },

  /** POST /api/guard/op — push a proposed op through the chokepoint */
  guard(key: OpKey): AgentAction {
    const a = build(key);
    state.actions.push(a);
    return a;
  },

  approve(id: string, reviewer = "you@forgeguard") {
    return review(id, "applied", reviewer);
  },
  reject(id: string, reviewer = "you@forgeguard") {
    return review(id, "rejected", reviewer);
  },
  rollback(id: string, reviewer = "you@forgeguard") {
    return review(id, "rolled_back", reviewer);
  },

  reset() {
    state.actions = [];
    state.seq = 1;
  },

  seed() {
    const order: OpKey[] = ["create_index_cc", "add_nullable", "deploy_fn", "blocking_index"];
    for (const key of order) {
      const a = build(key);
      if (key === "blocking_index") {
        a.status = "applied";
        a.reviewed_by = "you@forgeguard";
        a.reviewed_at = new Date().toISOString();
      }
      state.actions.push(a);
    }
  },
};
