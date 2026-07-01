import type { HealthStatus } from "./types";

interface ConnectionStatusProps {
  health: HealthStatus | null;
}

function connectionState(health: HealthStatus | null) {
  if (!health) {
    return { label: "…", dot: "bg-subtle", title: "Loading health status" };
  }
  if (!health.ready) {
    return {
      label: "Degraded",
      dot: "bg-warning",
      title: health.warnings?.join(" · ") ?? "Configuration or connectivity issue",
    };
  }
  if (health.store === "postgres" || health.backend === "postgres") {
    const ok =
      health.store_reachable !== false && health.backend_reachable !== false;
    return {
      label: ok ? "Postgres" : "Postgres unreachable",
      dot: ok ? "bg-success" : "bg-warning",
      title: ok ? "Postgres connected" : "Postgres connection failed",
    };
  }
  if (health.insforge_reachable) {
    return { label: "Connected", dot: "bg-success", title: "InsForge connected" };
  }
  if (health.insforge_configured) {
    return {
      label: "Unreachable",
      dot: "bg-warning",
      title: "InsForge unreachable",
    };
  }
  return { label: "Demo", dot: "bg-subtle", title: "Offline demo" };
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
