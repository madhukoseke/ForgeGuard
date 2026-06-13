# Design reference prototypes

> **Warning:** Code in this folder is **not maintained** for production use. Dependencies are stale and UX may not match the shipped app. Use the [root dashboard](/dashboard) and [docs/STABLE_0.3.0.md](../STABLE_0.3.0.md) instead.

This folder holds **UI reference implementations** for ForgeGuard. They are not part of the production app and are excluded from the root TypeScript build (`tsconfig.json`).

## Contents

| Path | Description |
|------|-------------|
| `ForgeGuard/prototype/` | Static HTML + React prototype (early UX exploration) |
| `ForgeGuard/nextjs/` | Standalone Next.js demo with canned ops and `/api/trail` |

## Production app

The shipped demo lives in the repo root:

- Dashboard: `/dashboard` — simulator, **Run demo** (6 scenes), approve/reject/rollback
- Demo API: `POST /api/demo` — reset, seed, run canned ops
- E2E: `npm run demo:e2e`

Use the root app for development, CI, and distribution. These prototypes are kept for design history and comparison only.

## Running the Next.js prototype (optional)

```bash
cd docs/design/ForgeGuard/nextjs
npm install
npm run dev
```

This uses its own `package.json` and in-memory store; it does not share the root app's InsForge integration.
