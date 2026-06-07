/* ============================================================
   ForgeGuard — UI components (Babel/JSX → window)
   Icon set, SeverityBadge, SourcePill, StatTile, ActionCard, Toasts
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- icon set (lucide-style, 24 grid, stroke) ---------- */
const PATHS = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "shield-check": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
  check: "M20 6L9 17l-5-5",
  "check-circle": "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3",
  info: "M12 16v-4|M12 8h.01|M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  "alert-triangle": "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  octagon: "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z|M12 8v4|M12 16h.01",
  database: "M12 2c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3z|M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5|M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6",
  function: "M9 3H7a2 2 0 0 0-2 2v4l-2 3 2 3v4a2 2 0 0 0 2 2h2|M15 3h2a2 2 0 0 1 2 2v4l2 3-2 3v4a2 2 0 0 1-2 2h-2",
  "hard-drive": "M22 12H2|M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z|M6 16h.01|M10 16h.01",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  cpu: "M9 2v2|M15 2v2|M9 20v2|M15 20v2|M2 9h2|M2 15h2|M20 9h2|M20 15h2|M6 6h12v12H6z|M9 9h6v6H9z",
  "rotate-ccw": "M1 4v6h6|M3.51 15a9 9 0 1 0 2.13-9.36L1 10",
  x: "M18 6L6 18|M6 6l12 12",
  sparkles: "M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z",
  "chevron-down": "M6 9l6 6 6-6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2",
  "git-branch": "M6 3v12|M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M18 9a9 9 0 0 1-9 9",
  layers: "M12 2l9 5-9 5-9-5 9-5z|M3 12l9 5 9-5|M3 17l9 5 9-5",
  "arrow-right": "M5 12h14|M12 5l7 7-7 7",
  play: "M5 3l14 9-14 9V3z",
  "refresh-cw": "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  plus: "M12 5v14|M5 12h14",
  trash: "M3 6h18|M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  "shield-alert": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M12 8v4|M12 16h.01",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  "alert-octagon": "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z|M12 8v4|M12 16h.01",
  pause: "M6 4h4v16H6z|M14 4h4v16h-4z",
};

