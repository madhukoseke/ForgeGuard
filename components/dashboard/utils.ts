import type { Severity } from "@/lib/types";

export const DEMO_STEP_COUNT = 6;
export const OPERATOR_TOKEN_KEY = "forgeguard_operator_token";

/** Human-readable beats for the cinematic demo (aligned with docs/DEMO_SCRIPT.md). */
export const DEMO_STEP_LABELS: Record<number, string> = {
  0: "Seeding baseline",
  1: "Blocking destructive change",
  2: "Approving safer alternative",
  3: "Rolling back",
  4: "Auto-allowing safe op",
  5: "Holding critical DROP",
  6: "Rejecting critical op",
};

export function demoStepLabel(step: number): string {
  return DEMO_STEP_LABELS[step] ?? `Step ${step}`;
}


export const SEV_LABEL: Record<Severity, string> = {
  safe: "safe",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}

export function sevClass(sev: Severity): string {
  if (sev === "high" || sev === "critical") return "text-danger";
  if (sev === "medium") return "text-warning";
  return "text-subtle";
}

export function statusClass(status: string): string {
  if (status === "pending") return "text-warning";
  if (status === "rejected") return "text-danger";
  if (status === "applied" || status === "approved" || status === "auto_allowed") {
    return "text-success";
  }
  return "text-muted";
}

export function blastBars(value: string, sev: Severity): number {
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
