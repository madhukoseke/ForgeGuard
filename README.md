# ForgeGuard

**The reliability & observability control plane for agent-built backends on InsForge.**

> An AI agent can ship a full-stack app in minutes — and drop your production
> table in seconds. ForgeGuard is the seatbelt.

[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)

When a coding agent (Claude Code, Devin, or a Replicas background agent) builds
or modifies an app on InsForge, ForgeGuard sits in the loop:

- **Audit trail** — every backend action logged with who/what/when/severity.
- **Guardrails** — 3-layer guard: deterministic filter → LLM risk classifier → human approval.
- **One-click rollback** — revert applied ops (simulated in this demo; InsForge preview branches next).
- **Live dashboard** — built on Next.js, deployable on Vercel.

InsForge makes agents 1.7× more accurate. ForgeGuard makes them *safe*.

## Stack

| Layer | Technology |
|-------|------------|
| Backend / DB / AI gateway | [InsForge](https://insforge.dev) |
| Dashboard + guard API | Next.js 15 |
| Deployment | [Vercel](https://vercel.com) |
| Background agents (demo) | Replicas, Devin labels in audit log |
| Mobile approvals (stretch) | [Limrun](https://lim.run) |

## Architecture

```
Agent proposes op → POST /api/guard/op
  → Layer 1: deterministic prefilter (regex rules)
  → Layer 2: LLM classifier (InsForge Model Gateway, heuristic fallback)
  → Write agent_actions audit row
  → pending (blocked) or auto_allowed
  → Human approve / reject / rollback via dashboard
```

See [CHECKLIST_STATUS.md](./CHECKLIST_STATUS.md) for what's implemented vs pending.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Works with **zero env vars** (in-memory store).

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

## Useful scripts

```bash
npm run typecheck
npm run lint
npm test
npm run e2e          # requires npm run dev in another terminal
npm run seed         # seed demo actions into a running app
npm run precommit    # run before every git push (mirrors CI)
```

See [COMMIT_CHECKLIST.md](./COMMIT_CHECKLIST.md) for the full hackathon commit
and submission checklist.

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
`Authorization: Bearer <token>` or `x-forgeguard-token: <token>`. The dashboard
prompts for the token on first protected mutation.

## Agent instructions

Coding agents must route backend changes through ForgeGuard — see [CLAUDE.md](./CLAUDE.md).
InsForge SDK patterns are in [AGENTS.md](./AGENTS.md).

## Demo script (90 seconds)

1. Run **Drop last_login column** → dashboard shows **HIGH / data_loss**, blocked.
2. Show **safer alternative**: soft-delete via `deleted_at`.
3. Run **Safer alternative** chip → approve → `applied`.
4. Run a bad op → **Rollback** → `rolled_back`.

Use dashboard chips or `npm run seed` to populate the audit trail.

## Current limitations

- Backend apply/rollback are **simulated** status transitions (Commit 7).
- InsForge persistence is coded but needs a live project + env vars (Commit 6).
- Replicas / Limrun / drift detection are stretch goals.

## Deploy to Vercel

```bash
vercel link
vercel --prod
```

Set env vars in the Vercel dashboard (see `.env.example`). Add the production
URL here once deployed:

```
Live demo: (pending — run vercel --prod)
```
