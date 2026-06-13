# Open Source Readiness Checklist

Audited on 2026-06-13 for ForgeGuard. **Updated 2026-06-13** after open-source readiness implementation.

## Status Legend

- `[x]` Verified present or passing.
- `[ ] [P0]` Blocker before a broad public open-source launch.
- `[ ] [P1]` Strongly recommended before launch.
- `[ ] [P2]` Nice to have after launch or before a larger announcement.

## Current Readiness Snapshot

- [x] Apache-2.0 license is present and matches `package.json`.
- [x] README, CONTRIBUTING, SECURITY, CHANGELOG, CI, env example, and tests are present.
- [x] `.env.local`, `.insforge/project.json`, `.next`, `.npm-cache`, `dist`, `*.tsbuildinfo`, `.DS_Store`, and Office temp files are ignored and not tracked.
- [x] Local Markdown link check passed.
- [x] `npm run precommit` passed: typecheck, lint, 98 tests, and production Next build.
- [x] `npm_config_cache=/tmp/forgeguard-npm-cache npm run pack:check` passed.
- [x] npm tarball dry run: 42 files, ~50 kB packed.
- [x] npm package name `forgeguard` was not found in the public registry during audit.
- [x] `npm audit --omit=dev` passes (Next 16.2.9 + postcss override).
- [x] InsForge bootstrap loads `sql/schema.sql` with schema drift tests.
- [x] GitHub community files: issue templates, PR template, CODEOWNERS, CODE_OF_CONDUCT, SUPPORT, FUNDING, Dependabot.
- [x] Release metadata aligned on 0.3.0 (SECURITY, CHANGELOG, README).
- [x] Tarball install smoke test passes (`scripts/pack-install-smoke.sh`).

## P0 Blockers

- [x] [P0] Fix InsForge bootstrap/schema drift.
  - Bootstrap reads [`sql/schema.sql`](../sql/schema.sql) via [`lib/schema-sql.ts`](../lib/schema-sql.ts).
  - [`tests/schema-drift.test.ts`](../tests/schema-drift.test.ts) guards divergence.
  - Verify on live InsForge: `npm run bootstrap:insforge && npm run integration:insforge`.

- [x] [P0] Clear production dependency audit.
  - Upgraded to Next 16.2.9, eslint 9, postcss 8.5.15 with npm override.

- [x] [P0] Finalize release version support.
  - SECURITY.md, CHANGELOG 0.3.0, README stable section, [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

- [x] [P0] Pre-public secret scanning infrastructure.
  - [`.github/workflows/secret-scan.yml`](../.github/workflows/secret-scan.yml), [`scripts/secret-scan.sh`](../scripts/secret-scan.sh).
  - **Maintainer:** run `./scripts/secret-scan.sh` once before first public push; rotate any exposed keys.

## Repository Hygiene

- [x] Root `.gitignore` excludes common local and generated files.
- [x] No large tracked binaries or recordings were found in tracked file size outliers.
- [x] `docs/design/` is documented as historical reference and excluded from the root TypeScript build.
- [x] [P1] `docs/design/ForgeGuard/nextjs` kept with stronger "not maintained" warnings.
- [x] [P1] `.cursor/` added to `.gitignore`.
- [ ] [P1] Clean local ignored outputs before first public push (maintainer hygiene).
- [x] [P2] `docs/adr/` with initial ADRs.

## Community Files

- [x] `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`.
- [x] [P1] Issue templates, PR template, CODE_OF_CONDUCT, SUPPORT, CODEOWNERS.
- [x] [P2] `FUNDING.yml`.
- [ ] [P2] README badges after repo is public and npm published.

## Documentation

- [x] README includes architecture, quick starts, stable 0.3.0 section, doc index.
- [x] [P1] [`STABLE_0.3.0.md`](./STABLE_0.3.0.md), [`THREAT_MODEL.md`](./THREAT_MODEL.md).
- [x] [P1] [`INSFORGE_QUICKSTART.md`](./INSFORGE_QUICKSTART.md), [`POSTGRES_QUICKSTART.md`](./POSTGRES_QUICKSTART.md), [`MCP_SETUP.md`](./MCP_SETUP.md), [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).
- [x] [P1] [`ADMIN_TOKEN.md`](./ADMIN_TOKEN.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md), [`API_STABILITY.md`](./API_STABILITY.md).
- [ ] [P2] Demo GIF/MP4 assets (record per DEMO_SCRIPT.md).
- [ ] [P2] Dashboard screenshots in `docs/assets/`.

## Security And Privacy

- [x] Operator token, Replicas signature, SQL size cap, base security headers.
- [x] [P1] CSP (hash-allowed theme script), HSTS (production), Permissions-Policy.
- [x] [P1] `/api/health` and `GET /api/demo` public — documented in THREAT_MODEL; health supports `?minimal=1`.
- [x] [P1] Rate limiting on guard mutations and demo POST.
- [x] [P1] Constant-time operator token comparison.
- [x] [P1] Admin token docs; SECURITY SLA and Dependabot.
- [x] [P1] CI secret scanning (gitleaks).
- [x] [P2] SBOM + npm provenance in release workflow.

## Build, Test, And CI

- [x] CI: typecheck, lint, test, build, MCP, E2E, pack:check, audit, Node 20/22 matrix, coverage, pack-smoke.
- [x] Schema drift covered by `tests/schema-drift.test.ts` in `npm test`.
- [x] [P2] Scheduled drift workflow, Postgres smoke workflow, InsForge integration workflow (secrets).

## Packaging And npm

- [x] keywords, author, publishConfig, CLI-first documented, pack smoke verified.
- [x] [P2] Release workflow with provenance.

## Runtime And Deployment

- [x] [P1] Memory fallback documented (deferred hard-fail); advisory `/api/readiness`.
- [x] [P1] Deployment, Postgres least-privilege, InsForge rotation in docs.
- [x] [P2] Dockerfile, docker-compose, OBSERVABILITY.md.

## Product And API Surface

- [x] [P1] API_STABILITY.md, openapi.yaml, README audit post-bootstrap.
- [ ] [P1] Expanded MCP response examples in README (partial — see guard tests for patterns).
- [x] [P2] COMPARISON.md, ROADMAP.md.

## Legal, Licensing, And Attribution

- [x] NOTICE file; `npm run licenses:scan` script.
- [x] [P1] PARTNER_ATTRIBUTION.md (maintainer: confirm vendor approval before campaigns).

## Maintainer Operations

- [x] [P1] RELEASE_CHECKLIST.md, MAINTAINER_OPS.md (triage, branch protection steps).
- [ ] [P1] GitHub branch protection, npm 2FA — **configure in GitHub/npm UI before launch**.

## Launch Assets

- [x] [P1] ANNOUNCEMENT.md template.
- [ ] [P1] Demo recording and README hero GIF.
- [ ] [P2] Social preview metadata (after hero image exists).

## Verification (2026-06-13 implementation)

```bash
npm run precommit
npm audit --omit=dev                    # found 0 vulnerabilities
npm_config_cache=/tmp/fg-npm-cache npm run pack:check
bash scripts/pack-install-smoke.sh
```

## Definition Of Done For "Open Source Ready"

- [x] All P0 items are complete (live InsForge verify is maintainer step with credentials).
- [x] P1 security, docs, CI, and packaging complete or deferred in ROADMAP.
- [x] `npm audit --omit=dev` passes.
- [x] npm tarball installs and `forgeguard-mcp --help` runs.
- [ ] Release tag + GitHub release + npm publish (maintainer steps at launch).
- [ ] Demo media recording (P2 launch polish).
