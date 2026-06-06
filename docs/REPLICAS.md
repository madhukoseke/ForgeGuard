# Replicas integration

Configure a [Replicas](https://tryreplicas.com/) environment so background coding agents route InsForge backend changes through ForgeGuard before applying them.

## Environment variables (Replicas dashboard)

Inject into every workspace via **Settings → Environments → Variables**:

| Variable | Example | Purpose |
|----------|---------|---------|
| `FORGEGUARD_BASE_URL` | `https://your-app.vercel.app` | Guard chokepoint base URL |
| `FORGEGUARD_OPERATOR_TOKEN` | *(optional)* | Bearer token if mutations are protected |
| `INSFORGE_URL` | `https://your-app.insforge.app` | InsForge project URL |
| `INSFORGE_KEY` | `ik_…` | InsForge admin/API key |

## System prompt

Add to the environment **Configuration** tab or `replicas.yaml` at repo root:

```
Before any InsForge database migration, function deploy, storage config, or auth
config change, POST the proposed operation to $FORGEGUARD_BASE_URL/api/guard/op
with Content-Type: application/json.

Required fields: operation_type, statement, agent ("replicas"), session_id (this
replica workspace id), target, context (table, row_count, environment).

If the response status is 202 or requires_approval is true:
  - STOP. Do not apply the change on InsForge.
  - Report rationale, blast_radius, and safer_alternative to the operator.
  - Wait for approval via the ForgeGuard dashboard or PATCH /api/actions/:id.

If the response is 200 and status is applied or auto_allowed:
  - Proceed with the InsForge apply using MCP/CLI.
```

## MCP servers

On the same environment, configure:

1. **InsForge MCP** — so the agent can operate the backend ([docs.insforge.dev](https://docs.insforge.dev))
2. *(Optional)* Custom HTTP MCP wrapping `POST /api/guard/op` for tool-native guard calls

## Webhook (ForgeGuard side)

When creating replicas via API, set:

```json
{
  "webhook_url": {
    "url": "https://your-forgeguard.vercel.app/api/webhooks/replicas",
    "secret": "whsec_your_shared_secret"
  }
}
```

Set `REPLICAS_WEBHOOK_SECRET=whsec_your_shared_secret` in ForgeGuard.

Pass `session_id` equal to the replica workspace id in guard requests so webhook events enrich the correct audit rows with `pr_urls`.

## Demo

Run the **DROP TABLE (critical)** preset in the ForgeGuard dashboard — it uses `agent: "replicas"` from `lib/demo-ops.ts`.

## API reference

- [Replicas API](https://docs.tryreplicas.com/features/api)
- [Environments](https://docs.replicas.dev/features/environments)
