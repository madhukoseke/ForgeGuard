# Observability

## Health

`GET /api/health` — integration booleans (store, executor, InsForge reachable, partner config).

Use `GET /api/health?minimal=1` in production probes for a minimal `{ ok: true }` response.

## Readiness

`GET /api/readiness` — advisory `warnings[]` for unsafe production config (missing operator token, memory store, missing DB creds).

Does not fail HTTP status; parse `ready` and `warnings` in monitoring.

## Logging

ForgeGuard logs credential fallback warnings to stdout:

```
[ForgeGuard] FORGEGUARD_STORE=insforge but INSFORGE_URL/INSFORGE_KEY are unset — falling back to memory backend.
```

Collect stdout from Vercel Functions, Docker, or `npm start`.

## Suggested alerts

- `/api/readiness` `ready: false` in production
- Spike in `429` rate-limit responses
- InsForge store errors (`502` from `/api/actions`)

OpenTelemetry integration is planned; see [ROADMAP.md](./ROADMAP.md).
