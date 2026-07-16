import { ACTION_FILTERS, filterActions } from "@/lib/action-filters";
import {
  actionsToCsv,
  actionsToJson,
  isHighRiskPending,
  isLowRiskPending,
  queryActions,
  uniqueAgents,
  type ActionQuery,
} from "@/lib/action-query";
import type { ActionSummary } from "@/lib/action-summary";
import type { AgentAction } from "@/lib/types";
import { ActionCard } from "./ActionCard";
import { ActionListSkeleton } from "./ActionListSkeleton";
import type { ReviewHandler } from "./types";

interface ActionsSectionProps {
  actions: AgentAction[];
  summary: ActionSummary;
  filter: string;
  query: ActionQuery;
  busy: string | null;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onFilterChange: (id: string) => void;
  onQueryChange: (patch: Partial<ActionQuery>) => void;
  onReview: ReviewHandler;
  onBulkReview: (
    ids: string[],
    decision: "approve" | "reject",
  ) => void | Promise<void>;
  onLoadMore: () => void;
}

function downloadText(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ActionsSection({
  actions,
  summary,
  filter,
  query,
  busy,
  loading,
  hasMore,
  loadingMore,
  onFilterChange,
  onQueryChange,
  onReview,
  onBulkReview,
  onLoadMore,
}: ActionsSectionProps) {
  const chipFiltered = filterActions(actions, filter);
  const visibleActions = queryActions(chipFiltered, query);
  const emptyTrail = summary.total === 0;
  const agents = uniqueAgents(actions);
  const lowRiskIds = visibleActions.filter(isLowRiskPending).map((a) => a.id);
  const highRiskIds = visibleActions.filter(isHighRiskPending).map((a) => a.id);
  const bulkBusy = busy !== null;

  return (
    <section className="border-t border-border py-16" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-muted">Actions</h2>
        <div className="flex flex-wrap gap-1" role="tablist">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                filter === f.id
                  ? "bg-surface-raised text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
              <span className="ml-1 tabular-nums text-subtle">
                {summary.filter_counts[f.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-subtle sm:col-span-2">
          Search
          <input
            type="search"
            value={query.q ?? ""}
            onChange={(e) => onQueryChange({ q: e.target.value })}
            placeholder="Statement, agent, rationale…"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
          />
        </label>
        <label className="block text-xs text-subtle">
          Agent
          <select
            value={query.agent ?? ""}
            onChange={(e) => onQueryChange({ agent: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
          >
            <option value="">All agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-subtle">
            From
            <input
              type="date"
              value={query.dateFrom ?? ""}
              onChange={(e) => onQueryChange({ dateFrom: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
            />
          </label>
          <label className="block text-xs text-subtle">
            To
            <input
              type="date"
              value={query.dateTo ?? ""}
              onChange={(e) => onQueryChange({ dateTo: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none focus:border-foreground"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          className="text-muted transition-colors hover:text-foreground disabled:opacity-35"
          disabled={visibleActions.length === 0}
          onClick={() =>
            downloadText(
              `forgeguard-actions-${Date.now()}.json`,
              actionsToJson(visibleActions),
              "application/json",
            )
          }
        >
          Export JSON
        </button>
        <button
          type="button"
          className="text-muted transition-colors hover:text-foreground disabled:opacity-35"
          disabled={visibleActions.length === 0}
          onClick={() =>
            downloadText(
              `forgeguard-actions-${Date.now()}.csv`,
              actionsToCsv(visibleActions),
              "text/csv",
            )
          }
        >
          Export CSV
        </button>
        {lowRiskIds.length > 0 && (
          <button
            type="button"
            className="ml-auto text-foreground transition-opacity hover:opacity-80 disabled:opacity-35"
            disabled={bulkBusy}
            onClick={() => {
              if (
                window.confirm(
                  `Approve ${lowRiskIds.length} low-risk pending op(s)?`,
                )
              ) {
                void onBulkReview(lowRiskIds, "approve");
              }
            }}
          >
            Approve {lowRiskIds.length} low-risk
          </button>
        )}
        {highRiskIds.length > 0 && (
          <button
            type="button"
            className={`text-danger transition-colors hover:opacity-80 disabled:opacity-35 ${lowRiskIds.length === 0 ? "ml-auto" : ""}`}
            disabled={bulkBusy}
            onClick={() => {
              if (
                window.confirm(
                  `Reject ${highRiskIds.length} high/critical pending op(s)?`,
                )
              ) {
                void onBulkReview(highRiskIds, "reject");
              }
            }}
          >
            Reject {highRiskIds.length} high-risk
          </button>
        )}
      </div>

      {loading ? (
        <ActionListSkeleton />
      ) : visibleActions.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[15px] font-medium">
            {emptyTrail ? "No actions yet" : "No actions in this view"}
          </p>
          <p className="mt-2 text-[15px] text-muted">
            {emptyTrail ? (
              <>
                Run a simulated operation or press{" "}
                <kbd className="font-mono text-sm">D</kbd> for the demo.
              </>
            ) : (
              "Try another filter, clear search, or load more actions."
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 divide-y divide-border">
            {visibleActions.map((a) => (
              <ActionCard key={a.id} action={a} busy={busy} onReview={onReview} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
                disabled={loadingMore || busy !== null}
                onClick={onLoadMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
