# API stability (0.3.x)

## Stable operation types

| Type | MCP | HTTP |
|------|-----|------|
| `data.query` | `query` (also `propose_operation`) | `POST /api/guard/query` · `/op` |
| `data.execute` | `execute` (also `propose_operation`) | `POST /api/guard/execute` · `/op` |
| `db.migration` | `propose_operation` | `POST /api/guard/op` |
| `function.deploy` | `propose_operation` | `POST /api/guard/op` |
| `storage.config` | `propose_operation` | `POST /api/guard/op` |
| `auth.config` | `propose_operation` | `POST /api/guard/op` |

Schema introspection (`list_tables`, `describe_table`), `list_actions`, and `get_action_status` are stable MCP tools. Audit listing is also `GET /api/actions`. Approve/reject/rollback remain HTTP/dashboard only.

## Stable response fields (guard)

Clients may depend on these fields in guard responses:

- `status` — `applied`, `pending`, `rejected`, `blocked`, etc.
- `action_id` — audit row UUID when created
- `severity`, `category`, `rationale`
- `safer_alternative` — when held for approval
- `requires_approval` — boolean
- `injection_findings` — array when scanner ran

## Stable audit row fields

See [`lib/types.ts`](../lib/types.ts) and [`sql/schema.sql`](../sql/schema.sql). Core fields (`id`, `created_at`, `agent`, `action_type`, `statement`, `status`, `severity`, `category`) are stable for 0.3.x.

Enrichment fields (`replica_id`, `pr_urls`, `preview_url`) may be null.

## Stable ops endpoints

| Endpoint | Stable fields |
|----------|----------------|
| `GET /api/health` | `ok`, `store`, `backend`, `ready`, `warnings`, `store_reachable`, `backend_reachable`, `executor`, `insforge_configured`, `insforge_reachable`, `strict`, `version` |
| `GET /api/readiness` | `ok`, `ready`, `warnings`, `store`, `backend`, `store_reachable`, `backend_reachable`, `executor`, `production`, `strict`, `version` |

`GET /api/health?minimal=1` returns only `{ ok: true }` (process liveness). `GET /api/health?minimal=ready` returns `{ ok: <config-ready> }` without runtime probes. Both health and readiness responses include an `X-ForgeGuard-Version` header.

## Breaking changes

Announced in [CHANGELOG.md](../CHANGELOG.md) with migration notes. Before 1.0:

- Minor bumps may add fields (backward compatible)
- Breaking HTTP or MCP changes will be called out explicitly

## Unsupported

Importing from `dist/lib/*` in npm package is **not** a supported public API until v1 exports map.
