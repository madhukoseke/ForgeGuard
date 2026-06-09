"use client";

import { useState } from "react";
import type { AgentAction } from "@/lib/types";
import type { ReviewHandler } from "./types";
import {
  SEV_LABEL,
  blastBars,
  formatToken,
  sevClass,
  statusClass,
  timeAgo,
} from "./utils";

interface ActionCardProps {
  action: AgentAction;
  busy: string | null;
  onReview: ReviewHandler;
}

export function ActionCard({ action: a, busy, onReview }: ActionCardProps) {
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
        <span className="shrink-0 text-sm tabular-nums text-subtle">
          {timeAgo(a.created_at)}
        </span>
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
                  i < bars
                    ? sev === "critical" || sev === "high"
                      ? "bg-danger"
                      : "bg-warning"
                    : "bg-border"
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
        {a.replica_id && <> · replica {a.replica_id}</>}
      </p>

      {a.safer_alternative && (
        <div className="mt-3 rounded-lg border border-success/20 bg-success-muted px-4 py-3 text-sm leading-relaxed text-muted">
          <span className="font-medium text-success">Safer alternative</span>
          <p className="mt-1">{a.safer_alternative}</p>
        </div>
      )}

      {(a.preview_url || (a.pr_urls && a.pr_urls.length > 0)) && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {a.preview_url && (
            <a
              href={a.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-[3px] transition-opacity hover:opacity-80"
            >
              Preview
            </a>
          )}
          {a.pr_urls?.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={url}
              className="text-foreground underline underline-offset-[3px] transition-opacity hover:opacity-80"
            >
              {a.pr_urls!.length === 1 ? "View PR" : `PR ${i + 1}`}
            </a>
          ))}
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
          <span className="text-xs text-success">safer SQL applied</span>
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
                onClick={() => onReview(a.id, "approve", !!a.safer_alternative)}
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
