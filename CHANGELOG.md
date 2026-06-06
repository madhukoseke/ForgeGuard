# ForgeGuard release notes

Structured artifacts for Memoir ([trymemoir.ai](https://www.trymemoir.ai/)) and other distribution channels.

## Format

Each guarded operation that reaches `applied` status should appear here with:

- `#forgeguard-approved` or `#forgeguard-blocked` tag
- Severity, agent, and one-line rationale
- Link to PR (when Replicas enrichment provides `pr_urls`)

---

## Unreleased

### Multi-platform integration

- **InsForge executor** — Real apply/rollback via admin REST when `FORGEGUARD_EXECUTOR=insforge`; simulated by default for offline demo.
- **Replicas webhook** — `POST /api/webhooks/replicas` enriches audit rows with `replica_id` and `pr_urls`.
- **Limrun mobile preview** — Pending high/medium+ ops get a signed stream URL when `LIM_API_KEY` or `LIMRUN_INSTANCE_ID` is set.

#forgeguard-approved Safe migrations auto-apply through the guard pipeline with compensating rollback snapshots stored in the audit trail.

#forgeguard-blocked Destructive ops (DROP TABLE, unconditional DELETE, RLS disable) pause at `pending` with rationale and safer alternatives surfaced to the operator.

---

## Demo story (Memoir / Show HN)

**Title:** A Postgres schema guard that reads like a code review

**Hook:** Replicas proposes `ALTER TABLE users DROP COLUMN last_login` on a 5-row production table. ForgeGuard blocks at medium+, suggests soft-delete via `deleted_at`, and holds for operator approval. Operator reviews on Limrun mobile preview, approves, InsForge applies with compensating rollback snapshot.

**Artifacts Memoir can consume:**

1. This CHANGELOG entry
2. PR description template in [docs/MEMOIR.md](./docs/MEMOIR.md)
3. Screen recording of dashboard approve flow + rollback
