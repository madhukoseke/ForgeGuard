const STEPS = [
  {
    step: "01",
    title: "Agent submits an operation",
    description:
      "Your agent calls the guard endpoint with the SQL statement, action type, and metadata about the target resource.",
  },
  {
    step: "02",
    title: "ForgeGuard classifies risk",
    description:
      "Deterministic rules and optional LLM analysis assign severity, blast radius, and whether approval is required.",
  },
  {
    step: "03",
    title: "Operator reviews or auto-executes",
    description:
      "Safe operations run immediately. High-risk changes queue for human approval in the operator dashboard.",
  },
  {
    step: "04",
    title: "Execute with rollback ready",
    description:
      "Approved ops execute against InsForge. Inverse SQL is captured so you can roll back if something goes wrong.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">
            Four steps from agent intent to guarded execution.
          </h2>
        </div>

        <div className="mt-16 space-y-0 divide-y divide-border border-y border-border">
          {STEPS.map((item) => (
            <article
              key={item.step}
              className="grid gap-6 py-10 md:grid-cols-[80px_1fr_1.2fr] md:items-start md:gap-12"
            >
              <span className="font-mono text-sm text-subtle">{item.step}</span>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
