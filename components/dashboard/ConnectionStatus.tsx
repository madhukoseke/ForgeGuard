import { connectionState, isHealthDegraded } from "./health-poll";
import type { HealthStatus } from "./types";

interface ConnectionStatusProps {
  health: HealthStatus | null;
  onRefresh?: () => void;
}

export function ConnectionStatus({ health, onRefresh }: ConnectionStatusProps) {
  const state = connectionState(health);
  const degraded = isHealthDegraded(health);
  const className = "inline-flex items-center gap-2 text-sm text-muted";

  if (degraded && onRefresh) {
    return (
      <div className="mb-10 flex items-center justify-end">
        <button
          type="button"
          className={`${className} cursor-pointer hover:text-foreground`}
          title={`${state.title} · click to retry`}
          onClick={onRefresh}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
          {state.label}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 flex items-center justify-end">
      <span className={className} title={state.title}>
        <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
        {state.label}
      </span>
    </div>
  );
}
