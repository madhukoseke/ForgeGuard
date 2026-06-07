"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const FILTERS: { id: string; label: string; test?: (a: AgentAction) => boolean }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending", test: (a) => a.status === "pending" },
  { id: "guarded", label: "Guarded", test: (a) => a.requires_approval },
  {
    id: "highcrit",
    label: "High / Critical",
    test: (a) => a.severity === "high" || a.severity === "critical",
  },
  {
    id: "resolved",
    label: "Resolved",
    test: (a) => ["applied", "rejected", "rolled_back", "auto_allowed"].includes(a.status),
  },
];

interface HealthStatus {
  store: "memory" | "insforge";
  executor: "simulated" | "insforge";
  insforge_configured: boolean;
  insforge_reachable: boolean;
  branch_cli: boolean;
}

interface Toast {
  id: number;
  message: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function sevClass(sev: Severity): string {
  if (sev === "high" || sev === "critical") return "text-danger";
  if (sev === "medium") return "text-warning";
  return "text-subtle";
}

function statusClass(status: string): string {
  if (status === "pending") return "text-warning";
  if (status === "rejected") return "text-danger";
  if (status === "applied" || status === "approved" || status === "auto_allowed") {
    return "text-success";
  }
  return "text-muted";
}

function blastBars(value: string, sev: Severity): number {
  if (/unknown/i.test(value)) return 1;
  if (/all|every|tenant/i.test(value)) return 5;
  if (/12,?480|thousand/i.test(value)) return 5;
  if (/blocked|public|table|payments/i.test(value)) return 4;
  const numMatch = value.match(/\b([1-9]\d*)\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1].replace(/,/g, ""), 10);
    if (num === 0) return 0;
    if (num < 10) return 2;
    if (num < 1000) return 3;
    return 5;
  }
  if (/non-?blocking|1 function/i.test(value)) return 1;
  if (sev === "critical") return 5;
  if (sev === "high") return 4;
  if (sev === "medium") return 3;
  return 1;
}

