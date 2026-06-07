"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  GitBranch,
  Layers,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { AgentAction } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import { ACTION_ICON, SEV, STATUS_LABEL, sevVars } from "./severity";
import { Sql } from "./Sql";
import { BlastRadius } from "./BlastRadius";

type Busy = "approve" | "reject" | "rollback" | null;

export function ActionCard({
  action,
  isNew,
  busy,
  onApprove,
  onReject,
  onRollback,
}: {
  action: AgentAction;
  isNew: boolean;
  busy: Busy;
  onApprove: (a: AgentAction) => void;
  onReject: (a: AgentAction) => void;
  onRollback: (a: AgentAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const sev = action.severity;
  const SevIcon = SEV[sev].icon;
  const ActionIcon = ACTION_ICON[action.action_type];
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const glow = isNew && SEVERITY_RANK[sev] >= 3;

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
        <span className={"sevb" + (isNew && !reduce ? " pulse" : "")}>
          <span className="ico">
            <SevIcon size={14} strokeWidth={2.2} />
          </span>
          {SEV[sev].label}
        </span>
        <div className="card-headmeta">
          <div className="card-target">
            <ActionIcon size={14} style={{ color: "var(--text-3)" }} />
            <span className="at">{action.action_type}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            {action.target}
          </div>
          <div className="card-time">
            <Clock size={10} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            {time} · {action.id}
          </div>
        </div>
        {action.source === "llm" ? (
          <span className="source llm" title="Layer 2 — model classifier">
            <span className="ico"><Sparkles size={11} strokeWidth={2.2} /></span>
            LLM classified
          </span>
        ) : (
          <span className="source det" title="Layer 1 — deterministic regex filter">
            <span className="ico"><Cpu size={11} strokeWidth={2.2} /></span>
            Deterministic
          </span>
        )}
      </div>

      <div className="tags">
        <span className="tag cat">
          <Layers size={10} style={{ color: "var(--text-4)" }} />
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
            <Lock size={10} /> approval required
          </span>
        ) : (
          <span className="tag" style={{ color: "var(--safe)" }}>
            <Check size={10} /> auto
          </span>
        )}
      </div>

      <div className="code">
        <div className="code-bar">
          <span className="lights"><i /><i /><i /></span>
          {action.action_type === "db.migration" ? "proposed migration" : "proposed change"}
        </div>
        <pre>
          <Sql code={action.statement} />
        </pre>
      </div>

      <div className="rationale">
        <span className="q"><ShieldAlert size={15} /></span>
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
          <span className="mv">
            <GitBranch size={11} style={{ color: "var(--text-4)" }} />
            {action.branch}
          </span>
        </div>
      </div>

      {action.safer_alternative && (
        <div className="safer">
          <span className="badge"><ShieldCheck size={16} /></span>
          <div className="safer-body">
            <div className="safer-label">
              <Sparkles size={11} /> Safer alternative
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
            {action.applied_safer && (
              <div className="meta">
                <span className="ml">Resolution</span>
                <span className="mv" style={{ color: "var(--safe)" }}>
                  <Check size={11} /> safer alternative applied
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cardfoot">
        <span className={"status " + action.status}>
          <span className="sdot" />
          {STATUS_LABEL[action.status]}
        </span>
        {action.applied_safer && !open && (
          <span className="foot-by" style={{ color: "var(--safe)" }}>
            <Check size={11} style={{ verticalAlign: "-1px" }} /> safer version applied
          </span>
        )}
        <div className="foot-spacer" />
        <button
          className={"expand-btn" + (open ? " open" : "")}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide diff" : "View diff"}
          <ChevronDown size={13} className="chev" />
        </button>
        <div className="foot-actions">
          {canApprove && (
            <>
              <button className="act act-reject" disabled={!!busy} onClick={() => onReject(action)}>
                {busy === "reject" ? <span className="spin" /> : <X size={13} />} Reject
              </button>
              <button className="act act-approve" disabled={!!busy} onClick={() => onApprove(action)}>
                {busy === "approve" ? <span className="spin" /> : <Check size={13} />}
                {action.safer_alternative ? "Approve safe version" : "Approve"}
              </button>
            </>
          )}
          {canRollback && (
            <button className="act act-rollback" disabled={!!busy} onClick={() => onRollback(action)}>
              {busy === "rollback" ? <span className="spin" /> : <RotateCcw size={13} />} Rollback
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
