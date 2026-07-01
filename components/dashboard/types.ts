import type { ActionSummary } from "@/lib/action-summary";
import type { AgentAction } from "@/lib/types";

export interface DemoOpMeta {
  index: number;
  label: string;
  statement: string;
}

export interface HealthStatus {
  store: "memory" | "postgres" | "insforge";
  backend: "memory" | "postgres" | "insforge";
  ready: boolean;
  warnings?: string[];
  store_reachable?: boolean;
  backend_reachable?: boolean;
  executor: "simulated" | "insforge" | "migrations";
  insforge_configured: boolean;
  insforge_reachable: boolean;
  branch_cli?: boolean;
  version?: string;
}

export interface Toast {
  id: number;
  message: string;
}

export interface ActionsPagination {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface ActionsResponse {
  actions: AgentAction[];
  pagination?: ActionsPagination;
  summary?: ActionSummary;
  degraded?: boolean;
  error?: string;
}

export type ReviewHandler = (
  id: string,
  decision: string,
  applySafer?: boolean,
) => void | Promise<boolean>;
