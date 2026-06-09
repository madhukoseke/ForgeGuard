import type { HealthStatus } from "./types";

interface ConnectionStatusProps {
  health: HealthStatus | null;
}

export function ConnectionStatus({ health }: ConnectionStatusProps) {
  const connectionLabel = health?.insforge_reachable
    ? "Connected"
    : health?.insforge_configured
      ? "Unreachable"
      : "Demo";

  const connectionDot = health?.insforge_reachable
    ? "bg-success"
    : health?.insforge_configured
      ? "bg-warning"
      : "bg-subtle";

  return (
    <div className="mb-10 flex items-center justify-end">
      <span
        className="inline-flex items-center gap-2 text-sm text-muted"
        title={
          health?.insforge_reachable
            ? "InsForge connected"
            : health?.insforge_configured
              ? "InsForge unreachable"
              : "Offline demo"
        }
      >
        <span className={`h-1.5 w-1.5 rounded-full ${connectionDot}`} />
        {connectionLabel}
      </span>
    </div>
  );
}
