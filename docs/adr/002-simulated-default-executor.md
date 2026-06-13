# ADR 002: Simulated executor by default

## Status

Accepted (0.3.0)

## Context

ForgeGuard can apply/rollback InsForge resources via admin REST when `FORGEGUARD_EXECUTOR=insforge`. Live execution requires credentials and affects real infrastructure.

## Decision

Default executor mode is **`simulated`**: apply/rollback updates audit state and stores compensating SQL without calling InsForge admin APIs.

## Consequences

- Zero-credential demo and CI work out of the box
- Production operators must explicitly set `FORGEGUARD_EXECUTOR=insforge`
- Dashboard rollback in simulated mode reverses audit state only
