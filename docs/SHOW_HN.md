# Show HN — ForgeGuard

**Title:** Show HN: ForgeGuard – a Postgres schema guard that reads like a code review

**URL:** https://github.com/madhukoseke/ForgeGuard

---

## Post body (copy/paste)

An AI agent can ship a full-stack app in minutes — and drop your production table in seconds.

**ForgeGuard** is a control plane for agent-built backends on [InsForge](https://insforge.dev). Every proposed migration, function deploy, storage change, or auth config passes through:

1. **Deterministic prefilter** — DROP TABLE, unconditional DELETE, RLS disable, public buckets
2. **LLM classifier** — severity, blast radius, safer alternative
3. **Operator gate** — approve, reject, or one-click rollback

### Demo flow (90 seconds)

Replicas proposes `ALTER TABLE users DROP COLUMN last_login` on a 5-row table.

- ForgeGuard returns **202 pending** with rationale and a soft-delete alternative
- Operator reviews on the dashboard (optional Limrun mobile preview)
- Approve → InsForge applies with compensating rollback snapshot
- Rollback → inverse SQL reverts the change

### Try it locally (no credentials)

```bash
git clone https://github.com/madhukoseke/ForgeGuard.git
cd ForgeGuard && npm install && npm run dev
```

Open http://localhost:3000 — landing page + operator dashboard with simulated ops.

```bash
npm run e2e   # full approve / reject / rollback flow
```

### Stack

Next.js 15 · InsForge REST · optional Replicas / Limrun / Memoir hooks

Would love feedback on the guard pipeline and what ops you'd want gated next.

---

## First comment (optional)

Happy to walk through the architecture or live demo. The guard chokepoint is a single endpoint: `POST /api/guard/op`. Agents should never touch InsForge directly.

Integration guides: [docs/REPLICAS.md](./REPLICAS.md) · [docs/MEMOIR.md](./MEMOIR.md)
