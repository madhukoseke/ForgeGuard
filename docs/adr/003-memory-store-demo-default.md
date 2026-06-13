# ADR 003: Memory store as demo default

## Status

Accepted (0.3.0)

## Context

ForgeGuard needs a frictionless quick start (`npm run dev`, `npm run mcp`) without Postgres or InsForge.

## Decision

Default audit store and data backend is **in-memory** with seeded demo data. Missing credentials for postgres/insforge fall back to memory with a console warning.

## Consequences

- Ephemeral audit trail on serverless — documented as unsafe for production
- `/api/readiness` warns when memory is used in production
- Hard-fail on misconfiguration deferred; may be added later
