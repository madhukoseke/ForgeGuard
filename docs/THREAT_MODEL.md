# Threat model and limitations

ForgeGuard reduces risk from AI agents accessing your database. It is **not** a substitute for database security fundamentals.

## What ForgeGuard does

- Intercepts agent SQL and config operations through MCP or HTTP
- Applies deterministic destructive-statement rules and optional LLM classification
- Scans for prompt-injection patterns inbound and outbound
- Enforces read-side policy (denied tables, column masks, row caps)
- Logs every operation to an audit trail with human-in-the-loop approval for risky ops
- Supports compensating rollback snapshots for approved changes

## What ForgeGuard does not do

- **Formal SQL parser** — deterministic scans use conservative pattern matching, not a full SQL grammar. Unusual syntax may bypass or false-positive.
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

When `FORGEGUARD_STORE=insforge` or `postgres` is set but credentials are missing, ForgeGuard **falls back to memory** with a console warning. This aids demos but can hide misconfiguration in production. Check `/api/readiness` for advisory warnings.

## Public endpoints

These endpoints are intentionally unauthenticated:

| Endpoint | Exposes |
|----------|---------|
| `GET /api/health` | Store mode, executor, integration booleans (InsForge reachable, Replicas/Limrun configured) |
| `GET /api/readiness` | Advisory config warnings (`ready`, `warnings[]`); returns **503** when `FORGEGUARD_STRICT_CONFIG=1` in production and config is unsafe |
| `GET /api/demo` | Canned demo operation metadata |

They do not expose SQL, audit rows, or secrets. Use `GET /api/health?minimal=1` for a reduced payload in production monitoring.

Protected routes require `FORGEGUARD_OPERATOR_TOKEN` in production. See [ADMIN_TOKEN.md](./ADMIN_TOKEN.md).

## Operator token and XSS

The dashboard stores the operator token in **browser localStorage** after prompt. A cross-site scripting flaw in the dashboard could exfiltrate the token. Keep ForgeGuard behind trusted networks; use strong tokens; do not embed the dashboard in untrusted iframes (also blocked by `X-Frame-Options: DENY`).

## Rate limiting

Guard mutations and demo POST are rate-limited per IP (in-memory, single-instance). Serverless deployments may see per-instance limits; use an edge proxy for stricter global limits if needed.

## Reporting issues

Security vulnerabilities: [SECURITY.md](../SECURITY.md). Usage questions: [SUPPORT.md](../SUPPORT.md).
