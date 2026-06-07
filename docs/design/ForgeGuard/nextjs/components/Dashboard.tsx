"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  Info,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { AgentAction } from "@/lib/types";
import { CHIP_ORDER, OPS } from "@/lib/ops";
import { SEV } from "./severity";
import { StatTile } from "./StatTile";
import { ActionCard } from "./ActionCard";
import { Toasts, type ToastItem } from "./Toasts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const headers = { "content-type": "application/json" };

const api = {
  list: (): Promise<AgentAction[]> =>
    fetch("/api/actions", { cache: "no-store" }).then((r) => r.json()).then((d) => d.actions),
  guard: (op: string): Promise<AgentAction> =>
    fetch("/api/guard/op", { method: "POST", headers, body: JSON.stringify({ op }) })
      .then((r) => r.json())
      .then((d) => d.action),
  mutate: (id: string, action: string): Promise<AgentAction> =>
    fetch(`/api/actions/${id}`, { method: "POST", headers, body: JSON.stringify({ action }) })
      .then((r) => r.json())
      .then((d) => d.action),
  trail: (cmd: string) =>
    fetch("/api/trail", { method: "POST", headers, body: JSON.stringify({ cmd }) }).then((r) =>
      r.json()
    ),
};

type Busy = { id: string; kind: "approve" | "reject" | "rollback" } | null;

const FILTERS: { id: string; label: string; test?: (a: AgentAction) => boolean }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending", test: (a) => a.status === "pending" },
  { id: "guarded", label: "Guarded", test: (a) => a.requires_approval },
  { id: "highcrit", label: "High / Critical", test: (a) => a.severity === "high" || a.severity === "critical" },
  { id: "resolved", label: "Resolved", test: (a) => ["applied", "rejected", "rolled_back"].includes(a.status) },
];

