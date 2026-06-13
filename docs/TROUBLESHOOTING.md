# Troubleshooting

## Missing `DATABASE_URL`

**Symptom:** MCP or dashboard falls back to memory; log shows `falling back to memory backend`.

**Fix:**

```env
DATABASE_URL=postgres://user:pass@host:5432/db
FORGEGUARD_BACKEND=postgres
FORGEGUARD_STORE=postgres
```

For demo only, omit credentials and use memory intentionally.

## Missing InsForge credentials

**Symptom:** `FORGEGUARD_STORE=insforge` but audit rows disappear on restart; health shows `insforge_configured: false`.

**Fix:** Set `INSFORGE_URL` and `INSFORGE_KEY`. Run `npm run bootstrap:insforge`. See [INSFORGE_QUICKSTART.md](./INSFORGE_QUICKSTART.md).

## `FORGEGUARD_STORE=memory` on Vercel

**Symptom:** Audit trail resets between requests or deployments.

**Fix:** Use `FORGEGUARD_STORE=postgres` with `DATABASE_URL`, or `insforge` with InsForge credentials. Memory is demo-only on serverless.

Check `/api/readiness` for warnings.

## npm cache permission errors

**Symptom:** `EACCES` or cache errors during `npm install`.

**Fix:**

```bash
npm run fix:npm-cache
# or use a temp cache:
npm_config_cache=/tmp/forgeguard-npm-cache npm install
```

## Operator token prompts / 401 on dashboard

**Symptom:** Dashboard cannot load actions; API returns `unauthorized`.

**Fix:**

1. Set `FORGEGUARD_OPERATOR_TOKEN` in `.env.local` or Vercel
2. Enter the same token when the dashboard prompts (stored in localStorage)
3. Send `Authorization: Bearer <token>` or `x-forgeguard-token: <token>` on API calls

See [ADMIN_TOKEN.md](./ADMIN_TOKEN.md).

## Failed bootstrap / migrations

**Symptom:** InsForge insert fails on `action_type` or missing columns.

**Fix:**

1. Ensure you are on ForgeGuard 0.3.0+
2. Re-run `npm run bootstrap:insforge` (applies upgrade migration from `sql/schema.sql`)
3. Run `npm run integration:insforge`

Schema drift is guarded by CI tests in `tests/schema-drift.test.ts`.

## Pack / install smoke test hangs

Use an isolated cache and timeout:

```bash
npm_config_cache=/tmp/forgeguard-npm-cache ./scripts/pack-install-smoke.sh
```

## Still stuck?

Open a [bug report](https://github.com/madhukoseke/ForgeGuard/issues/new?template=bug_report.yml) with version, Node version, store backend, and redacted logs.
