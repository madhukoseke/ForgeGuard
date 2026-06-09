import { computeFilterCounts } from "./action-filters";
import type { AgentAction } from "./types";

export interface ActionSummary {
  total: number;
  blocked: number;
  pending: number;
  critical: number;
  rolled_back: number;
  filter_counts: Record<string, number>;
}

export function computeActionSummary(actions: AgentAction[]): ActionSummary {
  return {
    total: actions.length,
    blocked: actions.filter((a) => a.requires_approval).length,
    pending: actions.filter((a) => a.status === "pending").length,
    critical: actions.filter(
      (a) => a.severity === "critical" || a.severity === "high",
    ).length,
    rolled_back: actions.filter((a) => a.status === "rolled_back").length,
    filter_counts: computeFilterCounts(actions),
  };
}
