const ITEMS = [
  {
    title: "Classify and hold destructive ops",
    body: "DROP, TRUNCATE, and other high-blast-radius changes get a severity score, rationale, and a concrete safer alternative — then wait for a human.",
  },
  {
    title: "Scan for prompt injection both ways",
    body: "Inbound tool args are checked before they reach your database. Query results are scanned and poisoned cells redacted before they return to the agent.",
  },
  {
    title: "Approve, reject, or roll back",
    body: "Every request lands in an audit trail. Approve with the safer fix, reject outright, or undo an applied change with one-click compensating SQL.",
  },
];

const STEPS = [
  "Agent connects to ForgeGuard as its database tool (MCP or HTTP)",
  "Guard pipeline: policy → injection scan → classify → apply or hold",
  "Operator reviews pending ops — approve, reject, or roll back",
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
