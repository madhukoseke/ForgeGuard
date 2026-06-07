/* ============================================================
   ForgeGuard — App (Babel/JSX)
   topbar · stat strip · simulate bar · live feed · auto-demo
   ============================================================ */
const { FG } = window;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEV_DOT_COLOR = {
  safe: "var(--safe)", low: "var(--low)", medium: "var(--medium)",
  high: "var(--high)", critical: "var(--critical)",
};

function App() {
  const [actions, setActions] = React.useState([]);
  const [entering, setEntering] = React.useState(() => new Set());
  const [busy, setBusy] = React.useState(null); // {id, kind}
  const [toasts, setToasts] = React.useState([]);
  const [err, setErr] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [demo, setDemo] = React.useState({ running: false, step: 0 });

  const seenRef = React.useRef(new Set());
  const demoCancel = React.useRef(false);
  const toastSeq = React.useRef(0);

  const reduce = React.useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []
  );

  /* ---------- toast helper ---------- */
  const toast = React.useCallback((title, msg, accent, icon) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, title, msg, accent, icon }].slice(-4));
  }, []);
  const dropToast = React.useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /* ---------- poll / refresh (keeps last good state on failure) ---------- */
  const refresh = React.useCallback(async () => {
    try {
      const next = await FG.api.getActions();
      const fresh = [];
      next.forEach((a) => {
        if (!seenRef.current.has(a.id)) { seenRef.current.add(a.id); fresh.push(a.id); }
      });
      if (fresh.length) {
        setEntering((s) => {
          const n = new Set(s); fresh.forEach((id) => n.add(id)); return n;
        });
        setTimeout(() => {
          setEntering((s) => {
            const n = new Set(s); fresh.forEach((id) => n.delete(id)); return n;
          });
        }, reduce ? 60 : 1400);
      }
      setActions(next);
      setErr(null);
      return next;
    } catch (e) {
      // resilient: keep last good state, surface a quiet note
      setErr("poll dropped — showing last good state");
      setTimeout(() => setErr(null), 1600);
      return null;
    }
  }, [reduce]);

  /* ---------- 2s polling loop ---------- */
  React.useEffect(() => {
    let alive = true;
    (async () => { await FG.api.seedAll(); await refresh(); })();
    const iv = setInterval(() => { if (alive) refresh(); }, 2000);
    return () => { alive = false; clearInterval(iv); };
  }, [refresh]);

  /* ---------- decorate with enter flag ---------- */
  const decorated = React.useMemo(
    () => actions.map((a) => ({ ...a, _enter: entering.has(a.id) })),
    [actions, entering]
  );

  /* ---------- stats ---------- */
  const stats = React.useMemo(() => {
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

  /* ---------- mutations ---------- */
  const doMutation = React.useCallback(
    async (action, kind) => {
      if (busy) return;
      setBusy({ id: action.id, kind });
      try {
        if (kind === "approve") await FG.api.approve(action.id);
        else if (kind === "reject") await FG.api.reject(action.id);
        else if (kind === "rollback") await FG.api.rollback(action.id);
        await refresh();
        if (kind === "approve")
          toast(
            action.safer_alternative ? "Approved · safer version applied" : "Approved & applied",
            action.target, "var(--safe)", "shield-check"
          );
        else if (kind === "reject")
          toast("Change rejected", action.target + " · not applied", "var(--critical)", "x");
        else toast("Rolled back", action.target + " → " + action.rollback_ref, "var(--high)", "rotate-ccw");
      } finally {
        setBusy(null);
      }
    },
    [busy, refresh, toast]
  );

  const onApprove = React.useCallback((a) => doMutation(a, "approve"), [doMutation]);
  const onReject = React.useCallback((a) => doMutation(a, "reject"), [doMutation]);
  const onRollback = React.useCallback((a) => doMutation(a, "rollback"), [doMutation]);

  /* ---------- chip fire ---------- */
  const fireOp = React.useCallback(
    async (key) => {
      const op = FG.OPS[key];
      await FG.api.postOp(key);
      await refresh();
      const guarded = op.requires_approval;
      toast(
        guarded ? "Intercepted · paused for review" : "Auto-allowed",
        op.label + " · " + (op.source === "llm" ? "LLM" : "deterministic"),
        guarded ? `var(${window.SEV[op.severity].v})` : "var(--safe)",
        guarded ? "shield-alert" : "check-circle"
      );
    },
    [refresh, toast]
  );

  const seedAll = React.useCallback(async () => { await FG.api.seedAll(); await refresh(); toast("Trail seeded", "baseline activity loaded", "var(--brand)", "layers"); }, [refresh, toast]);
  const resetTrail = React.useCallback(async () => {
    demoCancel.current = true;
    setDemo({ running: false, step: 0 });
    await FG.api.reset();
    seenRef.current = new Set();
    setEntering(new Set());
    await refresh();
    toast("Trail reset", "audit log cleared", "var(--text-3)", "trash");
  }, [refresh, toast]);

  /* ---------- cinematic auto-demo ---------- */
  const runDemo = React.useCallback(async () => {
    if (demo.running) return;
    demoCancel.current = false;
    const D = reduce ? 1 : 1;
    const pause = async (ms) => { await sleep(reduce ? Math.min(ms, 120) : ms); return demoCancel.current; };
    setDemo({ running: true, step: 0 });

    // reset to a clean, lived-in baseline
    await FG.api.reset();
    seenRef.current = new Set();
    setEntering(new Set());
    await FG.api.seedAll();
    await refresh();
    if (await pause(900 * D)) return;

    setDemo({ running: true, step: 1 });
    // 1 — agent proposes a destructive migration
    const drop = await FG.api.postOp("drop_last_login");
    await refresh();
    toast("HIGH · data_loss intercepted", "claude-code → ALTER TABLE users DROP COLUMN", "var(--high)", "shield-alert");
    if (await pause(2600 * D)) return;

    // a second guarded item queues up (density + tension)
    await FG.api.postOp("avatars_public");
    await refresh();
    FG.api._blip(); // prove the feed survives a dropped poll
    if (await pause(2400 * D)) return;

    setDemo({ running: true, step: 2 });
    // 2 — operator approves the SAFE version
    await FG.api.approve(drop.id);
    await refresh();
    toast("Approved · safer version applied", "soft-delete instead of DROP COLUMN", "var(--safe)", "shield-check");
    if (await pause(2400 * D)) return;

    setDemo({ running: true, step: 3 });
    // 3 — a migration applies…
    const idx = await FG.api.postOp("blocking_index");
    await refresh();
    if (await pause(1700 * D)) return;
    await FG.api.approve(idx.id);
    await refresh();
    toast("Applied", "idx_orders_created · holding ACCESS EXCLUSIVE", "var(--medium)", "database");
    if (await pause(2200 * D)) return;

    setDemo({ running: true, step: 4 });
    // 4 — …turns out bad → one-click rollback
    await FG.api.rollback(idx.id);
    await refresh();
    toast("Rolled back", "every mistake is reversible", "var(--high)", "rotate-ccw");
    if (await pause(1400 * D)) return;

    setDemo({ running: true, step: 5 });
    await pause(400);
    setDemo({ running: false, step: 5 });
  }, [demo.running, reduce, refresh, toast]);

  /* ---------- keyboard shortcuts ---------- */
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= String(FG.CHIP_ORDER.length)) {
        fireOp(FG.CHIP_ORDER[parseInt(k, 10) - 1]); return;
      }
      if (k === "d") { runDemo(); }
      else if (k === "s") { seedAll(); }
      else if (k === "x") { resetTrail(); }
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

  /* ---------- filters ---------- */
  const FILTERS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending", test: (a) => a.status === "pending" },
    { id: "guarded", label: "Guarded", test: (a) => a.requires_approval },
    { id: "highcrit", label: "High / Critical", test: (a) => a.severity === "high" || a.severity === "critical" },
    { id: "resolved", label: "Resolved", test: (a) => ["applied", "rejected", "rolled_back"].includes(a.status) },
  ];
  const counts = React.useMemo(() => {
    const c = {};
    FILTERS.forEach((f) => { c[f.id] = f.test ? actions.filter(f.test).length : actions.length; });
    return c;
  }, [actions]);
  const activeFilter = FILTERS.find((f) => f.id === filter);
  const visible = decorated.filter((a) => (activeFilter.test ? activeFilter.test(a) : true));

  return (
    <div className="app">
      {/* ===== top bar ===== */}
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            <span className="brand-logo">
              <Icon name="shield-check" size={21} stroke={2} />
            </span>
            <div>
              <div className="brand-name">Forge<b>Guard</b></div>
              <div className="brand-sub">
                Audit<span className="arrow">→</span>Guard<span className="arrow">→</span>Approve
                <span className="arrow">→</span>Roll back
                <span style={{ color: "var(--text-4)", margin: "0 6px" }}>·</span>
                agent-built backends on InsForge
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="env-pill"><span className="dot" /> production</span>
            <span className="live">
              <span className="ring" />
              <b>Live</b> audit trail
            </span>
          </div>
        </div>
      </header>

      <main className="wrap">
        {/* ===== stat strip ===== */}
        <section className="stats" aria-label="Key metrics">
          <StatTile label="Total actions" value={stats.total} accent="var(--brand)" num="var(--text)" icon="activity" foot="through the chokepoint" />
          <StatTile label="Guarded" value={stats.guarded} accent="var(--low)" num="var(--low)" icon="shield" foot="required approval" />
          <StatTile label="Pending review" value={stats.pending} accent="var(--medium)" num="var(--medium)" icon="pause" foot="awaiting operator" />
          <StatTile label="High / Critical" value={stats.highcrit} accent="var(--high)" num="var(--high)" icon="flame" foot="risk caught" />
          <StatTile label="Rolled back" value={stats.rolled} accent="var(--high)" num="var(--text)" icon="rotate-ccw" foot="reversed safely" />
        </section>

        {/* ===== simulate-an-agent bar ===== */}
        <section className="sim" aria-label="Simulate an agent">
          <div className="sim-top">
            <span className="sim-eyebrow">
              <span className="chip-ico"><Icon name="cpu" size={14} /></span>
              Simulate an agent
            </span>
            <div className="sim-spacer" />
            {demo.running && (
              <div className="demo-rail">
                <span>demo</span>
                <span className="demo-steps">
                  {[1,2,3,4,5].map((i) => <i key={i} className={demo.step >= i ? "on" : ""} />)}
                </span>
              </div>
            )}
            <button className="btn btn-primary" onClick={runDemo} disabled={demo.running}>
              <Icon name={demo.running ? "activity" : "play"} size={14} />
              {demo.running ? "Running demo…" : "Run demo"}
            </button>
            <button className="btn btn-ghost" onClick={seedAll} disabled={demo.running}>
              <Icon name="layers" size={14} /> Seed all
            </button>
            <button className="btn btn-ghost" onClick={resetTrail}>
              <Icon name="trash" size={14} /> Reset trail
            </button>
          </div>

          <div className="chips">
            {FG.CHIP_ORDER.map((key, i) => {
              const op = FG.OPS[key];
              return (
                <button key={key} className="chip" onClick={() => fireOp(key)} disabled={demo.running}
                  title={op.statement}>
                  <span className="sev-dot" style={{ background: SEV_DOT_COLOR[op.sevDot], color: SEV_DOT_COLOR[op.sevDot] }} />
                  {op.label}
                  <kbd style={{ marginLeft: 2, fontSize: 9, color: "var(--text-4)", fontFamily: "var(--mono)" }}>{i + 1}</kbd>
                </button>
              );
            })}
          </div>

          <div className="sim-hint">
            <Icon name="info" size={13} style={{ color: "var(--text-4)", flex: "none", marginTop: 1 }} />
            <span>
              Each chip POSTs a proposed op to the guard chokepoint
              <span className="accent"> /api/guard/op</span>. Layer 1 (deterministic regex) and Layer 2 (LLM)
              classify risk; risky ops pause for approval. <span style={{ color: "var(--text-4)" }}>Apply &amp; rollback are
              simulated in this build.</span> Shortcuts: <kbd>D</kbd> demo · <kbd>1</kbd>–<kbd>8</kbd> ops · <kbd>A</kbd> approve · <kbd>R</kbd> rollback · <kbd>X</kbd> reset.
            </span>
          </div>

          {err && (
            <div className="sim-err">
              <Icon name="alert-triangle" size={13} /> {err}
            </div>
          )}
        </section>

        {/* ===== live feed ===== */}
        <div className="feed-bar">
          <div className="sec-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="activity" size={13} style={{ color: "var(--brand)" }} /> Live audit feed
          </div>
          <div className="filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id}
                className={"filter" + (filter === f.id ? " active" : "")}
                onClick={() => setFilter(f.id)}>
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
            visible.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
