import { connectionState } from "./health-poll";
import type { HealthStatus } from "./types";

interface ConnectionStatusProps {
  health: HealthStatus | null;
}

export function ConnectionStatus({ health }: ConnectionStatusProps) {
  const state = connectionState(health);

  return (
    <div className="mb-10 flex items-center justify-end">
      <span
        className="inline-flex items-center gap-2 text-sm text-muted"
        title={state.title}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
        {state.label}
      </span>
    </div>
  );
}
