# What is stable in 0.3.0

## Stable surfaces

These are covered by tests, documented in README, and intended for production use:

| Surface | Notes |
|---------|-------|
| **MCP tools** | `query`, `execute`, `propose_operation`, `list_tables`, `describe_table`, `list_actions`, `get_action_status` |
| **HTTP backend ops** | `POST /api/guard/op` for `db.migration`, `function.deploy`, `storage.config`, `auth.config` (same pipeline as MCP `propose_operation`) |
| **HTTP endpoints** | `/api/guard/op`, `/api/guard/query`, `/api/guard/execute`, `/api/actions`, `/api/actions/[id]` |
| **Config file** | `forgeguard.config.json` read-side policy (denied tables, masks, row caps) |
| **Environment variables** | See README configuration table |
| **npm bin** | `forgeguard-mcp` (CLI-first package; see below) |
| **Op types** | `data.query`, `data.execute`, `db.migration`, `function.deploy`, `storage.config`, `auth.config` |
| **Guard pipeline** | Prefilter, heuristic classifier, optional LLM classifier, injection scanning |
| **Audit store** | Memory (demo), Postgres (`DATABASE_URL`), InsForge (`INSFORGE_URL` + key) |

## Experimental surfaces

Use with caution; behavior may change in minor releases:

| Surface | Notes |
|---------|-------|
| **InsForge live executor** | `FORGEGUARD_EXECUTOR=insforge` — real apply/rollback via admin REST |
| **Replicas webhook** | `POST /api/webhooks/replicas` — enrichment only |
| **Limrun preview** | Signed mobile stream URLs for pending ops |
| **Memoir webhook** | Optional outbound events |
| **LLM injection scan** | `FORGEGUARD_INJECTION_LLM=1` — fail-open to deterministic rules |
| **Design prototypes** | `docs/design/` — historical reference, not maintained |

## npm package scope

The published npm package is **CLI-first**: install `forgeguard-mcp` and run via stdio or HTTP.

Internal files under `dist/lib/*` are bundled for the MCP server but are **not** a supported public library API until an explicit `exports` map and stability policy ship in v1.

## Versioning

- **0.3.x** — current supported line ([SECURITY.md](../SECURITY.md))
- Breaking HTTP or MCP response changes will bump minor/major and appear in CHANGELOG

See also [API_STABILITY.md](./API_STABILITY.md) and [THREAT_MODEL.md](./THREAT_MODEL.md).
