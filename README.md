# ForgeGuard

**The reliability & observability control plane for agent-built backends on InsForge.**

> An AI agent can ship a full-stack app in minutes — and drop your production
> table in seconds. ForgeGuard is the seatbelt.

[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)

ForgeGuard intercepts backend operations proposed by coding agents before they
touch InsForge. Every op is classified, logged, and either auto-allowed or held
for human review.

| Capability | Description |
|------------|-------------|
| Audit trail | Who proposed what, when, with severity and rationale |
| Guardrails | Deterministic prefilter → LLM classifier → operator gate |
| Dashboard | Live audit log with approve, reject, and rollback |
| Rollback | One-click revert of applied ops *(simulated in this build)* |

Built with **Next.js 15** · targets **InsForge** · deploys on **Vercel**

## How it works

```
  Agent                    ForgeGuard                  InsForge
    │                          │                          │
    │   POST /api/guard/op     │                          │
    └─────────────────────────►│                          │
                               │  prefilter → classifier  │
                               │                          │
              auto_allowed ────┼─────────────────────────►│
                               │                          │
              pending ─────────┼──► Operator ── approve ─►│
```

Supported operation types: `db.migration` · `function.deploy` · `storage.config` · `auth.config`

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables
required — the default in-memory store and heuristic classifier work out of the box.

## API

**Submit a proposed operation** (agent chokepoint):

```bash
curl -X POST http://localhost:3000/api/guard/op \
  -H 'content-type: application/json' \
  -d '{
    "operation_type": "db.migration",
    "statement": "ALTER TABLE users DROP COLUMN last_login;",
    "agent": "claude-code",
    "target": "users",
    "context": { "table": "users", "row_count": 5, "environment": "production" }
  }'
```

| Status | Meaning |
|--------|---------|
| **200** | `auto_allowed` — logged, no human gate |
| **202** | `pending` — blocked until an operator approves |

When blocked, the response includes `rationale`, `blast_radius`, and a
`safer_alternative` (e.g. soft-delete via `deleted_at` instead of `DROP COLUMN`).

**Review the audit log:**

```bash
curl http://localhost:3000/api/actions
```

**Approve, reject, or rollback:**

```bash
curl -X PATCH http://localhost:3000/api/actions/<id> \
  -H 'content-type: application/json' \
  -d '{ "decision": "approve", "reviewed_by": "operator" }'
```

`decision` is `approve` · `reject` · `rollback`

## Configuration

Copy `.env.example` to `.env.local`. All variables are optional for local use.

| Variable | Purpose |
|----------|---------|
| `FORGEGUARD_STORE` | `memory` (default) or `insforge` |
| `INSFORGE_URL` / `INSFORGE_KEY` | InsForge project credentials |
| `OPENROUTER_API_KEY` | Layer 2 LLM classifier |
| `INSFORGE_MODEL_GATEWAY_URL` | Gateway base URL (default: OpenRouter) |
| `FORGEGUARD_MODEL` | Model id for classifier |
| `FORGEGUARD_OPERATOR_TOKEN` | Require token on POST/PATCH routes |
| `FORGEGUARD_BASE_URL` | Target URL for `seed` / `e2e` scripts |

Apply `sql/schema.sql` to your InsForge project before setting
`FORGEGUARD_STORE=insforge`.

When `FORGEGUARD_OPERATOR_TOKEN` is set, send `Authorization: Bearer <token>`
or `x-forgeguard-token: <token>` on mutation requests.

## For coding agents

Do **not** apply database migrations, deploy functions, or change storage/auth
config directly on InsForge. POST every proposed change to `/api/guard/op` first,
then:

1. If `auto_allowed` — proceed with the apply.
2. If `pending` — stop, surface `rationale` and `safer_alternative` to the
   operator, and wait for approval via the dashboard or review API.

## Development

```bash
npm test              # unit tests
npm run e2e           # end-to-end guard flow (dev server required)
npm run precommit     # typecheck + lint + test + build
```

## Project layout

```
app/api/guard/op/   Chokepoint — agents POST here
app/api/actions/    Audit log + review endpoints
app/page.tsx        Dashboard
lib/prefilter.ts    Layer 1 rules
lib/classifier.ts   Layer 2 LLM / heuristic
lib/guard.ts        Orchestration
lib/store.ts        Memory or InsForge REST persistence
sql/schema.sql      Postgres schema for InsForge persistence
```

## Deploy

```bash
vercel link && vercel --prod
```

Set environment variables in the Vercel dashboard (see `.env.example`).

## License

MIT — see [LICENSE](./LICENSE).
