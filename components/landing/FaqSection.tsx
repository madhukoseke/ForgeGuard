const FAQS = [
  {
    q: "Do I need InsForge to use ForgeGuard?",
    a: "No. The dashboard runs in offline demo mode with an in-memory store and simulated executor. Connect InsForge when you're ready for live execution.",
  },
  {
    q: "How does rollback work?",
    a: "Before executing destructive or schema-changing operations, ForgeGuard captures inverse SQL. Rolling back replays that inverse statement against your backend.",
  },
  {
    q: "Can agents bypass the guard?",
    a: "ForgeGuard is designed as a control plane layer. Route all agent database operations through the guard endpoint so every change is audited and classified.",
  },
  {
    q: "What triggers human approval?",
    a: "Severity, blast radius, and action category determine approval requirements. DROP statements, production schema changes, and high blast-radius ops always queue for review.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">
            Common questions.
          </h2>
        </div>

        <dl className="mt-16 divide-y divide-border border-y border-border">
          {FAQS.map((item) => (
            <div key={item.q} className="py-8">
              <dt className="text-base font-medium text-foreground">{item.q}</dt>
              <dd className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
