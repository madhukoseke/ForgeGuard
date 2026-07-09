import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <span>ForgeGuard</span>
        <div className="flex flex-wrap gap-6">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Try the demo
          </Link>
          <a
            href="https://github.com/madhukoseke/ForgeGuard#quick-start-mcp-server"
            className="transition-colors hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wire MCP
          </a>
        </div>
      </div>
    </footer>
  );
}
