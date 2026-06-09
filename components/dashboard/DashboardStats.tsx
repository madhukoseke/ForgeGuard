import type { ActionSummary } from "@/lib/action-summary";

interface DashboardStatsProps {
  summary: ActionSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  return (
    <p
      className="mb-16 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-muted"
      aria-label="Summary"
    >
      <span>
        <strong className="font-medium tabular-nums text-foreground">
          {summary.total}
        </strong>{" "}
        actions
      </span>
      <span>
        <strong className="font-medium tabular-nums text-foreground">
          {summary.blocked}
        </strong>{" "}
        guarded
      </span>
      <span>
        <strong
          className={`font-medium tabular-nums ${summary.pending > 0 ? "text-warning" : "text-foreground"}`}
        >
          {summary.pending}
        </strong>{" "}
        pending
      </span>
      <span>
        <strong
          className={`font-medium tabular-nums ${summary.critical > 0 ? "text-danger" : "text-foreground"}`}
        >
          {summary.critical}
        </strong>{" "}
        high risk
      </span>
      <span>
        <strong className="font-medium tabular-nums text-foreground">
          {summary.rolled_back}
        </strong>{" "}
        rolled back
      </span>
    </p>
  );
}
