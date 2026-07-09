# Design reference prototypes — UNMAINTAINED

> **Do not use this folder as the app.** It is a historical UI sandbox with its own Next.js tree, stale dependencies, and duplicate component names (`Dashboard.tsx`, `ActionCard.tsx`). It is **not** the shipped product, is excluded from the root TypeScript build, and is listed as experimental in [STABLE_0.3.0.md](../STABLE_0.3.0.md).
>
> **Shipped app:** repo-root [`app/`](../../app/) and [`components/dashboard/`](../../components/dashboard/) — open `/dashboard` after `npm run dev`.

This folder holds early UX explorations only. Contributors should ignore `docs/design/ForgeGuard/**` when searching for production code.

## Contents (reference only)

| Path | Description |
|------|-------------|
| `ForgeGuard/prototype/` | Static HTML + React prototype (early UX exploration) |
| `ForgeGuard/nextjs/` | Standalone Next.js demo with canned ops and `/api/trail` |

## Production app

| Surface | Location |
|---------|----------|
| Dashboard | `/dashboard` — simulator, **Run demo**, approve/reject/rollback |
| Demo API | `POST /api/demo` |
| E2E | `npm run demo:e2e` |
| Architecture | [../ARCHITECTURE.md](../ARCHITECTURE.md) |

## Running the Next.js prototype (optional, not supported)

```bash
cd docs/design/ForgeGuard/nextjs
npm install
npm run dev
```

This uses its own `package.json` and in-memory store; it does not share the root app's guard pipeline or InsForge integration.
