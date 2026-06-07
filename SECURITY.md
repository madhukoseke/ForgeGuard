# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | Yes       |

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Email the maintainers with:

- Description of the issue and potential impact
- Steps to reproduce
- Affected versions or commit hash

We will acknowledge receipt within a few business days and work on a fix before public disclosure when appropriate.

## Scope

In scope:

- ForgeGuard API routes (`/api/guard/op`, `/api/actions`, `/api/demo`, webhooks)
- Authentication bypass when `FORGEGUARD_OPERATOR_TOKEN` is configured
- InsForge credential handling in server-side code

Out of scope:

- Issues in third-party services (InsForge, Replicas, Limrun, OpenRouter)
- Misconfiguration of `.env.local` on self-hosted deployments

## Best practices for operators

- Set `FORGEGUARD_OPERATOR_TOKEN` in production and keep it secret.
- Never commit `.env.local` or `.insforge/project.json`.
- Use least-privilege InsForge API keys.
