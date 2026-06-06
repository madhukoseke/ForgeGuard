import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-raised font-mono text-[10px] font-semibold">
            FG
          </span>
          <span className="text-sm text-muted">
            ForgeGuard — control plane for agent-built backends
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <a
            href="#api"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            API
          </a>
        </div>
      </div>
    </footer>
  );
}
