import type { CSSProperties } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  FunctionSquare,
  HardDrive,
  Info,
  KeyRound,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ActionType, Severity, Status } from "@/lib/types";

export const SEV: Record<Severity, { label: string; icon: LucideIcon; v: string }> = {
  safe: { label: "Safe", icon: CheckCircle2, v: "--safe" },
  low: { label: "Low", icon: Info, v: "--low" },
  medium: { label: "Medium", icon: AlertTriangle, v: "--medium" },
  high: { label: "High", icon: Flame, v: "--high" },
  critical: { label: "Critical", icon: AlertOctagon, v: "--critical" },
};

export const ACTION_ICON: Record<ActionType, LucideIcon> = {
  "db.migration": Database,
  "function.deploy": FunctionSquare,
  "storage.config": HardDrive,
  "auth.config": KeyRound,
};

export const SOURCE_ICON = { llm: Sparkles, deterministic: Cpu } as const;

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending review",
  approved: "Approved",
  applied: "Applied",
  rejected: "Rejected",
  rolled_back: "Rolled back",
  auto_allowed: "Auto-allowed",
};

/** CSS custom props that drive a card's severity accent (matches globals.css). */
export function sevVars(sev: Severity): CSSProperties {
  const v = SEV[sev].v;
  return {
    ["--sev" as string]: `var(${v})`,
    ["--sev-tint" as string]: `var(${v}-tint)`,
    ["--sev-line" as string]: `var(${v}-line)`,
    ["--sev-glow" as string]: `var(${v}-line)`,
  };
}
