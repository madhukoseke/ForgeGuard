# ForgeGuard

**The reliability & observability control plane for agent-built backends on InsForge.**

> An AI agent can ship a full-stack app in minutes — and drop your production
> table in seconds. ForgeGuard is the seatbelt.

[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)

When a coding agent (Claude Code, Devin, or a Replicas background agent) builds
or modifies an app on InsForge, ForgeGuard sits in the loop:

- **Audit trail** — every backend action logged with who/what/when/severity.
- **Guardrails** — deterministic prefilter → LLM risk classifier → human approval.
- **One-click rollback** — revert applied ops (simulated in this demo; InsForge preview branches next).
- **Live dashboard** — Next.js app, deployable on Vercel.

## Architecture

```
Agent proposes op → POST /api/guard/op
  → Layer 1: deterministic prefilter (regex rules)
  → Layer 2: LLM classifier (InsForge Model Gateway, heuristic fallback)
  → Write agent_actions audit row
  → pending (blocked) or auto_allowed
  → Human approve / reject / rollback via dashboard
```

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Works with **zero env vars** (in-memory store).

## Try the guard API

```bash
curl -X POST http://localhost:3000/api/guard/op \
  -H 'content-type: application/json' \
  -d '{
    "operation_type": "db.migration",
    "statement": "ALTER TABLE users DROP COLUMN last_login;",
    "context": { "table": "users", "row_count": 5, "environment": "production" }
  }'
```

Risky operations return **202** with `requires_approval: true`. Safe operations
return **200** and `status: "auto_allowed"`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dashboard + API |
| `npm test` | Run unit tests (18) |
| `npm run e2e` | End-to-end guard flow (dev server required) |
| `npm run seed` | Seed demo actions into a running app |
| `npm run precommit` | typecheck + lint + test + build (mirrors CI) |

## Environment

Copy `.env.example` to `.env.local` and fill in only what you need.

| Variable | Purpose |
|----------|---------|
| `FORGEGUARD_STORE` | `memory` (default) or `insforge` |
| `INSFORGE_URL` / `INSFORGE_KEY` | InsForge project + admin key |
| `OPENROUTER_API_KEY` | Layer 2 LLM classifier (via OpenRouter) |
| `INSFORGE_MODEL_GATEWAY_URL` | Override gateway base URL |
| `FORGEGUARD_OPERATOR_TOKEN` | Protect POST/PATCH mutation routes |
| `FORGEGUARD_BASE_URL` | Target URL for `seed` / `e2e` scripts |

Apply `sql/schema.sql` to your InsForge project before switching to
`FORGEGUARD_STORE=insforge`.

When `FORGEGUARD_OPERATOR_TOKEN` is set, clients must send either
`Authorization: Bearer <token>` or `x-forgeguard-token: <token>`.

## Agent integration

Coding agents must **not** apply backend changes directly on InsForge. Route every
proposed operation through the guard chokepoint first:

```http
POST /api/guard/op
Content-Type: application/json

{
  "operation_type": "db.migration",
  "statement": "ALTER TABLE users DROP COLUMN last_login;",
  "agent": "claude-code",
  "session_id": "<session-id>",
  "target": "users",
  "context": {
    "table": "users",
    "row_count": 5,
    "has_rls": true,
    "environment": "production"
  }
}
```

Supported `operation_type` values: `db.migration`, `function.deploy`,
`storage.config`, `auth.config`.

- **200** — `auto_allowed`: low-risk; logged, no human gate.
- **202** — `pending`: stop and wait for operator approval in the dashboard or via `PATCH /api/actions/<id>`.

If blocked, prefer the `safer_alternative` from the response over the original statement.

## Demo (90 seconds)

1. Run **Drop last_login column** → dashboard shows **HIGH / data_loss**, blocked.
2. Show **safer alternative**: soft-delete via `deleted_at`.
3. Run **Safer alternative** chip → approve → `applied`.
4. Run a bad op → **Rollback** → `rolled_back`.

Use dashboard chips or `npm run seed` to populate the audit trail.

## Stack

| Layer | Technology |
|-------|------------|
| Backend / DB / AI gateway | [InsForge](https://insforge.dev) |
| Dashboard + guard API | Next.js 15 |
| Deployment | [Vercel](https://vercel.com) |

## Project layout

```
app/
  api/guard/op/     Guard chokepoint
  api/actions/      Audit log + review (approve/reject/rollback)
  page.tsx          Dashboard
lib/
  prefilter.ts      Layer 1 deterministic rules
  classifier.ts     Layer 2 LLM / heuristic classifier
  guard.ts          Orchestration
  store.ts          Memory or InsForge REST persistence
sql/schema.sql      InsForge Postgres schema
tests/              Unit tests
scripts/            seed + e2e helpers
```

## Deploy to Vercel

```bash
vercel link
vercel --prod
```

Set env vars in the Vercel dashboard (see `.env.example`).

## License

MIT — see [LICENSE](./LICENSE).