export default function Dashboard() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [entering, setEntering] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<Busy>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [demo, setDemo] = useState({ running: false, step: 0 });

  const seenRef = useRef<Set<string>>(new Set());
  const demoCancel = useRef(false);
  const toastSeq = useRef(0);
  const reduce = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const toast = useCallback((title: string, msg: string, accent: string, icon: ToastItem["icon"]) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, title, msg, accent, icon }].slice(-4));
  }, []);
  const dropToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // ---- poll / refresh (keeps last good state on failure) ----
  const refresh = useCallback(async () => {
    try {
      const next = await api.list();
      const fresh: string[] = [];
      next.forEach((a) => {
        if (!seenRef.current.has(a.id)) {
          seenRef.current.add(a.id);
          fresh.push(a.id);
        }
      });
      if (fresh.length) {
        setEntering((s) => new Set([...s, ...fresh]));
        setTimeout(() => {
          setEntering((s) => {
            const n = new Set(s);
            fresh.forEach((id) => n.delete(id));
            return n;
          });
        }, reduce ? 60 : 1400);
      }
      setActions(next);
      setErr(null);
      return next;
    } catch {
      setErr("poll dropped — showing last good state");
      setTimeout(() => setErr(null), 1600);
      return null;
    }
  }, [reduce]);

  // ---- 2s polling loop ----
  useEffect(() => {
    let alive = true;
    (async () => {
      await api.trail("seed");
      await refresh();
    })();
    const iv = setInterval(() => alive && refresh(), 2000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [refresh]);

  const decorated = useMemo(
    () => actions.map((a) => ({ a, isNew: entering.has(a.id) })),
    [actions, entering]
  );

  const stats = useMemo(() => {
    const s = { total: 0, guarded: 0, pending: 0, highcrit: 0, rolled: 0 };
    actions.forEach((a) => {
      s.total++;
      if (a.requires_approval) s.guarded++;
      if (a.status === "pending") s.pending++;
      if (a.severity === "high" || a.severity === "critical") s.highcrit++;
      if (a.status === "rolled_back") s.rolled++;
    });
    return s;
  }, [actions]);

  // ---- mutations ----
  const doMutation = useCallback(
    async (action: AgentAction, kind: "approve" | "reject" | "rollback") => {
      if (busy) return;
      setBusy({ id: action.id, kind });
      try {
        await api.mutate(action.id, kind);
        await refresh();
        if (kind === "approve")
          toast(
            action.safer_alternative ? "Approved · safer version applied" : "Approved & applied",
            action.target,
            "var(--safe)",
            ShieldCheck
          );
        else if (kind === "reject") toast("Change rejected", action.target + " · not applied", "var(--critical)", X);
        else toast("Rolled back", action.target + " → " + action.rollback_ref, "var(--high)", RotateCcw);
      } finally {
        setBusy(null);
      }
    },
    [busy, refresh, toast]
  );
  const onApprove = useCallback((a: AgentAction) => doMutation(a, "approve"), [doMutation]);
  const onReject = useCallback((a: AgentAction) => doMutation(a, "reject"), [doMutation]);
  const onRollback = useCallback((a: AgentAction) => doMutation(a, "rollback"), [doMutation]);

  const fireOp = useCallback(
    async (key: string) => {
      const op = OPS[key as keyof typeof OPS];
      await api.guard(key);
      await refresh();
      toast(
        op.requires_approval ? "Intercepted · paused for review" : "Auto-allowed",
        op.label + " · " + (op.source === "llm" ? "LLM" : "deterministic"),
        op.requires_approval ? `var(${SEV[op.severity].v})` : "var(--safe)",
        op.requires_approval ? ShieldAlert : CheckCircle2
      );
    },
    [refresh, toast]
  );

  const seedAll = useCallback(async () => {
    await api.trail("seed");
    await refresh();
    toast("Trail seeded", "baseline activity loaded", "var(--brand)", Layers);
  }, [refresh, toast]);

  const resetTrail = useCallback(async () => {
    demoCancel.current = true;
    setDemo({ running: false, step: 0 });
    await api.trail("reset");
    seenRef.current = new Set();
    setEntering(new Set());
    await refresh();
    toast("Trail reset", "audit log cleared", "var(--text-3)", Trash2);
  }, [refresh, toast]);

  // ---- cinematic auto-demo ----
  const runDemo = useCallback(async () => {
    if (demo.running) return;
    demoCancel.current = false;
    const pause = async (ms: number) => {
      await sleep(reduce ? Math.min(ms, 120) : ms);
      return demoCancel.current;
    };
    setDemo({ running: true, step: 0 });

    await api.trail("reset");
    seenRef.current = new Set();
    setEntering(new Set());
    await api.trail("seed");
    await refresh();
    if (await pause(900)) return;

    setDemo({ running: true, step: 1 });
    const drop = await api.guard("drop_last_login");
    await refresh();
    toast("HIGH · data_loss intercepted", "claude-code → ALTER TABLE users DROP COLUMN", "var(--high)", ShieldAlert);
    if (await pause(2600)) return;

    await api.guard("avatars_public");
    await refresh();
    if (await pause(2400)) return;

    setDemo({ running: true, step: 2 });
    await api.mutate(drop.id, "approve");
    await refresh();
    toast("Approved · safer version applied", "soft-delete instead of DROP COLUMN", "var(--safe)", ShieldCheck);
    if (await pause(2400)) return;

    setDemo({ running: true, step: 3 });
    const idx = await api.guard("blocking_index");
    await refresh();
    if (await pause(1700)) return;
    await api.mutate(idx.id, "approve");
    await refresh();
    toast("Applied", "idx_orders_created · holding ACCESS EXCLUSIVE", "var(--medium)", Database);
    if (await pause(2200)) return;

    setDemo({ running: true, step: 4 });
    await api.mutate(idx.id, "rollback");
    await refresh();
    toast("Rolled back", "every mistake is reversible", "var(--high)", RotateCcw);
    if (await pause(1400)) return;

    setDemo({ running: true, step: 5 });
    await pause(400);
    setDemo({ running: false, step: 5 });
  }, [demo.running, reduce, refresh, toast]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= String(CHIP_ORDER.length)) {
        fireOp(CHIP_ORDER[parseInt(k, 10) - 1]);
        return;
      }
      if (k === "d") runDemo();
      else if (k === "s") seedAll();
      else if (k === "x") resetTrail();
      else if (k === "a") {
        const p = actions.find((a) => a.status === "pending");
        if (p) onApprove(p);
      } else if (k === "r") {
        const ap = actions.find((a) => a.status === "applied" || a.status === "auto_allowed");
        if (ap) onRollback(ap);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, fireOp, runDemo, seedAll, resetTrail, onApprove, onRollback]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    FILTERS.forEach((f) => (c[f.id] = f.test ? actions.filter(f.test).length : actions.length));
    return c;
  }, [actions]);
  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const visible = decorated.filter(({ a }) => (activeFilter.test ? activeFilter.test(a) : true));

  return (
    <div className="app">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            <span className="brand-logo">
              <ShieldCheck size={21} />
            </span>
            <div>
              <div className="brand-name">
                Forge<b>Guard</b>
              </div>
              <div className="brand-sub">
                Audit<span className="arrow">→</span>Guard<span className="arrow">→</span>Approve
                <span className="arrow">→</span>Roll back
                <span style={{ color: "var(--text-4)", margin: "0 6px" }}>·</span>
                agent-built backends on InsForge
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="env-pill">
              <span className="dot" /> production
            </span>
            <span className="live">
              <span className="ring" />
              <b>Live</b> audit trail
            </span>
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="stats" aria-label="Key metrics">
          <StatTile label="Total actions" value={stats.total} accent="var(--brand)" num="var(--text)" icon={Activity} foot="through the chokepoint" />
          <StatTile label="Guarded" value={stats.guarded} accent="var(--low)" num="var(--low)" icon={Shield} foot="required approval" />
          <StatTile label="Pending review" value={stats.pending} accent="var(--medium)" num="var(--medium)" icon={Pause} foot="awaiting operator" />
          <StatTile label="High / Critical" value={stats.highcrit} accent="var(--high)" num="var(--high)" icon={Flame} foot="risk caught" />
          <StatTile label="Rolled back" value={stats.rolled} accent="var(--high)" num="var(--text)" icon={RotateCcw} foot="reversed safely" />
        </section>

        <section className="sim" aria-label="Simulate an agent">
          <div className="sim-top">
            <span className="sim-eyebrow">
              <span className="chip-ico"><Cpu size={14} /></span>
              Simulate an agent
            </span>
            <div className="sim-spacer" />
            {demo.running && (
              <div className="demo-rail">
                <span>demo</span>
                <span className="demo-steps">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i key={i} className={demo.step >= i ? "on" : ""} />
                  ))}
                </span>
              </div>
            )}
            <button className="btn btn-primary" onClick={runDemo} disabled={demo.running}>
              {demo.running ? <Activity size={14} /> : <Play size={14} />}
              {demo.running ? "Running demo…" : "Run demo"}
            </button>
            <button className="btn btn-ghost" onClick={seedAll} disabled={demo.running}>
              <Layers size={14} /> Seed all
            </button>
            <button className="btn btn-ghost" onClick={resetTrail}>
              <Trash2 size={14} /> Reset trail
            </button>
          </div>

          <div className="chips">
            {CHIP_ORDER.map((key, i) => {
              const op = OPS[key];
              return (
                <button key={key} className="chip" onClick={() => fireOp(key)} disabled={demo.running} title={op.statement}>
                  <span className="sev-dot" style={{ background: `var(${SEV[op.severity].v})`, color: `var(${SEV[op.severity].v})` }} />
                  {op.label}
                  <kbd style={{ marginLeft: 2, fontSize: 9, color: "var(--text-4)", fontFamily: "var(--mono)" }}>{i + 1}</kbd>
                </button>
              );
            })}
          </div>

          <div className="sim-hint">
            <Info size={13} style={{ color: "var(--text-4)", flex: "none", marginTop: 1 }} />
            <span>
              Each chip POSTs a proposed op to the guard chokepoint <span className="accent">/api/guard/op</span>. Layer 1
              (deterministic regex) and Layer 2 (LLM) classify risk; risky ops pause for approval.{" "}
              <span style={{ color: "var(--text-4)" }}>Apply &amp; rollback are simulated in this build.</span> Shortcuts:{" "}
              <kbd>D</kbd> demo · <kbd>1</kbd>–<kbd>8</kbd> ops · <kbd>A</kbd> approve · <kbd>R</kbd> rollback · <kbd>X</kbd> reset.
            </span>
          </div>

          {err && (
            <div className="sim-err">
              <AlertTriangle size={13} /> {err}
            </div>
          )}
        </section>

        <div className="feed-bar">
          <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={13} style={{ color: "var(--brand)" }} /> Live audit feed
          </div>
          <div className="filters" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className={"filter" + (filter === f.id ? " active" : "")}
                onClick={() => setFilter(f.id)}
              >
                {f.label} <span className="cnt">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="feed" aria-label="Audit feed" aria-live="polite">
          {visible.length === 0 ? (
            <div className="feed-empty">
              No actions in this view. Fire a chip above or press <kbd>D</kbd> to run the demo.
            </div>
          ) : (
            visible.map(({ a, isNew }) => (
              <ActionCard
                key={a.id}
                action={a}
                isNew={isNew}
                busy={busy && busy.id === a.id ? busy.kind : null}
                onApprove={onApprove}
                onReject={onReject}
                onRollback={onRollback}
              />
            ))
          )}
        </section>

        <div className="landline">
          Every action — <b>logged</b>. &nbsp;Every risk — <b>caught</b>. &nbsp;Every mistake — <b>reversible</b>.
        </div>
      </main>

      <Toasts items={toasts} onDone={dropToast} />
    </div>
  );
}
