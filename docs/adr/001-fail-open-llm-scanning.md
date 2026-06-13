# ADR 001: LLM scans fail open to deterministic rules

## Status

Accepted (0.3.0)

## Context

ForgeGuard offers optional LLM layers for injection scanning (`FORGEGUARD_INJECTION_LLM`) and risk classification (`OPENROUTER_API_KEY`). LLM calls can fail (network, rate limits, model errors) or return ambiguous results.

## Decision

When the LLM layer errors or is unavailable, ForgeGuard **continues with deterministic rules** rather than blocking all traffic.

## Consequences

- Availability is prioritized over maximum paranoia when LLMs are down
- Operators must not assume LLM scanning alone prevents injection
- Documented in [THREAT_MODEL.md](../THREAT_MODEL.md)
