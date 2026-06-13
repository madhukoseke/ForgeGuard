# Postgres quick start

ForgeGuard works with **any Postgres** database for guarded reads/writes and audit persistence.

## Docker Compose (local)

Create `docker-compose.postgres.yml` or use:

```bash
docker run --name forgeguard-pg \
  -e POSTGRES_PASSWORD=forgeguard \
  -e POSTGRES_DB=forgeguard \
  -p 5432:5432 \
  -d postgres:16
```

Connection string:

```
postgres://postgres:forgeguard@localhost:5432/forgeguard
```

## MCP server (stdio)

```bash
npm run mcp -- --database-url postgres://postgres:forgeguard@localhost:5432/forgeguard
```

Or after npm publish:

```bash
npx forgeguard-mcp --database-url postgres://postgres:forgeguard@localhost:5432/forgeguard
```

## Dashboard + audit store

```env
DATABASE_URL=postgres://postgres:forgeguard@localhost:5432/forgeguard
FORGEGUARD_STORE=postgres
FORGEGUARD_BACKEND=postgres
FORGEGUARD_OPERATOR_TOKEN=<strong-secret>
```

```bash
npm run dev
```

The Postgres store auto-creates `forgeguard_actions` (or uses `agent_actions` schema from `sql/schema.sql` when aligned).

## Least-privilege role (recommended)

Create a dedicated role for ForgeGuard:

```sql
CREATE ROLE forgeguard_app LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE forgeguard TO forgeguard_app;
GRANT USAGE ON SCHEMA public TO forgeguard_app;
-- Grant SELECT/INSERT/UPDATE on audit table and app tables as needed
```

Do not use superuser credentials in `DATABASE_URL`.

## Rollback and backups

ForgeGuard stores compensating SQL in `rollback_ref` for approved ops. Maintain **regular Postgres backups** (pg_dump, WAL archiving, or managed provider snapshots) independent of ForgeGuard.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production guidance.
