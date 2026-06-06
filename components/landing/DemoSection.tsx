import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DemoSection() {
  return (
    <section id="demo" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid md:grid-cols-2">
            <div className="flex flex-col justify-center p-10 md:p-14">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                Live demo
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground">
                Try the operator dashboard.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Run simulated agent operations, review pending approvals, and
                test rollbacks — no InsForge credentials required.
              </p>
              <Link
                href="/dashboard"
                className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Launch dashboard
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="border-t border-border bg-background p-6 md:border-l md:border-t-0">
              <div className="space-y-3">
                {[
                  { label: "ALTER TABLE users ADD role", status: "Pending", risk: "high" },
                  { label: "CREATE INDEX idx_orders_user", status: "Auto allowed", risk: "low" },
                  { label: "DROP TABLE temp_sessions", status: "Rejected", risk: "critical" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs text-foreground">
                        {item.label}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          item.risk === "critical" || item.risk === "high"
                            ? "bg-danger-muted text-danger"
                            : item.risk === "low"
                              ? "bg-success-muted text-success"
                              : "border border-border text-muted"
                        }`}
                      >
                        {item.risk}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-subtle">{item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
