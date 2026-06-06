import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="glow-top pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-24 md:pb-40 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Control plane for InsForge
          </p>

          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground md:text-7xl">
            Guard agent ops
            <br />
            <span className="text-muted">before production.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Audit, classify, approve, and roll back every agent operation on your
            backend. Built for teams shipping with autonomous AI.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Open Dashboard
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-4xl">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <span className="ml-2 font-mono text-xs text-subtle">guard/op</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-muted">
              <code>{`POST /api/guard/op
{
  "agent": "schema-migrator",
  "action_type": "alter_table",
  "statement": "ALTER TABLE users ADD COLUMN role TEXT",
  "category": "schema_change"
}

→ severity: high
→ requires_approval: true
→ rollback_ref: snapshot stored`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
