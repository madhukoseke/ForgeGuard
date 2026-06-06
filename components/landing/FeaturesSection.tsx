const FEATURES = [
  {
    title: "Policy guard",
    description:
      "Every operation is classified by severity and blast radius before it executes. High-risk changes require human approval.",
  },
  {
    title: "Audit trail",
    description:
      "Full history of agent actions with rationale, source classification, and timestamps. Nothing happens in the dark.",
  },
  {
    title: "One-click rollback",
    description:
      "Approved changes store inverse SQL snapshots. Roll back destructive operations without manual recovery.",
  },
  {
    title: "Branch isolation",
    description:
      "Route agent work through InsForge branches. Preview replicas and PR links before merging to production.",
  },
  {
    title: "Live observability",
    description:
      "Real-time dashboard with pending reviews, risk posture, and connection health to your InsForge backend.",
  },
  {
    title: "Deterministic + LLM",
    description:
      "Hybrid classification engine. Rule-based guards for known patterns, LLM fallback for novel operations.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">
            Everything you need to trust agent-built backends.
          </h2>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="bg-background p-8 transition-colors hover:bg-surface"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