function Icon({ name, size = 16, stroke = 2, fill = "none", className = "", style }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split("|").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

/* ---------- severity helpers ---------- */
const SEV = {
  safe: { label: "Safe", icon: "check-circle", v: "--safe" },
  low: { label: "Low", icon: "info", v: "--low" },
  medium: { label: "Medium", icon: "alert-triangle", v: "--medium" },
  high: { label: "High", icon: "flame", v: "--high" },
  critical: { label: "Critical", icon: "alert-octagon", v: "--critical" },
};
const SEV_RANK = { safe: 0, low: 1, medium: 2, high: 3, critical: 4 };

function sevVars(sev) {
  return {
    "--sev": `var(${SEV[sev].v})`,
    "--sev-tint": `var(${SEV[sev].v}-tint)`,
    "--sev-line": `var(${SEV[sev].v}-line)`,
    "--sev-glow": `var(${SEV[sev].v}-line)`,
  };
}

function SeverityBadge({ sev, pulse }) {
  const s = SEV[sev] || SEV.low;
  return (
    <span className={"sevb" + (pulse ? " pulse" : "")} style={sevVars(sev)}>
      <span className="ico">
        <Icon name={s.icon} size={14} stroke={2.2} />
      </span>
      {s.label}
    </span>
  );
}

const ACTION_ICON = {
  "db.migration": "database",
  "function.deploy": "function",
  "storage.config": "hard-drive",
  "auth.config": "key",
};

function SourcePill({ source }) {
  if (source === "llm") {
    return (
      <span className="source llm" title="Layer 2 — model classifier">
        <span className="ico"><Icon name="sparkles" size={11} stroke={2.2} /></span>
        LLM classified
      </span>
    );
  }
  return (
    <span className="source det" title="Layer 1 — deterministic regex filter">
      <span className="ico"><Icon name="cpu" size={11} stroke={2.2} /></span>
      Deterministic
    </span>
  );
}

/* ---------- count-up stat tile ---------- */
function useCountUp(value, ms = 480) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(to); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(from + (to - from) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // safety: rAF is paused while the tab/iframe is backgrounded — guarantee the
    // final value still lands so counters never get stuck mid-tween.
    const safety = setTimeout(() => setN(to), ms + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [value, ms]);
  return n;
}

function StatTile({ label, value, accent, num, foot, icon }) {
  const n = useCountUp(value);
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="stat" style={{ "--accent": accent, "--num": num }}>
      <div className="stat-label">
        {icon && <Icon name={icon} size={13} stroke={2} style={{ color: accent }} />}
        {label}
      </div>
      <div className={"stat-val" + (flash ? " flash" : "")}>{n.toLocaleString()}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

/* ---------- blast radius mini viz ---------- */
function BlastRadius({ value, sev }) {
  const unknown = /unknown/i.test(value);
  // qualitative fill from severity + keywords
  let filled = 1;
  if (/all|every|tenant/i.test(value)) filled = 5;
  else if (/blocked|public|table|payments/i.test(value)) filled = 4;
  else if (/12,?480|thousand/i.test(value)) filled = 5;
  else if (/\b[1-9]\d*\b/.test(value)) {
    const num = parseInt(value.replace(/,/g, ""), 10);
    filled = num === 0 ? 0 : num < 10 ? 2 : num < 1000 ? 3 : 5;
  } else if (/non-?blocking|1 function/i.test(value)) filled = 1;
  return (
    <span className="blast" style={sevVars(sev)}>
      <span className="dots">
        {Array.from({ length: 5 }).map((_, i) => (
          <i key={i} className={i < filled ? "" : "empty"} />
        ))}
      </span>
      {unknown ? <span className="unknown">unknown</span> : value}
    </span>
  );
}

/* ---------- status pill ---------- */
const STATUS_LABEL = {
  pending: "Pending review",
  approved: "Approved",
  applied: "Applied",
  rejected: "Rejected",
  rolled_back: "Rolled back",
  auto_allowed: "Auto-allowed",
};
function StatusPill({ status }) {
  return (
    <span className={"status " + status}>
      <span className="sdot" />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

/* ---------- the hero: ActionCard ---------- */
function ActionCard({ action, busy, onApprove, onReject, onRollback, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const sev = action.severity;
  const isNew = action._enter;
  const glow = isNew && SEV_RANK[sev] >= 3;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const t = new Date(action.created_at);
  const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const canApprove = action.status === "pending";
  const canRollback = action.status === "applied" || action.status === "auto_allowed";

  return (
    <article
      className={"card" + (isNew ? (glow ? " glow" : " enter") : "")}
      style={sevVars(sev)}
      data-screen-label={"action " + action.id}
    >
      <div className="card-head">
        <SeverityBadge sev={sev} pulse={isNew && !reduce} />
        <div className="card-headmeta">
          <div className="card-target">
            <Icon name={ACTION_ICON[action.action_type]} size={14} style={{ color: "var(--text-3)" }} />
            <span className="at">{action.action_type}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            {action.target}
          </div>
          <div className="card-time">
            <Icon name="clock" size={10} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            {time} · {action.id}
          </div>
        </div>
        <SourcePill source={action.source} />
      </div>

      <div className="tags">
        <span className="tag cat">
          <Icon name="layers" size={10} style={{ color: "var(--text-4)" }} />
          {action.category}
        </span>
        <span className="tag">
          <span className="k">agent</span>
          <span className="v">{action.agent}</span>
        </span>
        <span className="tag">
          <span className="k">session</span>
          <span className="v">{action.session_id}</span>
        </span>
        {action.requires_approval ? (
          <span className="tag" style={{ color: "var(--medium)" }}>
            <Icon name="lock" size={10} /> approval required
          </span>
        ) : (
          <span className="tag" style={{ color: "var(--safe)" }}>
            <Icon name="check" size={10} /> auto
          </span>
        )}
      </div>

      <div className="code">
        <div className="code-bar">
          <span className="lights"><i /><i /><i /></span>
          {action.action_type === "db.migration" ? "proposed migration" : "proposed change"}
        </div>
        <pre dangerouslySetInnerHTML={{ __html: window.FG.highlightSQL(action.statement) }} />
      </div>

      <div className="rationale">
        <span className="q"><Icon name="shield-alert" size={15} /></span>
        <span>{action.rationale}</span>
      </div>

      <div className="metarow">
        <div className="meta">
          <span className="ml">Target</span>
          <span className="mv">{action.target}</span>
        </div>
        <div className="meta">
          <span className="ml">Blast radius</span>
          <span className="mv"><BlastRadius value={action.blast_radius} sev={sev} /></span>
        </div>
        <div className="meta">
          <span className="ml">Branch</span>
          <span className="mv"><Icon name="git-branch" size={11} style={{ color: "var(--text-4)" }} />{action.branch}</span>
        </div>
      </div>

      {action.safer_alternative && (
        <div className="safer">
          <span className="badge"><Icon name="shield-check" size={16} stroke={2} /></span>
          <div className="safer-body">
            <div className="safer-label">
              <Icon name="sparkles" size={11} /> Safer alternative
            </div>
            <div className="safer-text">{action.safer_alternative}</div>
          </div>
        </div>
      )}

      {open && (
        <div className="detail">
          <div className="diff">
            {action.diff.map((line, i) => (
              <div key={i} className={line[0]}>
                {line[1]}
              </div>
            ))}
          </div>
          <div className="metarow" style={{ borderTop: "none", paddingTop: 10 }}>
            <div className="meta">
              <span className="ml">Rollback ref</span>
              <span className="mv">{action.rollback_ref}</span>
            </div>
            {action.reviewed_by && (
              <div className="meta">
                <span className="ml">Reviewed by</span>
                <span className="mv">{action.reviewed_by}</span>
              </div>
            )}
            {action._appliedSafer && (
              <div className="meta">
                <span className="ml">Resolution</span>
                <span className="mv" style={{ color: "var(--safe)" }}>
                  <Icon name="check" size={11} /> safer alternative applied
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cardfoot">
        <StatusPill status={action.status} />
        {action._appliedSafer && !open && (
          <span className="foot-by" style={{ color: "var(--safe)" }}>
            <Icon name="check" size={11} style={{ verticalAlign: "-1px" }} /> safer version applied
          </span>
        )}
        <div className="foot-spacer" />
        <button className={"expand-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Hide diff" : "View diff"}
          <Icon name="chevron-down" size={13} className="chev" />
        </button>
        <div className="foot-actions">
          {canApprove && (
            <>
              <button className="act act-reject" disabled={busy} onClick={() => onReject(action)}>
                {busy === "reject" ? <span className="spin" /> : <Icon name="x" size={13} />} Reject
              </button>
              <button className="act act-approve" disabled={busy} onClick={() => onApprove(action)}>
                {busy === "approve" ? <span className="spin" /> : <Icon name="check" size={13} />}
                {action.safer_alternative ? "Approve safe version" : "Approve"}
              </button>
            </>
          )}
          {canRollback && (
            <button className="act act-rollback" disabled={busy} onClick={() => onRollback(action)}>
              {busy === "rollback" ? <span className="spin" /> : <Icon name="rotate-ccw" size={13} />} Rollback
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---------- toasts ---------- */
function Toasts({ items, onDone }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <Toast key={t.id} t={t} onDone={onDone} />
      ))}
    </div>
  );
}
function Toast({ t, onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setOut(true), 3200);
    const b = setTimeout(() => onDone(t.id), 3520);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [t.id, onDone]);
  return (
    <div className={"toast" + (out ? " out" : "")} style={{ "--t-accent": t.accent }}>
      <span className="ti"><Icon name={t.icon} size={16} /></span>
      <div className="toast-body">
        <div className="toast-title">{t.title}</div>
        {t.msg && <div className="toast-msg">{t.msg}</div>}
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, SeverityBadge, SourcePill, StatTile, BlastRadius, StatusPill,
  ActionCard, Toasts, SEV, SEV_RANK, sevVars,
});
