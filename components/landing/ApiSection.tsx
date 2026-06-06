const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/guard/op",
    description: "Submit an agent operation for classification and execution.",
  },
  {
    method: "GET",
    path: "/api/actions",
    description: "List all actions in the audit trail.",
  },
  {
    method: "PATCH",
    path: "/api/actions/:id",
    description: "Approve, reject, or roll back a pending action.",
  },
  {
    method: "GET",
    path: "/api/health",
    description: "Check store, executor, and InsForge connectivity.",
  },
];

export default function ApiSection() {
  return (
    <section id="api" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted">
              API
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">
              Simple REST interface.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Integrate ForgeGuard into your agent pipeline with a handful of
              endpoints. Authenticate operator actions with an optional bearer
              token.
            </p>

            <ul className="mt-10 space-y-6">
              {ENDPOINTS.map((ep) => (
                <li key={ep.path}>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-surface-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                      {ep.method}
                    </span>
                    <code className="font-mono text-sm text-muted">{ep.path}</code>
                  </div>
                  <p className="mt-1.5 text-sm text-subtle">{ep.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <span className="font-mono text-xs text-subtle">curl example</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-muted">
              <code>{`curl -X POST https://your-app/api/guard/op \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "deploy-bot",
    "action_type": "create_index",
    "statement": "CREATE INDEX idx ON orders(user_id)",
    "category": "schema_change"
  }'

# Response
{
  "id": "act_…",
  "severity": "low",
  "requires_approval": false,
  "status": "auto_allowed"
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
