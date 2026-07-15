# Operator token (admin auth)

Production ForgeGuard requires an operator token for protected API routes and dashboard mutations. Approvals record a **server-verified** operator id in `reviewed_by` (client-supplied `reviewed_by` is ignored).

## Configuration

### Single operator (simple)

```env
FORGEGUARD_OPERATOR_TOKEN=<long-random-secret>
# Optional identity written to reviewed_by (default: operator)
FORGEGUARD_OPERATOR_ID=alice
FORGEGUARD_OPERATOR_NAME=Alice Admin
```

### Named operators (multiple tokens)

```env
FORGEGUARD_OPERATORS=[{"id":"alice","token":"<secret-a>","name":"Alice"},{"id":"bob","token":"<secret-b>"}]
```

You can combine both: the single-token operator is merged with the JSON list (duplicate tokens are deduped).

Generate strong values (32+ bytes). In development, tokens are optional (`reviewed_by` becomes `local-dev`); on Vercel or `NODE_ENV=production` at least one token is **required**.

## Sending the token

Either header works:

```http
Authorization: Bearer <token>
```

```http
x-forgeguard-token: <token>
```

Comparison uses constant-time equality to reduce timing leaks.

## `reviewed_by`

On `PATCH /api/actions/[id]`, ForgeGuard sets `reviewed_by` from the authenticated operator’s `id`. Spoofing via the request body has no effect.

## Dashboard behavior

1. On first protected request, the dashboard prompts for the token
2. Token is stored in **browser localStorage** (`forgeguard_operator_token`)
3. Subsequent requests include the token via [`components/dashboard/fetch.ts`](../components/dashboard/fetch.ts)

Session-cookie auth (no long-lived localStorage) is planned for a later Phase C2 polish.

## Security expectations

- Treat each token like a root password for ForgeGuard mutations (approve, reject, rollback, demo seed)
- Do not commit tokens to git or share in public issues
- XSS in the dashboard could exfiltrate localStorage — deploy only on trusted origins
- Rotate by updating env and clearing localStorage in browsers
- Prefer one token per human operator via `FORGEGUARD_OPERATORS` so the audit trail is attributable

## Protected routes

Includes `/api/actions/*` mutations, `/api/guard/*`, and `POST /api/demo`.

Public: `GET /api/health`, `GET /api/demo`, `GET /api/readiness` (advisory).

In production with **strict config** (default; `FORGEGUARD_STRICT_CONFIG=0` to opt out), `/api/readiness` returns **503** when the operator token or durable store is missing — use it as a deploy gate before routing traffic.

See [THREAT_MODEL.md](./THREAT_MODEL.md).
