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
| Rollback | One-click revert via compensating migrations or InsForge preview branches |

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

## Try the demo

Open the [operator dashboard](http://localhost:3000/dashboard). No credentials needed.

| Action | How |
|--------|-----|
| **Run demo** | Click **Run demo** or press `D` — automated 6-scene flow (block → approve → rollback → auto-allow → reject) |
| Simulate ops | Click simulator chips or press `1`–`8` |
| Seed all | Press `S` or use **Seed all** |
| Reset trail | Press `X` |

Recording script for Memoir / Show HN / README GIF: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)

Verify headless:

```bash
npm run demo:e2e   # cinematic dashboard flow (all 6 scenes)
npm run e2e        # guard API flow including reject
```

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
| **200** | `applied` — auto-allowed and applied on InsForge (or simulated locally) |
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
| `FORGEGUARD_EXECUTOR` | `simulated` (default), `insforge` (raw SQL), or `migrations` (tracked) |
| `FORGEGUARD_BRANCH_MODE` | Set to `cli` locally for preview-branch rollback (not on Vercel) |
| `INSFORGE_URL` / `INSFORGE_KEY` | InsForge project credentials |
| `OPENROUTER_API_KEY` | Layer 2 LLM classifier |
| `INSFORGE_MODEL_GATEWAY_URL` | Gateway base URL (default: OpenRouter) |
| `FORGEGUARD_MODEL` | Model id for classifier |
| `FORGEGUARD_OPERATOR_TOKEN` | Require token on POST/PATCH routes |
| `FORGEGUARD_BASE_URL` | Target URL for `seed` / `e2e` scripts |
| `REPLICAS_WEBHOOK_SECRET` | Verify Replicas webhook signatures |
| `LIM_API_KEY` / `LIMRUN_INSTANCE_ID` | Limrun mobile preview for pending ops |
| `MEMOIR_WEBHOOK_URL` | Optional outbound events when Memoir API access granted |

Bootstrap your linked InsForge project (applies `sql/schema.sql` via migration API):

```bash
npm run bootstrap:insforge
```

Then set `FORGEGUARD_STORE=insforge` and `FORGEGUARD_EXECUTOR=insforge` in `.env.local`.

When `FORGEGUARD_OPERATOR_TOKEN` is set, send `Authorization: Bearer <token>`
or `x-forgeguard-token: <token>` on mutation requests.

## For coding agents

Do **not** apply database migrations, deploy functions, or change storage/auth
config directly on InsForge. POST every proposed change to `/api/guard/op` first,
then:

1. If `applied` — the op was auto-allowed and applied (or proceed if you orchestrate apply yourself in simulated mode).
2. If `pending` — stop, surface `rationale` and `safer_alternative` to the
   operator, and wait for approval via the dashboard or review API.

## Integrations

### InsForge (core)

Set `FORGEGUARD_EXECUTOR=insforge` with credentials to apply migrations, storage,
auth, and function deploys on approve. Rollback uses compensating SQL snapshots or
optional CLI branches (`FORGEGUARD_BRANCH_MODE=cli`). Check `GET /api/health`.

### Replicas ([tryreplicas.com](https://tryreplicas.com/))

Background coding agents should POST proposed ops before touching InsForge.
Full environment setup: [docs/REPLICAS.md](./docs/REPLICAS.md).

Webhook endpoint: `POST /api/webhooks/replicas`

### Limrun ([lim.run](https://lim.run/))

When `LIM_API_KEY` or `LIMRUN_INSTANCE_ID` is set, pending ops at medium+
severity receive a signed stream URL in the dashboard for mobile operator review.

### Memoir ([trymemoir.ai](https://www.trymemoir.ai/))

No public API — partnership and release artifacts: [docs/MEMOIR.md](./docs/MEMOIR.md),
[CHANGELOG.md](./CHANGELOG.md).

## Development

```bash
npm test                      # unit tests (simulated executor)
npm run e2e                   # end-to-end guard flow (spawns dev server)
npm run demo:e2e              # cinematic dashboard demo (6 scenes)
npm run bootstrap:insforge    # apply schema to linked InsForge project
npm run integration:insforge  # live InsForge connectivity check
npm run precommit             # typecheck + lint + test + build
```

## Project layout

```
app/(marketing)/page.tsx   Landing page
app/dashboard/page.tsx     Operator dashboard + demo simulator
app/api/guard/op/          Chokepoint — agents POST here
app/api/actions/           Audit log + review endpoints
app/api/demo/              Demo seed/reset/run canned ops
lib/prefilter.ts           Layer 1 rules
lib/classifier.ts          Layer 2 LLM / heuristic
lib/guard.ts               Orchestration + auto-apply
lib/executor.ts            InsForge apply/rollback (REST + optional CLI branches)
lib/insforge-executor.ts   Public executor re-exports
lib/insforge-client.ts     InsForge Admin REST client
lib/replicas.ts            Replicas webhook helpers
lib/limrun.ts              Limrun preview URLs
lib/memoir-events.ts       Optional Memoir outbound events
lib/store.ts               Memory or InsForge REST persistence
app/api/webhooks/replicas/ Replicas event ingestion
docs/DEMO_SCRIPT.md        Screen recording checklist
docs/design/               UI reference prototypes (excluded from root build)
docs/REPLICAS.md           Replicas environment setup
docs/MEMOIR.md             Memoir partnership guide
sql/schema.sql             Postgres schema for InsForge persistence
```

## Deploy

```bash
vercel link && vercel --prod
```

Set environment variables in the Vercel dashboard (see `.env.example`).

## License

MIT — see [LICENSE](./LICENSE).
