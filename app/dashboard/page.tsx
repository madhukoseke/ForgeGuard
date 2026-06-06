"use client";

import Link from "next/link";
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

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandmark">FG</span>
          <h1>ForgeGuard</h1>
        </Link>
        <div className="topbar-right">
          <span
            className={`live ${health?.insforge_reachable ? "connected" : health?.insforge_configured ? "degraded" : ""}`}
            title={
              health?.insforge_reachable
                ? "InsForge connected"
                : health?.insforge_configured
                  ? "InsForge unreachable"
                  : "Offline demo"
            }
          >
            <span className="dot" />
            {health?.insforge_reachable
              ? "Connected"
              : health?.insforge_configured
                ? "Unreachable"
                : "Demo"}
          </span>
        </div>
      </header>

      <p className="statline" aria-label="Summary">
        <span>
          <strong>{stats.total}</strong> actions
        </span>
        <span>
          <strong>{stats.blocked}</strong> guarded
        </span>
        <span className={stats.pending > 0 ? "warn" : undefined}>
          <strong>{stats.pending}</strong> pending
        </span>
        <span className={stats.critical > 0 ? "alert" : undefined}>
          <strong>{stats.critical}</strong> high risk
        </span>
        <span>
          <strong>{stats.rolledBack}</strong> rolled back
        </span>
      </p>

      <div className="workspace">
        <section>
          <h2 className="section-label">Actions</h2>
          <div className="feed">
            {actions.length === 0 ? (
              <div className="empty">
                <span>No actions yet</span>
                <p>Run a simulated operation to get started.</p>
              </div>
            ) : (
              actions.map((a) => (
                <ActionCard key={a.id} a={a} busy={busy} onReview={review} />
              ))
            )}
          </div>
        </section>

        <aside className="sidebar">
          <h2 className="section-label">Simulate</h2>
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
            <button disabled={busy !== null} onClick={() => tool("seed_all")}>
              Seed all
            </button>
            <button disabled={busy !== null} onClick={() => tool("reset")}>
              Reset
            </button>
          </div>
        </aside>
      </div>
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
    <article className="card">
      <div className="event-head">
        <div>
          <div className="event-title">
            <h3>{formatToken(a.action_type)}</h3>
          </div>
          <p className="event-sub">
            {formatToken(a.category)} · <span className={`sev ${sev}`}>{SEV_LABEL[sev]}</span>
          </p>
        </div>
        <span className="time">{timeAgo(a.created_at)}</span>
      </div>

      <pre className="statement">{a.statement}</pre>

      {a.rationale && <p className="rationale">{a.rationale}</p>}

      <div className="meta">
        <span>
          {a.agent}
          {a.target && <> · {a.target}</>}
          {a.requires_approval ? " · approval required" : " · auto"}
        </span>
      </div>

      {a.safer_alternative && (
        <div className="safer">{a.safer_alternative}</div>
      )}

      {a.preview_url && (
        <div className="safer">
          <a href={a.preview_url} target="_blank" rel="noopener noreferrer">
            Preview
          </a>
        </div>
      )}

      <div className="statusline">
        <span className={`status ${a.status}`}>{formatToken(a.status)}</span>
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
