# Troubleshooting

## `npm run dev` picks the wrong workspace root

**Symptom:** Next.js / Turbopack warns about multiple lockfiles, serves the wrong app, or fails to resolve modules after cloning into a parent directory that also has a `package-lock.json`.

**Fix:** ForgeGuard pins Turbopack's root in [`next.config.js`](../next.config.js). Pull the latest `main`. If issues persist:

```bash
npm run clean:local
rm -rf node_modules && npm install
npm run dev
```

Clone into its own directory (not nested under another Node monorepo) when possible.

## Stale local build artifacts

**Symptom:** Type errors, missing routes, or dashboard changes that do not appear after `git pull`.

**Fix:**

```bash
npm run clean:local
npm run dev
```

`.env.local` and `.insforge/` are not removed.

## Docker Compose Postgres connection refused

**Symptom:** MCP or dashboard cannot connect after `docker compose up postgres`.

**Fix:** Use the compose credentials (not the standalone `docker run` example):

```env
DATABASE_URL=postgres://forgeguard:forgeguard@localhost:5432/forgeguard
FORGEGUARD_BACKEND=postgres
FORGEGUARD_STORE=postgres
```

Confirm the container is running: `docker compose ps`. See [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md).

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

Check `/api/readiness` for warnings. Set **`FORGEGUARD_STRICT_CONFIG=1`** in production so misconfiguration fails deploy checks (503). See [DEPLOYMENT.md](./DEPLOYMENT.md).

## npm cache permission errors

**Symptom:** `EACCES` or cache errors during `npm install`.

**Fix:**

```bash
npm run fix:npm-cache
# or use a temp cache:
npm_config_cache=/tmp/forgeguard-npm-cache npm install
```

## Run demo / dashboard buttons do nothing

**Symptom:** `/dashboard` renders (stats, Simulate, Actions skeletons) but **Run demo**, `D`, and op rows never respond; browser console shows Content-Security-Policy `script-src` violations and/or `Expected a request ID to be defined for the document via self.__next_r`.

**Cause:** A hash-only CSP blocked Next.js hydration scripts, so React never mounted.

**Fix:** Pull the latest `next.config.js` (allows `'unsafe-inline'` for scripts in prod, plus `'unsafe-eval'` in dev). Restart `npm run dev` and hard-refresh the browser.

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