export default function Dashboard() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [ops, setOps] = useState<DemoOpMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollNote, setPollNote] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [filter, setFilter] = useState("all");
  const [demo, setDemo] = useState({ running: false, step: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const demoCancel = useRef(false);
  const toastSeq = useRef(0);

  const toast = useCallback((message: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message }].slice(-3));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/actions", { cache: "no-store" });
      if (!res.ok) {
        setPollNote("poll dropped — showing last good state");
        setTimeout(() => setPollNote(null), 1600);
        return null;
      }
      const data = await res.json();
      setActions(data.actions ?? []);
      setPollNote(null);
      if (data.degraded && data.error) {
        setError(data.error);
      } else if (!data.degraded) {
        setError(null);
      }
      return data.actions as AgentAction[];
    } catch {
      setPollNote("poll dropped — showing last good state");
      setTimeout(() => setPollNote(null), 1600);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => setOps(d.ops ?? []))
      .catch(() => {});
    const loadHealth = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then((d) => setHealth(d as HealthStatus))
        .catch(() => {});
    loadHealth();
    const pollMs =
      health?.store === "insforge" && health?.insforge_reachable === false
        ? 10_000
        : 4_000;
    const actionsTimer = setInterval(refresh, pollMs);
    const healthTimer = setInterval(loadHealth, 15_000);
    return () => {
      clearInterval(actionsTimer);
      clearInterval(healthTimer);
    };
  }, [refresh, health?.store, health?.insforge_reachable]);

  const runOp = useCallback(
    async (index: number): Promise<string | null> => {
      setBusy(`op-${index}`);
      setError(null);
      try {
        const res = await fetchWithOperatorToken("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ index }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return null;
        }
        await refresh();
        return typeof data.id === "string" ? data.id : null;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const tool = useCallback(
    async (action: "seed_all" | "seed_baseline" | "reset"): Promise<string | null> => {
      setBusy(action);
      setError(null);
      try {
        const res = await fetchWithOperatorToken("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return null;
        }
        await refresh();
        return typeof data.id === "string" ? data.id : null;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const review = useCallback(
    async (id: string, decision: string): Promise<boolean> => {
      setBusy(id);
      setError(null);
      try {
        const res = await fetchWithOperatorToken(`/api/actions/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, reviewed_by: "operator" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return false;
        }
        await refresh();
        const action = data.action as AgentAction | undefined;
        if (decision === "approve") {
          toast(
            action?.applied_safer || action?.safer_alternative
              ? "Approved · safer version noted"
              : "Approved & applied",
          );
        } else if (decision === "reject") {
          toast("Change rejected");
        } else {
          toast("Rolled back");
        }
        return true;
      } finally {
        setBusy(null);
      }
    },
    [refresh, toast],
  );

  const runCinematicDemo = useCallback(async () => {
    if (demo.running) return;
    demoCancel.current = false;
    const stopDemo = () => setDemo({ running: false, step: 0 });
    const pause = async (ms: number) => {
      await sleep(ms);
      return demoCancel.current;
    };
    setDemo({ running: true, step: 0 });

    await tool("reset");
    if (await pause(400)) {
      stopDemo();
      return;
    }

    const baselineId = await tool("seed_baseline");
    if (await pause(900)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 1 });
    const dropId = await runOp(0);
    const afterDrop = await refresh();
    const dropAction = dropId ? afterDrop?.find((a) => a.id === dropId) : null;
    toast(`${(dropAction?.severity ?? "high").toUpperCase()} · data_loss intercepted`);
    if (await pause(2600)) {
      stopDemo();
      return;
    }

    await runOp(5);
    if (await pause(2400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 2 });
    const pendingDrop =
      dropId ?? actions.find((a) => a.status === "pending" && a.statement.includes("DROP COLUMN"))?.id;
    if (pendingDrop) await review(pendingDrop, "approve");
    if (await pause(2400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 3 });
    const latest = await refresh();
    const baseline =
      baselineId &&
      latest?.find(
        (a) =>
          a.id === baselineId && (a.status === "applied" || a.status === "auto_allowed"),
      );
    if (baseline) await review(baseline.id, "rollback");
    if (await pause(1400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 4 });
    const autoAllowId = await runOp(7);
    const afterAuto = await refresh();
    const autoAction = autoAllowId ? afterAuto?.find((a) => a.id === autoAllowId) : null;
    toast(
      autoAction?.status === "applied" || autoAction?.status === "auto_allowed"
        ? "Safe op auto-allowed"
        : "Auto-allow pending review",
    );
    if (await pause(2200)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 5 });
    const dropTableId = await runOp(2);
    if (await pause(2200)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 6 });
    const pendingDropTable =
      dropTableId ??
      (await refresh())?.find(
        (a) => a.status === "pending" && a.statement.includes("DROP TABLE"),
      )?.id;
    if (pendingDropTable) await review(pendingDropTable, "reject");
    if (await pause(1400)) {
      stopDemo();
      return;
    }

    await pause(400);
    setDemo({ running: false, step: 6 });
    toast("Demo complete");
  }, [actions, demo.running, refresh, review, runOp, toast, tool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();

      if (k >= "1" && k <= String(ops.length)) {
        void runOp(parseInt(k, 10) - 1);
        return;
      }
      if (k === "d") void runCinematicDemo();
      else if (k === "s") void tool("seed_all");
      else if (k === "x") void tool("reset");
      else if (k === "a") {
        const p = actions.find((a) => a.status === "pending");
        if (p) void review(p.id, "approve");
      } else if (k === "r") {
        const ap = actions.find((a) => a.status === "applied" || a.status === "auto_allowed");
        if (ap) void review(ap.id, "rollback");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, ops.length, review, runCinematicDemo, runOp, tool]);

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

  const filterCounts = useMemo(() => {
    const c: Record<string, number> = {};
    FILTERS.forEach((f) => {
      c[f.id] = f.test ? actions.filter(f.test).length : actions.length;
    });
    return c;
  }, [actions]);

  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const visibleActions = actions.filter((a) =>
    activeFilter.test ? activeFilter.test(a) : true,
  );

  const connectionLabel = health?.insforge_reachable
    ? "Connected"
    : health?.insforge_configured
      ? "Unreachable"
      : "Demo";

  const connectionDot = health?.insforge_reachable
    ? "bg-success"
    : health?.insforge_configured
      ? "bg-warning"
      : "bg-subtle";

  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 pt-24">
      <div className="mb-10 flex items-center justify-end">
        <span
          className="inline-flex items-center gap-2 text-sm text-muted"
          title={
            health?.insforge_reachable
              ? "InsForge connected"
              : health?.insforge_configured
                ? "InsForge unreachable"
                : "Offline demo"
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
          {connectionLabel}
        </span>
      </div>

      <p className="mb-16 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-muted" aria-label="Summary">
        <span>
          <strong className="font-medium tabular-nums text-foreground">{stats.total}</strong> actions
        </span>
        <span>
          <strong className="font-medium tabular-nums text-foreground">{stats.blocked}</strong> guarded
        </span>
        <span>
          <strong
            className={`font-medium tabular-nums ${stats.pending > 0 ? "text-warning" : "text-foreground"}`}
          >
            {stats.pending}
          </strong>{" "}
          pending
        </span>
        <span>
          <strong
            className={`font-medium tabular-nums ${stats.critical > 0 ? "text-danger" : "text-foreground"}`}
          >
            {stats.critical}
          </strong>{" "}
          high risk
        </span>
        <span>
          <strong className="font-medium tabular-nums text-foreground">{stats.rolledBack}</strong> rolled
          back
        </span>
      </p>

      <section className="border-t border-border py-16">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-sm font-medium text-muted">Simulate</h2>
          {demo.running && (
            <span className="text-xs text-subtle">
              demo step {demo.step}/4
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-4">
            <button
              type="button"
              className="text-sm font-medium text-foreground transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-35"
              disabled={busy !== null || demo.running}
              onClick={() => void runCinematicDemo()}
            >
              Run demo
            </button>
            <button
              type="button"
              className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
              disabled={busy !== null}
              onClick={() => void tool("seed_all")}
            >
              Seed all
            </button>
            <button
              type="button"
              className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
              disabled={busy !== null}
              onClick={() => {
                demoCancel.current = true;
                void tool("reset");
              }}
            >
              Reset
            </button>
          </div>
        </div>
        {(error || pollNote) && (
          <p className="mt-4 rounded-lg bg-danger-muted px-4 py-3 text-sm leading-relaxed text-danger">
            {error ?? pollNote}
          </p>
        )}
        <div className="mt-6 space-y-1">
          {ops.map((op) => (
            <button
              key={op.index}
              type="button"
              className="block w-full py-2 text-left text-[15px] text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
              disabled={busy !== null || demo.running}
              onClick={() => void runOp(op.index)}
              title={op.statement}
            >
              <span className="mr-2 font-mono text-xs text-subtle">{op.index + 1}</span>
              {op.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-subtle">
          Shortcuts: <kbd className="font-mono">D</kbd> demo · <kbd className="font-mono">1</kbd>–
          <kbd className="font-mono">{ops.length || 8}</kbd> ops · <kbd className="font-mono">A</kbd> approve ·{" "}
          <kbd className="font-mono">R</kbd> rollback · <kbd className="font-mono">S</kbd> seed ·{" "}
          <kbd className="font-mono">X</kbd> reset
        </p>
      </section>

      <section className="border-t border-border py-16" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-muted">Actions</h2>
          <div className="flex flex-wrap gap-1" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filter === f.id
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="ml-1 tabular-nums text-subtle">{filterCounts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>
        {visibleActions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[15px] font-medium">No actions in this view</p>
            <p className="mt-2 text-[15px] text-muted">
              Run a simulated operation or press <kbd className="font-mono text-sm">D</kbd> for the demo.
            </p>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-border">
            {visibleActions.map((a) => (
              <ActionCard key={a.id} a={a} busy={busy} onReview={review} />
            ))}
          </div>
        )}
      </section>

      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm text-foreground shadow-lg"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </main>
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
  const [open, setOpen] = useState(false);
  const sev = a.severity;
  const canReview = a.status === "pending";
  const canRollback = a.status === "applied" || a.status === "auto_allowed";
  const disabled = busy !== null;
  const bars = a.blast_radius ? blastBars(a.blast_radius, sev) : 0;

  return (
    <article className="py-8 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-medium capitalize tracking-[-0.01em]">
            {formatToken(a.action_type)}
          </h3>
          <p className="mt-1 text-sm capitalize text-muted">
            {formatToken(a.category)} ·{" "}
            <span className={sevClass(sev)}>{SEV_LABEL[sev]}</span>
            <span className="text-subtle">
              {" "}
              · {a.source === "llm" ? "LLM classified" : "Deterministic"}
            </span>
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-subtle">{timeAgo(a.created_at)}</span>
      </div>

      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-muted">
        {a.statement}
      </pre>

      {a.rationale && (
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{a.rationale}</p>
      )}

      {a.blast_radius && (
        <p className="mt-3 flex items-center gap-2 text-sm text-subtle">
          <span>Blast radius</span>
          <span className="inline-flex gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < bars ? (sev === "critical" || sev === "high" ? "bg-danger" : "bg-warning") : "bg-border"
                }`}
              />
            ))}
          </span>
          <span>{a.blast_radius}</span>
        </p>
      )}

      <p className="mt-3 text-sm text-subtle">
        {a.agent}
        {a.target && <> · {a.target}</>}
        {a.requires_approval ? " · approval required" : " · auto"}
        {a.branch && <> · {a.branch}</>}
      </p>

      {a.safer_alternative && (
        <div className="mt-3 rounded-lg border border-success/20 bg-success-muted px-4 py-3 text-sm leading-relaxed text-muted">
          <span className="font-medium text-success">Safer alternative</span>
          <p className="mt-1">{a.safer_alternative}</p>
        </div>
      )}

      {a.preview_url && (
        <p className="mt-3 text-sm">
          <a
            href={a.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-[3px] transition-opacity hover:opacity-80"
          >
            Preview
          </a>
        </p>
      )}

      {open && a.diff && (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-subtle">
          {a.diff}
        </pre>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className={`text-sm capitalize ${statusClass(a.status)}`}>
          {formatToken(a.status)}
        </span>
        {a.applied_safer && (
          <span className="text-xs text-success">safer version noted</span>
        )}
        {a.diff && (
          <button
            type="button"
            className="text-xs text-muted transition-colors hover:text-foreground"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? "Hide diff" : "View diff"}
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {canReview && (
            <>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-35"
                disabled={disabled}
                onClick={() => onReview(a.id, "approve")}
              >
                {a.safer_alternative ? "Approve safe version" : "Approve"}
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full px-5 text-sm font-medium text-danger transition-colors hover:bg-danger-muted disabled:cursor-default disabled:opacity-35"
                disabled={disabled}
                onClick={() => onReview(a.id, "reject")}
              >
                Reject
              </button>
            </>
          )}
          {canRollback && (
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-full bg-surface-raised px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-35"
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
