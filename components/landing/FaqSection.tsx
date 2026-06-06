const FAQS = [
  {
    q: "Do I need InsForge?",
    a: "No. The dashboard works offline with a simulated executor. Connect InsForge when you're ready for live execution.",
  },
  {
    q: "How does rollback work?",
    a: "ForgeGuard captures inverse SQL before executing schema changes. Rolling back replays that statement.",
  },
  {
    q: "What requires approval?",
    a: "Severity, blast radius, and action type. DROP statements and high-risk schema changes always queue for review.",
  },
];

export default function FaqSection() {
  return (
    <section className="border-t border-border py-32 md:py-40">
      <div className="mx-auto max-w-2xl space-y-12 px-6">
        {FAQS.map((item) => (
          <div key={item.q}>
            <h3 className="text-[17px] font-medium">{item.q}</h3>
            <p className="mt-2 text-[17px] leading-relaxed text-muted">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
