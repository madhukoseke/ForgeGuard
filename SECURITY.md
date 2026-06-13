# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | Yes       |
| 0.2.x   | Best effort (upgrade to 0.3.x) |
| < 0.2   | No        |

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Use one of:

1. **GitHub Private Vulnerability Reporting** — [Report a vulnerability](https://github.com/madhukoseke/ForgeGuard/security/advisories/new) on this repository (preferred).
2. **Email** — open a private security advisory thread via GitHub; do not post exploit details in public issues.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected versions or commit hash

## Response SLA

| Severity | Acknowledgement | Target fix |
|----------|-----------------|------------|
| Critical | 72 hours | 30 days |
| High | 5 business days | 60 days |
| Medium / Low | 10 business days | Next minor release or documented mitigation |

We will coordinate public disclosure after a fix is available when appropriate.

## Scope

In scope:

- ForgeGuard API routes (`/api/guard/*`, `/api/actions`, `/api/demo`, webhooks)
- Authentication bypass when `FORGEGUARD_OPERATOR_TOKEN` is configured
- InsForge credential handling in server-side code
- MCP server guard pipeline and audit persistence

Out of scope:

- Issues in third-party services (InsForge, Replicas, Limrun, OpenRouter)
- Misconfiguration of `.env.local` on self-hosted deployments
- Vulnerabilities in user databases outside ForgeGuard's control

## Dependency updates

- **Dependabot** opens weekly PRs for npm and GitHub Actions.
- **Major** dependency bumps (Next.js, ESLint, MCP SDK) require full `npm run precommit` and manual review.
- Production advisories must be cleared before release (`npm audit --omit=dev`).

## Best practices for operators

- Set `FORGEGUARD_OPERATOR_TOKEN` in production and keep it secret.
- Never commit `.env.local` or `.insforge/project.json`.
- Use least-privilege InsForge API keys; rotate on compromise.
- See [docs/ADMIN_TOKEN.md](./docs/ADMIN_TOKEN.md) and [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md).
