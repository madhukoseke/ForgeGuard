# Show HN — ForgeGuard

**Title:** Show HN: ForgeGuard – the seatbelt between AI agents and your database

**URL:** https://github.com/madhukoseke/ForgeGuard

---

## Post body (copy/paste)

An AI agent can ship a full-stack app in minutes — and drop your production table in seconds.

**ForgeGuard** is the open-source guardrail layer between AI agents and your data. Agents connect via MCP (or HTTP) as their database tool. Every query and write passes through:

1. **Policy + injection scan** — denied tables, masked PII, inbound/outbound prompt-injection checks
2. **Deterministic prefilter + classifier** — DROP/TRUNCATE/unconditional DELETE held with a safer alternative
3. **Operator gate** — approve, reject, or one-click rollback from the dashboard

Works with any Postgres, [InsForge](https://insforge.dev), or a zero-credential in-memory demo.

### Demo flow (90 seconds)

An agent proposes `ALTER TABLE users DROP COLUMN last_login`.

- ForgeGuard returns **pending** with rationale and a soft-delete alternative
- Operator reviews on the dashboard
- Approve → apply with compensating rollback snapshot
- Rollback → inverse SQL reverts the change

### Try it locally (no credentials)

```bash
git clone https://github.com/madhukoseke/ForgeGuard.git
cd ForgeGuard && npm install && npm run dev
```

Open http://localhost:3000/dashboard — press **D** for the cinematic demo.

```bash
npm run demo:e2e   # headless verification of the same flow
```

Wire an agent: [docs/MCP_SETUP.md](./MCP_SETUP.md)

### Stack

Next.js · MCP server (`forgeguard-mcp`) · Postgres / InsForge / memory backends

Would love feedback on the guard pipeline and what ops you'd want gated next.

---

## First comment (optional)

Happy to walk through the architecture or live demo. Data path: MCP `query` / `execute` (or `POST /api/guard/query|execute`). Backend-change ops: `POST /api/guard/op`. Agents should never talk to the database directly.

Start here: demo → [MCP setup](./MCP_SETUP.md) → [Postgres](./POSTGRES_QUICKSTART.md) / [InsForge](./INSFORGE_QUICKSTART.md) → [Deploy](./DEPLOYMENT.md)
