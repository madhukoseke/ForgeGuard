# ADR 003: Memory store as demo default

## Status

Accepted (0.3.0) · Amended (Product v2 Phase B)

## Context

ForgeGuard needs a frictionless quick start (`npm run dev`, `npm run mcp`) without Postgres or InsForge.

## Decision

Default audit store and data backend is **in-memory** with seeded demo data when `FORGEGUARD_STORE` / `FORGEGUARD_BACKEND` are unset or set to `memory`.

**Amendment (Phase B):** Explicit `postgres` or `insforge` without credentials **does not** fall back to memory — ForgeGuard throws `ForgeGuardConfigError`. Production defaults `FORGEGUARD_STRICT_CONFIG` on so `/api/readiness` returns 503 when config is unsafe.

## Consequences

- Ephemeral audit trail on serverless when memory is chosen — documented as unsafe for production
- `/api/readiness` warns when memory is used in production
- Misconfigured durable store/backend fails loudly instead of silently demoing
