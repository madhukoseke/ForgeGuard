# ForgeGuard release notes

Structured artifacts for Memoir ([trymemoir.ai](https://www.trymemoir.ai/)) and other distribution channels.

## Format

Each guarded operation that reaches `applied` status should appear here with:

- `#forgeguard-approved` or `#forgeguard-blocked` tag
- Severity, agent, and one-line rationale
- Link to PR (when Replicas enrichment provides `pr_urls`)

---

## [0.2.0] — 2026-06-06

### Added

- **Live executor** for `function.deploy`, `storage.config`, and `auth.config` via InsForge admin REST
- **Self-contained e2e** — spawns simulated dev server (`npm run e2e`)
- **Distribution artifacts** — [docs/SHOW_HN.md](./docs/SHOW_HN.md), [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)
- **UI polish** — Geist font, landing fade animations, light/dark theme toggle

### Changed

- `auth.config` SQL statements (e.g. DISABLE RLS) use compensating SQL rollback
- `storage.config` JSON payloads toggle bucket visibility with snapshot rollback
- `function.deploy` JSON payloads create/update edge functions with code snapshot rollback

---

## [0.3.0] — 2026-06-13

### Added

- **Data guard MCP tools** — `data.query` and `data.execute` with policy, injection scanning, and audit trail
- **HTTP data routes** — `/api/guard/query` and `/api/guard/execute` mirror MCP behavior
- **Prompt-injection defense** — bidirectional scanning with optional LLM layer (`FORGEGUARD_INJECTION_LLM`)
- **Cinematic demo** — **Run demo** (`D`) covers 6 scenes; `npm run demo:e2e` in CI
- **Replicas webhook** — `POST /api/webhooks/replicas` enriches audit rows with `replica_id` and `pr_urls`
- **Limrun mobile preview** — signed stream URL for pending medium+ ops when configured
- **Open-source readiness** — community files, docs, CI hardening, schema drift tests, npm packaging
- **Next.js 16** — upgraded with clean production dependency audit

### Changed

- **InsForge bootstrap** — loads canonical [`sql/schema.sql`](./sql/schema.sql) (supports `data.query`, `data.execute`, `injection_findings`, `transport`)
- **InsForge executor** — real apply/rollback via admin REST when `FORGEGUARD_EXECUTOR=insforge`; simulated by default

### Security

- Operator token required in production; timing-safe token comparison
- Security headers: CSP, HSTS, Permissions-Policy
- Rate limiting on guard mutations and demo POST
- Advisory `/api/readiness` endpoint for deployment checks

#forgeguard-approved Safe migrations auto-apply through the guard pipeline with compensating rollback snapshots stored in the audit trail.

#forgeguard-blocked Destructive ops (DROP TABLE, unconditional DELETE, RLS disable) pause at `pending` with rationale and safer alternatives surfaced to the operator.

---

## Unreleased

### Fixed

- **`/api/health` store field** — report resolved `postgres` / `insforge` / `memory` instead of always `memory` when not on InsForge
- **`/api/readiness`** — report resolved `store` / `backend`; honor `FORGEGUARD_DATABASE_URL` in postgres credential checks
- **Postgres env helper** — shared `postgresConnectionUrl()` for store, backend, and readiness probes
- **`/api/health` connectivity** — `store_reachable` and `backend_reachable` probe the active store and data backend; `/api/readiness` includes the same runtime checks in `ready` / `warnings`
- **Docker Compose app healthcheck** — `docker compose` waits for `/api/health?minimal=1` before marking the app healthy
- **Health status helper** — shared `getHealthStatus()` powers `/api/health`; readiness warns when `FORGEGUARD_EXECUTOR=insforge` lacks credentials
- **Readiness status helper** — shared `getReadinessStatus()` powers `/api/readiness`; warns when InsForge executor is configured but unreachable
- **Dashboard connection status** — reflects Postgres, degraded readiness, and InsForge states from `/api/health`
- **API version field** — `/api/health` and `/api/readiness` include `version` from `package.json`
- **Dashboard polling** — slows action refresh when health is degraded or Postgres/InsForge is unreachable; health fetch interval adapts too
- **Turbopack workspace root** — pin project root in `next.config.js` so `npm run dev` does not infer a parent lockfile directory
- **Postgres quick start** — align Docker Compose docs with root `docker-compose.yml` credentials

### Docs

- Development workflow, `FORGEGUARD_STRICT_CONFIG`, and local troubleshooting in README / CONTRIBUTING / TROUBLESHOOTING
- Docker deployment guide, readiness strict-mode behavior, and agent onboarding pointers in DEPLOYMENT / OBSERVABILITY / AGENTS
- Threat model and troubleshooting cover `/api/readiness`, Docker Compose credentials, and contributor Postgres setup

### Distribution recording

- Follow [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) to capture MP4/GIF; add to `docs/assets/` and link from README when ready.

---

## Demo story (Memoir / Show HN)

**Title:** A Postgres schema guard that reads like a code review

**Hook:** Replicas proposes `ALTER TABLE users DROP COLUMN last_login` on a 5-row production table. ForgeGuard blocks at medium+, suggests soft-delete via `deleted_at`, and holds for operator approval. Operator reviews on Limrun mobile preview, approves, InsForge applies with compensating rollback snapshot.

**Artifacts Memoir can consume:**

1. This CHANGELOG entry
2. PR description template in [docs/MEMOIR.md](./docs/MEMOIR.md)
3. Screen recording of dashboard approve flow + rollback
