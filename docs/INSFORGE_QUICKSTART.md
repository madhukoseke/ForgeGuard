# InsForge quick start

ForgeGuard can persist its audit trail and execute apply/rollback against an [InsForge](https://insforge.dev) project.

## Prerequisites

- Node.js 20+
- An InsForge project with admin API key
- InsForge CLI linked, or `INSFORGE_URL` + `INSFORGE_KEY` in `.env.local`

## 1. Link your project

```bash
npx @insforge/cli link
# or set INSFORGE_URL and INSFORGE_KEY in .env.local
```

## 2. Bootstrap schema

Bootstrap reads the canonical [`sql/schema.sql`](../sql/schema.sql) and applies three migrations:

```bash
npm run bootstrap:insforge
```

Expected output includes:

- `✓ InsForge health OK`
- `✓ applied migration "forgeguard-agent-actions"`
- `✓ applied migration "forgeguard-agent-actions-upgrade"`
- `✓ agent_actions table reachable`

## 3. Configure environment

Add to `.env.local` (or Vercel env):

```env
INSFORGE_URL=https://your-project.insforge.dev
INSFORGE_KEY=ik_...
FORGEGUARD_STORE=insforge
FORGEGUARD_EXECUTOR=insforge
FORGEGUARD_OPERATOR_TOKEN=<strong-random-secret>
```

## 4. Verify integration

```bash
npm run integration:insforge
```

## 5. Run the dashboard

```bash
npm run dev
# open http://localhost:3000/dashboard
```

## Troubleshooting

- **Migration already applied** — bootstrap is idempotent; existing migration names are skipped
- **Insert rejected for action_type** — run bootstrap upgrade migration or re-run bootstrap on a fresh project
- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Key rotation

Rotate `INSFORGE_KEY` in the InsForge dashboard, update env vars, and redeploy. Old keys should be revoked promptly.
