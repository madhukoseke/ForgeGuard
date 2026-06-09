import { ACTION_FILTERS, filterActions } from "@/lib/action-filters";
import type { ActionSummary } from "@/lib/action-summary";
import type { AgentAction } from "@/lib/types";
import { ActionCard } from "./ActionCard";
import { ActionListSkeleton } from "./ActionListSkeleton";
import type { ReviewHandler } from "./types";

interface ActionsSectionProps {
  actions: AgentAction[];
  summary: ActionSummary;
  filter: string;
  busy: string | null;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onFilterChange: (id: string) => void;
  onReview: ReviewHandler;
  onLoadMore: () => void;
}

export function ActionsSection({
  actions,
  summary,
  filter,
  busy,
  loading,
  hasMore,
  loadingMore,
  onFilterChange,
  onReview,
  onLoadMore,
}: ActionsSectionProps) {
  const visibleActions = filterActions(actions, filter);
  const emptyTrail = summary.total === 0;

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
              "Try another filter or load more actions."
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
