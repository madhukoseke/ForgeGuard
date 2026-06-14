# Open Source Readiness Checklist

Updated 2026-06-13 after completing remaining implementable items.

## Remaining (manual / post-launch only)

| Item | Action |
|------|--------|
| Live InsForge verify | `npm run bootstrap:insforge && npm run integration:insforge` with credentials |
| History secret scan | `./scripts/secret-scan.sh` once before launch |
| Branch protection | GitHub Settings → Branches, or see `scripts/setup-github.sh` |
| npm 2FA + publish | `NPM_TOKEN` in CI; `npm publish` on tag |
| GitHub release | `gh release create v0.3.0` after tag push |
| Demo MP4/GIF | Record per [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) |
| Partner badge approval | [PARTNER_ATTRIBUTION.md](./PARTNER_ATTRIBUTION.md) |

## Completed in code (summary)

- [x] MCP/HTTP response examples — [examples/MCP_RESPONSES.md](./examples/MCP_RESPONSES.md)
- [x] README badges (CI, license, npm, Node)
- [x] Open Graph + Twitter metadata; `public/og-dashboard.png`
- [x] `FORGEGUARD_STRICT_CONFIG` — readiness returns 503 in production when unsafe
- [x] Edge proxy rate-limit recipes — [DEPLOYMENT.md](./DEPLOYMENT.md)
- [x] InsForge CI weekly schedule
- [x] `scripts/clean-local.sh`, `scripts/setup-github.sh`, `scripts/capture-screenshots.ts`
- [x] Dashboard screenshots in `docs/assets/` (pending, approved, rejected, rollback)
- [x] Playwright devDependency for screenshot automation

## Verification

```bash
npm run precommit
npm audit --omit=dev
bash scripts/pack-install-smoke.sh
npm run dev &  FORGEGUARD_BASE_URL=http://localhost:3000 npm run capture:screenshots
```

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for publish steps.
