# Roadmap

Product direction for the capability leap beyond 0.3: **[V2.md](./V2.md)**.

## Product v2 (phased)

- [x] **A — MCP parity** — `propose_operation`, `list_actions` (approve/reject stay HTTP; optional `review_action` later)
- [x] **B — Fail-closed production** — strict defaults; no silent memory fallback when durable store was requested
- [ ] **C — Operator identity** — server-verified `reviewed_by`; named keys / roles
- [ ] **D — Operator dashboard** — search, bulk actions, export, pending alerts
- [ ] **E — Stronger guard core** — AST-backed SQL detection; configurable thresholds
- [ ] **F — Library API + schema** — npm `exports` map (former “v1” item); unified migrations

Suggested tags: `0.4` (A) → `0.5` (B+C) → `0.6` (D) → `0.7` (E) → `1.0` (F). Details and success criteria: [V2.md](./V2.md).

## Core (near term / launch)

- [x] Hard-fail production misconfiguration (`FORGEGUARD_STRICT_CONFIG` defaults on in production + `/api/readiness` 503; durable store/backend refuse memory fallback)
- [ ] Explicit npm `exports` map for supported library surface → **Phase F** / [V2.md](./V2.md)
- [ ] Demo GIF/MP4 in `docs/assets/` (record per DEMO_SCRIPT.md)
- [x] Dashboard screenshot script (`npm run capture:screenshots`)

## Partner integrations (experimental until promoted)

- [ ] Deeper Replicas session matching
- [ ] Limrun preview polish
- [ ] Memoir event schema stability

## Infrastructure

- [x] Global rate limiting guidance (edge proxy recipes in DEPLOYMENT.md)
- [x] Live InsForge CI weekly schedule (with repo secrets)
- [ ] OpenTelemetry hooks

See [OPEN_SOURCE_READINESS_CHECKLIST.md](./OPEN_SOURCE_READINESS_CHECKLIST.md) for launch tracking.
