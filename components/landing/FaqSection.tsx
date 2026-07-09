const FAQS = [
  {
    q: "What is ForgeGuard?",
    a: "An open-source guardrail layer between AI agents and your data. Agents talk to your database only through ForgeGuard — every query and write is audited, scanned for injection, and held for approval when it's destructive.",
  },
  {
    q: "How do agents connect?",
    a: "Point Claude Desktop, Cursor, or any MCP client at the forgeguard-mcp server (query / execute tools). HTTP-only agents can call POST /api/guard/query, /api/guard/execute, or /api/guard/op instead.",
  },
  {
    q: "Do I need InsForge?",
    a: "No. Any Postgres works, and the dashboard runs with a zero-credential in-memory demo. InsForge is an optional backend when you want live migrations, functions, storage, and auth config guarded the same way.",
  },
  {
    q: "How does rollback work?",
    a: "ForgeGuard captures inverse SQL before applying schema changes. Rolling back from the dashboard replays that compensating statement.",
  },
  {
    q: "What requires approval?",
    a: "Severity, blast radius, and action type. DROP statements and other high-risk changes always queue for review; safe reads and bounded writes can auto-allow.",
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
