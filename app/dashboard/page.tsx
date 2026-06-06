"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentAction, Severity } from "@/lib/types";

interface DemoOpMeta {
  index: number;
  label: string;
  statement: string;
}

const SEV_LABEL: Record<Severity, string> = {
  safe: "safe",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const OPERATOR_TOKEN_KEY = "forgeguard_operator_token";

interface HealthStatus {
  store: "memory" | "insforge";
  executor: "simulated" | "insforge";
  insforge_configured: boolean;
  insforge_reachable: boolean;
  branch_cli: boolean;
}

async function fetchWithOperatorToken(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const existingToken = window.localStorage.getItem(OPERATOR_TOKEN_KEY);
  if (existingToken) headers.set("x-forgeguard-token", existingToken);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const token = window.prompt("ForgeGuard operator token");
  if (!token) return res;

  window.localStorage.setItem(OPERATOR_TOKEN_KEY, token);
  headers.set("x-forgeguard-token", token);
  res = await fetch(input, { ...init, headers });
  return res;
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}

export default function Dashboard() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [ops, setOps] = useState<DemoOpMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/actions", { cache: "no-store" });
      const data = await res.json();
      setActions(data.actions ?? []);
    } catch {
      /* keep last good state */
    }
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => setOps(d.ops ?? []))
      .catch(() => {});
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealth(d as HealthStatus))
      .catch(() => {});
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const runOp = async (index: number) => {
    setBusy(`op-${index}`);
    setError(null);
    try {
      const res = await fetchWithOperatorToken("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed with ${res.status}`);
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const tool = async (action: "seed_all" | "reset") => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetchWithOperatorToken("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed with ${res.status}`);
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const review = async (id: string, decision: string) => {
    setBusy(id);
    setError(null);
    try {
      const res = await fetchWithOperatorToken(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reviewed_by: "operator" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed with ${res.status}`);
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const total = actions.length;
    const blocked = actions.filter((a) => a.requires_approval).length;
    const pending = actions.filter((a) => a.status === "pending").length;
    const critical = actions.filter(
      (a) => a.severity === "critical" || a.severity === "high",
    ).length;
    const rolledBack = actions.filter((a) => a.status === "rolled_back").length;
    return { total, blocked, pending, critical, rolledBack };
  }, [actions]);

  const posture =
    stats.pending > 0
      ? `${stats.pending} pending ${stats.pending === 1 ? "review" : "reviews"}`
      : "No pending reviews";

  return (
    <div className="shell">
      <div className="gridwash" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="brandmark">FG</span>
          <div>
            <p className="eyebrow">Control plane</p>
            <h1>ForgeGuard</h1>
          </div>
        </div>
        <span
          className={`live ${health?.insforge_reachable ? "connected" : health?.insforge_configured ? "degraded" : ""}`}
          title={
            health?.insforge_reachable
              ? "InsForge connected — live executor"
              : health?.insforge_configured
                ? "InsForge configured but unreachable"
                : "Offline demo mode (memory store, simulated executor)"
          }
        >
          <span className="dot" />
          {health?.insforge_reachable
            ? "InsForge connected"
            : health?.insforge_configured
              ? "InsForge unreachable"
              : "Offline demo"}
        </span>
      </header>

      <main>
        <section className="overview">
          <div>
            <p className="eyebrow">Operator dashboard</p>
            <h2>Review and control agent operations.</h2>
            <p>
              Monitor the audit trail, approve high-risk changes, and roll back
              when needed — all from one place.
            </p>
          </div>
          <div className={`posture ${stats.pending > 0 ? "attention" : ""}`}>
            <span>Status</span>
            <strong>{posture}</strong>
          </div>
        </section>

        <section className="stats" aria-label="Audit summary">
          <div className="stat">
            <span>Actions</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat">
            <span>Guarded</span>
            <strong>{stats.blocked}</strong>
          </div>
          <div className={stats.pending > 0 ? "stat attention" : "stat"}>
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </div>
          <div className={stats.critical > 0 ? "stat alert" : "stat"}>
            <span>High risk</span>
            <strong>{stats.critical}</strong>
          </div>
          <div className="stat">
            <span>Rolled back</span>
            <strong>{stats.rolledBack}</strong>
          </div>
        </section>

        <div className="workspace">
          <section className="panel audit-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Audit trail</p>
                <h2>Recent actions</h2>
              </div>
              <span className="panel-meta">{actions.length} events</span>
            </div>
            <div className="feed">
              {actions.length === 0 ? (
                <div className="empty">
                  <span>No actions yet</span>
                  <p>Run a simulated operation to populate the audit trail.</p>
                </div>
              ) : (
                actions.map((a) => (
                  <ActionCard key={a.id} a={a} busy={busy} onReview={review} />
                ))
              )}
            </div>
          </section>

          <aside className="panel demo-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Simulator</p>
                <h2>Agent operations</h2>
              </div>
              <span className="panel-meta">{ops.length} presets</span>
            </div>
            {error && <div className="errorline">{error}</div>}
            <div className="chips">
              {ops.map((op) => (
                <button
                  key={op.index}
                  className="chip"
                  disabled={busy !== null}
                  onClick={() => runOp(op.index)}
                  title={op.statement}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <div className="toolbtns">
              <button
                className="btn ghost"
                disabled={busy !== null}
                onClick={() => tool("seed_all")}
              >
                Seed all
              </button>
              <button className="btn ghost" disabled={busy !== null} onClick={() => tool("reset")}>
                Reset trail
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ActionCard({
  a,
  busy,
  onReview,
}: {
  a: AgentAction;
  busy: string | null;
  onReview: (id: string, decision: string) => void;
}) {
  const sev = a.severity;
  const canReview = a.status === "pending";
  const canRollback = a.status === "applied" || a.status === "auto_allowed";
  const disabled = busy !== null;

  return (
    <article className={`card sev-${sev}`}>
      <div className="event-head">
        <div>
          <div className="event-title">
            <span className={`badge ${sev}`}>{SEV_LABEL[sev]}</span>
            <h3>{formatToken(a.action_type)}</h3>
          </div>
          <p>{formatToken(a.category)}</p>
        </div>
        <span className="time">{timeAgo(a.created_at)}</span>
      </div>

      <pre className="statement">{a.statement}</pre>

      {a.rationale && <p className="rationale">{a.rationale}</p>}

      <div className="meta">
        <span>
          agent <b>{a.agent}</b>
        </span>
        {a.target && (
          <span>
            target <b>{a.target}</b>
          </span>
        )}
        <span>
          blast radius <b>{a.blast_radius ?? "unknown"}</b>
        </span>
        <span>
          approval <b>{a.requires_approval ? "required" : "auto"}</b>
        </span>
        {a.branch && (
          <span>
            branch <b>{a.branch}</b>
          </span>
        )}
      </div>

      {a.rollback_ref && a.rollback_ref.startsWith("{") && (
        <div className="meta">
          <span>
            rollback <b>snapshot stored</b>
          </span>
        </div>
      )}

      {a.preview_url && (
        <div className="safer">
          <b>Mobile preview:</b>{" "}
          <a href={a.preview_url} target="_blank" rel="noopener noreferrer">
            Open Limrun stream
          </a>
        </div>
      )}

      {a.pr_urls && a.pr_urls.length > 0 && (
        <div className="meta">
          {a.pr_urls.map((url) => (
            <span key={url}>
              PR{" "}
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url.replace(/^https?:\/\//, "").slice(0, 48)}
              </a>
            </span>
          ))}
        </div>
      )}

      {a.replica_id && (
        <div className="meta">
          <span>
            replica <b>{a.replica_id.slice(0, 8)}…</b>
          </span>
        </div>
      )}

      {a.safer_alternative && (
        <div className="safer">
          <b>Safer alternative:</b> {a.safer_alternative}
        </div>
      )}

      <div className="statusline">
        <span className={`status ${a.status}`}>{formatToken(a.status)}</span>
        <span className={`tag ${a.source === "llm" ? "src-llm" : ""}`}>
          {a.source === "llm" ? "LLM classified" : "deterministic"}
        </span>
        {a.reviewed_by && (
          <span className="time">reviewed by {a.reviewed_by}</span>
        )}
        <div className="actions">
          {canReview && (
            <>
              <button
                className="btn approve"
                disabled={disabled}
                onClick={() => onReview(a.id, "approve")}
              >
                Approve
              </button>
              <button
                className="btn reject"
                disabled={disabled}
                onClick={() => onReview(a.id, "reject")}
              >
                Reject
              </button>
            </>
          )}
          {canRollback && (
            <button
              className="btn rollback"
              disabled={disabled}
              onClick={() => onReview(a.id, "rollback")}
            >
              Rollback
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
