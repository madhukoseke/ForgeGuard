import type { AgentAction } from "./types";

export interface ActionFilter {
  id: string;
  label: string;
  test?: (a: AgentAction) => boolean;
}

export const ACTION_FILTERS: ActionFilter[] = [
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
    test: (a) =>
      ["applied", "rejected", "rolled_back", "auto_allowed"].includes(a.status),
  },
  {
    id: "requests",
    label: "Requests",
    test: (a) => a.action_type.startsWith("data."),
  },
  {
    id: "injection",
    label: "Injection",
    test: (a) => (a.injection_findings?.length ?? 0) > 0,
  },
];

export function filterActions(
  actions: AgentAction[],
  filterId: string,
): AgentAction[] {
  const def = ACTION_FILTERS.find((f) => f.id === filterId);
  if (!def?.test) return actions;
  return actions.filter(def.test);
}

export function computeFilterCounts(
  actions: AgentAction[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of ACTION_FILTERS) {
    counts[f.id] = f.test ? actions.filter(f.test).length : actions.length;
  }
  return counts;
}
