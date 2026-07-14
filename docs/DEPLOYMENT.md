# Deployment guide

## Targets

| Target | Notes |
|--------|-------|
| **Vercel** | Primary path; set env vars in project settings |
| **Node.js** | `npm run build && npm start` |
| **Docker** | See root `Dockerfile` and `docker-compose.yml` |

## Production checklist

1. **`FORGEGUARD_OPERATOR_TOKEN`** — required ([ADMIN_TOKEN.md](./ADMIN_TOKEN.md))
2. **Durable audit store** — `FORGEGUARD_STORE=postgres` or `insforge` (not memory)
3. **`DATABASE_URL`** — when using postgres backend/store
4. **`REPLICAS_WEBHOOK_SECRET`** — if Replicas webhook is enabled
5. **Bootstrap InsForge** — `npm run bootstrap:insforge` before `FORGEGUARD_STORE=insforge`
6. **Readiness check** — `GET /api/readiness` should show `ready: true`; in production strict mode is **on by default** (503 when misconfigured; set `FORGEGUARD_STRICT_CONFIG=0` only to bypass)

## Vercel

```bash
vercel link
vercel env pull .env.local   # optional local sync
vercel --prod
```

Set all variables from `.env.example`. Use **Production** environment for secrets.

## Docker

Root [`docker-compose.yml`](../docker-compose.yml) runs Postgres 16 and the ForgeGuard app image built from the root [`Dockerfile`](../Dockerfile).

```bash
# Postgres only (develop with npm run dev on the host)
docker compose up postgres -d

# Full stack
FORGEGUARD_OPERATOR_TOKEN=<strong-secret> docker compose up --build -d
```

The app service exposes a Docker healthcheck on `GET /api/health?minimal=1` (process liveness). Use `GET /api/readiness` on the host for config + connectivity before routing traffic.

Connection string for the bundled Postgres service:

```
postgres://forgeguard:forgeguard@localhost:5432/forgeguard
```

See [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md) for MCP wiring and least-privilege roles.

## Security headers

Configured in [`next.config.js`](../next.config.js):

- `Content-Security-Policy` (`'unsafe-inline'` for Next.js hydration + theme init hash; tighten with nonces later if needed)
- `Strict-Transport-Security` (production)
- `Permissions-Policy`
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`

`connect-src` allows HTTPS to InsForge, Replicas, Limrun, Memoir, and model gateways when used.

## Rollback and backups

- ForgeGuard stores compensating SQL in audit `rollback_ref` for one-click dashboard rollback
- Maintain independent **database backups** (pg_dump, PITR, managed snapshots)
- Test restore procedures regularly

## Postgres least privilege

See [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md) for role setup. Never use superuser in production.

## InsForge key scope and rotation

- Use project-scoped admin keys with minimum required permissions
- Rotate keys in InsForge dashboard; update env; redeploy; revoke old key
- See [INSFORGE_QUICKSTART.md](./INSFORGE_QUICKSTART.md)

## Memory vs durable stores

- Default / `FORGEGUARD_STORE=memory` — zero-credential demo only
- Explicit `FORGEGUARD_STORE=postgres` or `insforge` **without** credentials **hard-fails** (no silent memory fallback)
- Same rule for `FORGEGUARD_BACKEND=postgres|insforge`

## Strict production config

In production, **`FORGEGUARD_STRICT_CONFIG` defaults on** so `/api/readiness` returns **503** when:

- `FORGEGUARD_OPERATOR_TOKEN` is missing
- `FORGEGUARD_STORE=memory`
- Postgres/InsForge store is configured without credentials
- Replicas is enabled without `REPLICAS_WEBHOOK_SECRET`

Set `FORGEGUARD_STRICT_CONFIG=0` only for emergency bypass. Wire your load balancer or uptime monitor to fail when readiness is not `ready: true`.

### Migrating from soft fallback (pre–Phase B)

Older builds fell back to memory with a console warning when durable credentials were missing. After this change:

1. Ensure `DATABASE_URL` / InsForge env vars are set wherever `FORGEGUARD_STORE` or `FORGEGUARD_BACKEND` is `postgres` or `insforge`
2. Or set those vars to `memory` intentionally for demos
3. Expect process/API errors if credentials are still missing — that is intentional

## Edge rate limiting (multi-instance)

In-memory rate limits apply per serverless instance. For global limits, terminate TLS at a proxy and apply limits there:

**nginx** (example):

```nginx
limit_req_zone $binary_remote_addr zone=fg:10m rate=30r/m;
location /api/guard/ {
  limit_req zone=fg burst=20 nodelay;
  proxy_pass http://forgeguard_upstream;
}
```

**Cloudflare:** use WAF rate limiting rules on `/api/guard/*` and `/api/actions/*`.

## Observability

See [OBSERVABILITY.md](./OBSERVABILITY.md) for health, readiness, and logging guidance.
