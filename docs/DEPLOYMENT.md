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
6. **Readiness check** — `GET /api/readiness` should show no critical warnings

## Vercel

```bash
vercel link
vercel env pull .env.local   # optional local sync
vercel --prod
```

Set all variables from `.env.example`. Use **Production** environment for secrets.

## Security headers

Configured in [`next.config.js`](../next.config.js):

- `Content-Security-Policy` (hash-allowed inline theme script)
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

## Memory fallback (current behavior)

If credentials for the configured store are missing, ForgeGuard falls back to memory with a console warning. Check `/api/readiness` in production. Hard-fail on misconfiguration may be added in a future release.

## Observability

See [OBSERVABILITY.md](./OBSERVABILITY.md) for health, readiness, and logging guidance.
