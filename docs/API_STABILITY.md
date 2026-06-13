# API stability (0.3.x)

## Stable operation types

| Type | MCP | HTTP |
|------|-----|------|
| `data.query` | `query` | `POST /api/guard/query` |
| `data.execute` | `execute` | `POST /api/guard/execute` |
| `db.migration` | `propose_operation` | `POST /api/guard/op` |
| `function.deploy` | `propose_operation` | `POST /api/guard/op` |
| `storage.config` | `propose_operation` | `POST /api/guard/op` |
| `auth.config` | `propose_operation` | `POST /api/guard/op` |

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

## Breaking changes

Announced in [CHANGELOG.md](../CHANGELOG.md) with migration notes. Before 1.0:

- Minor bumps may add fields (backward compatible)
- Breaking HTTP or MCP changes will be called out explicitly

## Unsupported

Importing from `dist/lib/*` in npm package is **not** a supported public API until v1 exports map.
