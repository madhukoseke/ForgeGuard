# ForgeGuard

[![CI](https://github.com/madhukoseke/ForgeGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/madhukoseke/ForgeGuard/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/madhukoseke/ForgeGuard)](LICENSE)
[![npm version](https://img.shields.io/npm/v/forgeguard?label=npm)](https://www.npmjs.com/package/forgeguard)
[![Node](https://img.shields.io/node/v/forgeguard)](https://www.npmjs.com/package/forgeguard)

**The open-source guardrail layer between AI agents and your data.**

> An AI agent can ship a full-stack app in minutes — and drop your production table in seconds. **ForgeGuard is the seatbelt.**

Agents connect to ForgeGuard as their database tool (MCP). Every query and every write flows through a guard pipeline: policy checks, bidirectional prompt-injection scanning, destructive-statement classification with safer alternatives, and a full audit trail with human-in-the-loop approval.

[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)

---

## Contents

- [What it does](#what-it-does)
- [What is stable in 0.3.0](#what-is-stable-in-030)
- [Architecture](#architecture)
- [Quick start: MCP server](#quick-start-mcp-server)
- [Quick start: dashboard](#quick-start-dashboard)
- [MCP tools](#mcp-tools)
- [Prompt-injection scanning](#prompt-injection-scanning)
- [Read-side policies](#read-side-policies)
- [Guard pipeline](#guard-pipeline)
- [HTTP API reference](#http-api-reference)
- [Configuration](#configuration)
- [Production deployment](#production-deployment)
- [For coding agents](#for-coding-agents)
- [Integrations](#integrations)
- [Development](#development)
- [Documentation](#documentation)
- [Project layout](#project-layout)

---

## What it does

| Capability | What you get |
|------------|--------------|
| **Middle layer (MCP)** | Agents read/write your database only through ForgeGuard's MCP tools |
| **Audit trail** | Every request — including reads — logged with severity, rationale, blast radius |
| **Prompt-injection defense** | Inbound args scanned; query results scanned and poisoned cells redacted |
| **Destructive-query detection** | `DROP`/`TRUNCATE`/unconditional `DELETE` held for approval with a concrete safer alternative |
| **Data safeguards** | Denied tables, masked PII columns, row caps — enforced before SQL reaches the database |
| **Rollback** | Compensating SQL snapshots; one-click rollback from the dashboard |

**Backends:** any Postgres (`DATABASE_URL`) · [InsForge](https://insforge.dev) · in-memory simulation (zero-credential demo)
**Op types:** `data.query` · `data.execute` · `db.migration` · `function.deploy` · `storage.config` · `auth.config`

---

## What is stable in 0.3.0

**Stable:** MCP tools, HTTP guard/actions routes, `forgeguard.config.json`, env configuration, `forgeguard-mcp` npm bin, deterministic guard pipeline, memory/postgres/insforge audit stores.

**Experimental:** InsForge live executor, Replicas/Limrun/Memoir integrations, LLM injection scan, design prototypes under `docs/design/`.

Details: [docs/STABLE_0.3.0.md](./docs/STABLE_0.3.0.md) · Threat model: [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md)

The npm package is **CLI-first**; internal `dist/lib/*` is not a supported public library API until v1.

---

## Architecture

```mermaid
flowchart LR
  Agent[AI agent / LLM app] -->|MCP tools| MCP[ForgeGuard MCP server]
  MCP --> Inbound[Inbound scan: injection + policy]
  Inbound --> Guard[Guard pipeline: prefilter + classifier]
  Guard -->|safe| Backend[DataBackend adapter]
  Guard -->|risky| Hold[Held for human approval]
  Backend --> PG[(Any Postgres)]
  Backend --> IF[(InsForge)]
  Backend --> Outbound[Outbound scan: redact poisoned rows]
  Outbound --> Agent
  Guard --> Audit[(Audit trail)]
  Hold --> Dash[Operator dashboard]
  Audit --> Dash
```

The Next.js app is the operator dashboard and HTTP chokepoint; the MCP server is a thin entry point sharing the same `lib/` guard pipeline.

---

## Quick start: MCP server

No credentials required — the default backend is an in-memory simulation with a seeded `users` table.

```bash
git clone https://github.com/madhukoseke/ForgeGuard.git
cd ForgeGuard && npm install
npm run mcp                                        # stdio, demo backend
npm run mcp -- --database-url postgres://...       # any Postgres
npm run mcp -- --http 8787                         # Streamable HTTP on :8787
```

Once published to npm it also runs without cloning: `npx forgeguard-mcp --database-url postgres://...`

### Connect Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "forgeguard": {
      "command": "npx",
      "args": [
        "forgeguard-mcp",
        "--database-url", "postgres://user:pass@localhost:5432/mydb",
        "--agent", "claude-desktop"
      ]
    }
  }
}
```

From a local clone, use `"command": "npx"`, `"args": ["tsx", "/path/to/ForgeGuard/mcp/cli.ts", ...]`.

With `--database-url`, both the data backend **and** the audit store default to that Postgres (`forgeguard_actions` table, auto-created). Run the dashboard with `FORGEGUARD_STORE=postgres` and the same `DATABASE_URL` to review/approve held ops live.

---

## Quick start: dashboard

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| [localhost:3000](http://localhost:3000) | Landing page |
| [localhost:3000/dashboard](http://localhost:3000/dashboard) | Operator dashboard + demo |

| Action | Shortcut |
|--------|----------|
| Run 6-scene cinematic demo | `D` or **Run demo** |
| Simulate canned ops | `1`–`8` or click a row |
| Seed all demo ops | `S` · Reset trail `X` |
| Approve first pending / rollback last applied | `A` / `R` |

Filter chips include **Requests** (MCP `data.*` traffic) and **Injection** (actions with injection findings). Headless verification: `npm run demo:e2e`.

![Dashboard with pending approvals](./docs/assets/screenshot-pending.png)

Capture fresh screenshots: `npm run dev` then `npm run capture:screenshots`.

---

## MCP tools

| Tool | What it does |
|------|--------------|
| `query` | Single read-only statement. Policy-checked, row-capped, results masked + injection-scanned. |
| `execute` | Write/DDL. Classified; safe ops apply instantly, risky ops are **held** and return a pending `action_id` + safer alternative. |
| `list_tables` / `describe_table` | Schema introspection (also audited). |
| `get_action_status` | Poll whether a held op was approved, rejected, applied, or rolled back. |

Example `execute` response for `DROP TABLE users;`:

```json
{
  "status": "pending",
  "severity": "critical",
  "rationale": "Dropping a table permanently destroys the table and all its rows.",
  "safer_alternative": "Rename the table to `<name>_archived` and drop it after a retention window.",
  "requires_approval": true
}
```

More examples (policy denied, injection blocked, applied, rollback): [docs/examples/MCP_RESPONSES.md](./docs/examples/MCP_RESPONSES.md).

---

## Prompt-injection scanning

Both directions of the AI–data boundary are scanned:

- **Inbound** (agent → database): tool arguments and free-text notes. High-confidence hits are blocked before any SQL reaches the database.
- **Outbound** (database → agent): query result cells. Stored injection payloads ("ignore previous instructions…", chat-template smuggling, exfiltration URLs, encoded payloads) are replaced with `[FORGEGUARD:REDACTED]` and recorded on the audit row.

Layer 1 is deterministic patterns (always on, offline). Set `FORGEGUARD_INJECTION_LLM=1` to add an LLM scan through the same model gateway as the risk classifier — it fails open to Layer 1.

---

## Read-side policies

Copy [`forgeguard.config.example.json`](./forgeguard.config.example.json) to `forgeguard.config.json` (or point `FORGEGUARD_CONFIG` at a path):

```json
{
  "denied_tables": ["api_keys", "secrets"],
  "masked_columns": ["password_hash", "users.email"],
  "max_rows": 200,
  "allowed_statements": ["select", "with", "insert", "update", "create", "alter"]
}
```

Violations are rejected before the backend is touched and logged to the audit trail.

---

## Guard pipeline

Every proposed operation follows the same path:

```mermaid
flowchart TD
  IN[MCP tool call or POST /api/guard/op] --> POL[Policy check]
  POL --> INJ[Inbound injection scan]
  INJ --> P[Layer 1 — deterministic prefilter]
  P --> C[Layer 2 — LLM or heuristic fallback]
  C --> M[Merge verdicts]
  M --> S[Save audit row]
  S --> Q{Requires approval?}
  Q -->|No| A[Apply via DataBackend]
  Q -->|Yes| W[Held — pending operator review]
  W --> O[Dashboard: approve / reject / rollback]
  O --> A
  A --> OUT[Outbound scan + masking]
```

**Safe example** — `ADD COLUMN nickname` → applied immediately.
**Risky example** — `DROP COLUMN last_login` → held with `rationale`, `blast_radius`, and `safer_alternative` until an operator approves.

---

## HTTP API reference

Agents that do not use MCP can call the same guard pipeline over HTTP.

### Read-only query (`data.query`)

```bash
curl -X POST http://localhost:3000/api/guard/query \
  -H 'content-type: application/json' \
  -d '{ "sql": "SELECT email FROM users", "max_rows": 50, "agent": "my-agent" }'
```

Returns `rows`, `row_count`, masking/redaction counts, and `injection_findings`. **200** on success, **400** when rejected (policy, injection, or non-read-only SQL).

Equivalent via the unified chokepoint:

```bash
curl -X POST http://localhost:3000/api/guard/op \
  -H 'content-type: application/json' \
  -d '{ "operation_type": "data.query", "statement": "SELECT email FROM users" }'
```

### Write / DDL (`data.execute`)

```bash
curl -X POST http://localhost:3000/api/guard/execute \
  -H 'content-type: application/json' \
  -d '{ "sql": "ALTER TABLE users ADD COLUMN nickname text;", "note": "profile field" }'
```

| HTTP | Meaning |
|------|---------|
| **200** | Auto-allowed and applied |
| **202** | Pending — includes `rationale`, `safer_alternative`, `requires_approval` |
| **400** | Rejected (policy, injection, or execution error) |

Also accepted on `POST /api/guard/op` with `"operation_type": "data.execute"`.

### Backend-change ops (`db.migration`, etc.)

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

| HTTP | Meaning |
|------|---------|
| **200** | Auto-allowed and applied (or simulated locally) |
| **202** | Pending — includes `rationale`, `blast_radius`, `safer_alternative` |

### List audit trail / review / health

```bash
curl 'http://localhost:3000/api/actions?limit=50&offset=0'
curl -X PATCH http://localhost:3000/api/actions/<id> \
  -H 'content-type: application/json' \
  -d '{ "decision": "approve", "reviewed_by": "operator" }'
curl http://localhost:3000/api/health
```

`decision` is `approve` (uses safer SQL when `apply_safer: true`), `reject`, or `rollback`.

---

## Configuration

Copy `.env.example` → `.env.local`. All variables are optional for the local demo.

<details>
<summary><strong>Environment variables</strong></summary>

| Variable | Purpose |
|----------|---------|
| `FORGEGUARD_BACKEND` | Data backend: `memory` (default), `postgres`, `insforge` |
| `DATABASE_URL` / `FORGEGUARD_DATABASE_URL` | Postgres connection string |
| `FORGEGUARD_STORE` | Audit store: `memory` (default), `postgres`, `insforge` |
| `FORGEGUARD_CONFIG` | Path to the read-side policy file |
| `FORGEGUARD_INJECTION_LLM` | `1` to enable the LLM injection scan |
| `FORGEGUARD_AGENT` | Agent label on MCP audit rows |
| `FORGEGUARD_EXECUTOR` | `simulated` (default), `insforge`, or `migrations` |
| `FORGEGUARD_BRANCH_MODE` | `cli` for preview-branch rollback (local only) |
| `INSFORGE_URL` / `INSFORGE_KEY` | InsForge project credentials |
| `OPENROUTER_API_KEY` | Layer 2 LLM classifier |
| `INSFORGE_MODEL_GATEWAY_URL` | Model gateway base (default: OpenRouter) |
| `FORGEGUARD_MODEL` | Model id for classifier |
| `FORGEGUARD_OPERATOR_TOKEN` | Protect API routes (required in production) |
| `FORGEGUARD_STRICT_CONFIG` | `1` in production: `/api/readiness` returns 503 when config is unsafe |
| `FORGEGUARD_BASE_URL` | Target URL for `seed` / E2E scripts |
| `REPLICAS_WEBHOOK_SECRET` | Verify Replicas webhook signatures |
| `LIM_API_KEY` / `LIMRUN_INSTANCE_ID` | Limrun mobile preview for pending ops |
| `MEMOIR_WEBHOOK_URL` | Optional outbound events |

</details>

**Bootstrap InsForge** (applies `sql/schema.sql`): `npm run bootstrap:insforge`, then set `FORGEGUARD_STORE=insforge` and `FORGEGUARD_EXECUTOR=insforge`.

**Auth:** when `FORGEGUARD_OPERATOR_TOKEN` is set, send `Authorization: Bearer <token>` or `x-forgeguard-token: <token>` on protected routes. In production it is required.

---

## Production deployment

1. Set **`FORGEGUARD_OPERATOR_TOKEN`** — strong secret for API and dashboard
2. Set a durable audit store — **`FORGEGUARD_STORE=postgres`** (+ `DATABASE_URL`) or **`insforge`**; memory is ephemeral on serverless
3. Set **`REPLICAS_WEBHOOK_SECRET`** if using `POST /api/webhooks/replicas`
4. For InsForge: run **`npm run bootstrap:insforge`** and set `FORGEGUARD_EXECUTOR=insforge`

```bash
vercel link && vercel --prod
```

---

## For coding agents

**Do not** run SQL, apply migrations, deploy functions, or change storage/auth config directly against the database.

1. Use the ForgeGuard MCP tools (`query`, `execute`) — or POST to **`/api/guard/op`**
2. If the response is **`applied`** — proceed
3. If **`pending`** — stop, surface `rationale` and `safer_alternative` to the operator, and poll `get_action_status` for the outcome. Never retry a held statement verbatim.

---

## Integrations

| Partner | Role | Docs |
|---------|------|------|
| **Any Postgres** | Guarded data backend + audit store | This README |
| **InsForge** | Guarded backend — apply, rollback, audit persistence | This README |
| **[Replicas](https://tryreplicas.com/)** | Background agents POST ops before backend changes | [docs/REPLICAS.md](./docs/REPLICAS.md) |
| **[Limrun](https://lim.run/)** | Mobile preview URL for pending ops (medium+ severity) | Set `LIM_API_KEY` |
| **[Memoir](https://www.trymemoir.ai/)** | Optional outbound events | [docs/MEMOIR.md](./docs/MEMOIR.md) |

---

## Development

Requires **Node.js 20+** (`package.json` `engines`).

```bash
npm install
npm run dev              # dashboard at http://localhost:3000/dashboard
npm test                 # unit tests
npm run mcp              # MCP server on stdio
npm run build:mcp        # compile MCP server to dist/
npm run e2e              # guard API E2E
npm run demo:e2e         # cinematic demo E2E
npm run clean:local      # remove .next, dist, and other local build artifacts
npm run precommit        # typecheck + lint + test + build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), and [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) if `npm run dev` mis-detects the workspace root or caches look stale.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [STABLE_0.3.0.md](./docs/STABLE_0.3.0.md) | Stable vs experimental surfaces |
| [THREAT_MODEL.md](./docs/THREAT_MODEL.md) | Limitations and security expectations |
| [MCP_SETUP.md](./docs/MCP_SETUP.md) | Claude Desktop, Cursor, HTTP transport |
| [POSTGRES_QUICKSTART.md](./docs/POSTGRES_QUICKSTART.md) | Local Postgres + Docker |
| [INSFORGE_QUICKSTART.md](./docs/INSFORGE_QUICKSTART.md) | Bootstrap and integration test |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common issues |
| [ADMIN_TOKEN.md](./docs/ADMIN_TOKEN.md) | Operator token model |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment |
| [API_STABILITY.md](./docs/API_STABILITY.md) | HTTP/MCP stability policy |
| [examples/MCP_RESPONSES.md](./docs/examples/MCP_RESPONSES.md) | Sample guard responses |
| [RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md) | Maintainer release steps |

---

## Project layout

```
mcp/
  cli.ts                    forgeguard-mcp entry (stdio + Streamable HTTP)
  server.ts                 MCP tools → guard pipeline

lib/
  backends/                 DataBackend adapters: memory · postgres · insforge
  data-guard.ts             query/execute guard flow (policy → injection → classify → audit)
  injection.ts              Bidirectional prompt-injection scanner
  policy.ts                 Read-side safeguards (forgeguard.config.json)
  prefilter.ts              Layer 1 destructive-SQL rules
  classifier.ts             Layer 2 LLM / heuristic
  guard.ts                  HTTP chokepoint orchestration
  store.ts / store-postgres.ts  Audit persistence (memory · postgres · insforge)
  executor.ts               InsForge apply / rollback

app/
  dashboard/page.tsx        Operator UI (Requests + Injection filters)
  api/guard/op/             HTTP chokepoint (backend ops + data.query/execute)
  api/guard/query/          Read-only data.query
  api/guard/execute/        Write/DDL data.execute
  api/actions/              Audit log + review
  api/demo/                 Demo seed / reset

components/dashboard/       Dashboard UI components
sql/schema.sql              Postgres schema (InsForge bootstrap)
forgeguard.config.example.json  Read-side policy template
```

---

## License

Apache-2.0 — see [LICENSE](./LICENSE).
