# Contributing to ForgeGuard

Thank you for your interest in contributing.

## Development setup

```bash
npm install
npm run dev          # http://localhost:3000 — dashboard at /dashboard
npm run mcp          # MCP server on stdio (in-memory demo backend)
npm run build:mcp    # compile the npx-installable MCP server to dist/
npm run precommit    # typecheck + lint + test + build (run before opening a PR)
```

Optional live InsForge: copy `.env.example` to `.env.local`, link a project with the InsForge CLI, then `npm run bootstrap:insforge`.

If `npm run dev` mis-detects the workspace or caches look stale, see [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Pull requests

1. Fork the repo and create a feature branch from `main`.
2. Keep changes focused; match existing code style and naming.
3. Add or update tests when behavior changes (`tests/*.test.ts`).
4. Run `npm run precommit` and ensure it passes.
5. For demo or dashboard UX changes, run `npm run demo:e2e` if applicable.

## Reporting issues

Open a [GitHub issue](https://github.com/madhukoseke/ForgeGuard/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, `FORGEGUARD_STORE` / `FORGEGUARD_EXECUTOR` if relevant)

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Design prototypes

UI reference code lives in [docs/design/](./docs/design/) and is excluded from the root build. Production demo code is in `app/dashboard/` and `app/api/demo/`.
