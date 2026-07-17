# Threat model and limitations

ForgeGuard reduces risk from AI agents accessing your database. It is **not** a substitute for database security fundamentals.

## What ForgeGuard does

- Intercepts agent SQL and config operations through MCP or HTTP
- Applies deterministic destructive-statement rules and optional LLM classification
- Scans for prompt-injection patterns inbound and outbound
- Enforces read-side policy (denied tables, column masks, row caps)
- Logs every operation to an audit trail with human-in-the-loop approval for risky ops
- Supports compensating rollback snapshots for approved changes

## SQL detection (AST + regex)

Layer 1 uses **AST-backed** analysis via `pgsql-ast-parser` for common Postgres SQL (`lib/sql-ast.ts`): table refs, statement class, `DROP TABLE` / `TRUNCATE`, unconditional `DELETE`/`UPDATE` (including CTE wrappers and leading comments), `DROP COLUMN`, type changes, `ADD … NOT NULL` without default, and non-concurrent indexes.

When parse fails, ForgeGuard **falls back to regex** rules so unsupported syntax still gets a conservative scan.

### Residual risks

- **Unsupported dialect / PL/pgSQL / exotic DDL** (e.g. `DISABLE ROW LEVEL SECURITY`, `DROP POLICY`) may not parse — regex covers the known cases; novel spellings can still bypass.
- **Multi-statement tricks and dynamic SQL** (`EXECUTE format(...)`) are outside the AST surface.
- **Optional `blast_radius_probe`** runs `count(*)` on a single safe table name only; it is fail-open and can be wrong under concurrent writes.
- **Anomaly write-burst** signals are advisory (appended to rationale) and do not block by themselves.

## What ForgeGuard does not do

- **Replace database permissions** — use least-privilege DB roles, RLS, and network isolation in addition to ForgeGuard.
- **Replace backups** — maintain regular backups and tested restore procedures.
- **Replace code review** — operators should review pending ops, rationale, and safer alternatives.
- **Guarantee LLM safety** — when `FORGEGUARD_INJECTION_LLM` or the classifier LLM is enabled, failures **fail open** to deterministic rules (see [adr/001-fail-open-llm-scanning.md](./adr/001-fail-open-llm-scanning.md)).

## Memory store in production

The default **memory** audit store is ephemeral:

- Data is lost on serverless cold starts and process restarts
- Suitable for local demo (`npm run dev`, `npm run mcp`)
- **Not** suitable for production audit requirements

Use `FORGEGUARD_STORE=postgres` or `insforge` with durable credentials. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Credential fallback behavior

When `FORGEGUARD_STORE` or `FORGEGUARD_BACKEND` is explicitly `postgres` or `insforge` but credentials are missing, ForgeGuard **refuses to start that path** (throws; no silent memory fallback). Use `memory` (or unset) for the zero-credential demo. In production, `/api/readiness` returns **503** by default when config is unsafe (`FORGEGUARD_STRICT_CONFIG` defaults on; set `=0` to opt out).

## Public endpoints

These endpoints are intentionally unauthenticated:

| Endpoint | Exposes |
|----------|---------|
| `GET /api/health` | Resolved `store` / `backend`, config `ready`, runtime reachability (`store_reachable`, `backend_reachable`), executor, integration booleans (InsForge reachable, Replicas/Limrun configured, `strict`) |
| `GET /api/readiness` | Advisory config warnings (`ready`, `warnings[]`); returns **503** in production by default when config is unsafe (`FORGEGUARD_STRICT_CONFIG` defaults on; `=0` to opt out) |
| `GET /api/demo` | Canned demo operation metadata |

They do not expose SQL, audit rows, or secrets. Use `GET /api/health?minimal=1` for a reduced payload in production monitoring.

Protected routes require an operator token in production (`FORGEGUARD_OPERATOR_TOKEN` and/or `FORGEGUARD_OPERATORS`). Approvals set `reviewed_by` from the verified operator — the client cannot spoof it. See [ADMIN_TOKEN.md](./ADMIN_TOKEN.md).

## Operator token and XSS

The dashboard stores the operator token in **browser localStorage** after prompt. A cross-site scripting flaw in the dashboard could exfiltrate the token. Keep ForgeGuard behind trusted networks; use strong tokens; do not embed the dashboard in untrusted iframes (also blocked by `X-Frame-Options: DENY`). Prefer one token per operator so compromised tokens are attributable.

## Rate limiting

Guard mutations and demo POST are rate-limited per IP (in-memory, single-instance). Serverless deployments may see per-instance limits; use an edge proxy for stricter global limits if needed.

## Reporting issues

Security vulnerabilities: [SECURITY.md](../SECURITY.md). Usage questions: [SUPPORT.md](../SUPPORT.md).
