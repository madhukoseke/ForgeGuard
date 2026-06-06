const ITEMS = [
  {
    title: "Classify every operation",
    body: "Severity and blast radius are scored before anything runs.",
  },
  {
    title: "Approve what matters",
    body: "High-risk changes wait for a human. Everything else flows through.",
  },
  {
    title: "Roll back instantly",
    body: "Inverse SQL snapshots let you undo approved changes in one step.",
  },
];

const STEPS = [
  "Agent submits an operation",
  "ForgeGuard scores the risk",
  "Safe ops run · risky ops queue for review",
];

const DELAYS = ["", "animate-fade-up-delay-1", "animate-fade-up-delay-2"] as const;

export default function ProductSection() {
  return (
    <section id="product" className="border-t border-border py-32 md:py-40">
      <div className="mx-auto max-w-2xl px-6">
        <div className="space-y-16">
          {ITEMS.map((item, i) => (
            <div key={item.title} className={`animate-fade-up ${DELAYS[i] ?? "animate-fade-up-delay-3"}`}>
              <h2 className="text-xl font-medium tracking-[-0.02em] md:text-2xl">
                {item.title}
              </h2>
              <p className="mt-3 text-[17px] leading-relaxed text-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-24 border-t border-border pt-16">
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4 text-[17px] text-muted">
                <span className="w-4 shrink-0 tabular-nums text-subtle">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
