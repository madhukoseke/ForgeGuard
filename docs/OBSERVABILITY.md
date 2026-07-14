# Observability

## Health

`GET /api/health` — integration booleans (resolved `store` / `backend`, config `ready`, `store_reachable`, `backend_reachable`, executor, InsForge reachable, partner config).

Use `GET /api/health?minimal=1` in production probes for a minimal `{ ok: true }` response.

## Readiness

`GET /api/readiness` — advisory `warnings[]` for unsafe production config (missing operator token, memory store, missing DB creds).

By default the endpoint always returns **200**; parse `ready` and `warnings` in monitoring.

When **`FORGEGUARD_STRICT_CONFIG` is on** (the default in production; set `=0` to opt out), the same endpoint returns **503** if `ready` is false (misconfiguration or unreachable Postgres/InsForge dependencies). Wire load balancers and uptime checks to `/api/readiness` in that mode.

## Logging

ForgeGuard logs credential fallback warnings to stdout:

```
[ForgeGuard] FORGEGUARD_STORE=insforge but INSFORGE_URL/INSFORGE_KEY are unset — refusing memory fallback.
```

Collect stdout from Vercel Functions, Docker, or `npm start`.

## Suggested alerts

- `/api/readiness` `ready: false` in production
- Spike in `429` rate-limit responses
- InsForge store errors (`502` from `/api/actions`)

OpenTelemetry integration is planned; see [ROADMAP.md](./ROADMAP.md).
