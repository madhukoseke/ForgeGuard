# Memoir (trymemoir.ai) partnership guide

Memoir is an AI Growth Engineer for technical teams — it watches your repo, generates demo videos, and drafts distribution posts. There is **no public API** today; integration is narrative + structured release artifacts.

## Demo pitch (20-min call)

**One-liner:** ForgeGuard is the seatbelt for agent-built InsForge backends — every migration, deploy, and config change passes through classify → audit → approve before touching production.

**Hero demo (3 minutes):**

1. Replicas agent proposes `ALTER TABLE users DROP COLUMN last_login` (see `lib/demo-ops.ts` preset).
2. ForgeGuard returns **202 pending** with rationale: high severity, blast radius 5 rows, safer alternative soft-delete.
3. Operator opens **Limrun signed stream URL** from the dashboard to review mobile impact.
4. Operator approves → InsForge executor applies with rollback snapshot.
5. One-click rollback reverts via compensating migration.

**Why Memoir's audience cares:** Memoir's site already showcases "schema diff that reads top-to-bottom." ForgeGuard is the governance layer that makes agent-driven schema changes safe enough to ship and talk about.

## Contacts

- maanav@trymemoir.ai
- jason@trymemoir.ai
- [Book demo](https://calendly.com/maanav-memoir/30min)

## Structured artifacts for Memoir

Grant Memoir read access to the repo. It will pick up:

| Artifact | Location |
|----------|----------|
| Release notes with `#forgeguard-*` tags | [CHANGELOG.md](../CHANGELOG.md) |
| Show HN post draft | [docs/SHOW_HN.md](./SHOW_HN.md) |
| Demo recording script | [docs/DEMO_SCRIPT.md](./DEMO_SCRIPT.md) |
| Integration architecture | [README.md](../README.md) |
| Demo operations | `lib/demo-ops.ts` |
| Audit API | `GET /api/actions` |

## PR description template

Copy into PRs that include guarded backend changes:

```markdown
## ForgeGuard verdict

| Field | Value |
|-------|-------|
| Action ID | `{id}` |
| Severity | `{severity}` |
| Status | `{status}` |
| Agent | `{agent}` |

**Rationale:** {rationale}

**Safer alternative:** {safer_alternative}

**Blast radius:** {blast_radius}

#forgeguard-approved
```

For blocked-then-approved flows, use `#forgeguard-blocked` in the initial PR and `#forgeguard-approved` after operator approval.

## Future webhook (when Memoir provides API)

If Memoir exposes an inbound webhook during onboarding, emit on `applied` status:

```json
{
  "event": "forgeguard.action.applied",
  "statement": "ALTER TABLE users ADD COLUMN deleted_at timestamptz;",
  "severity": "high",
  "rationale": "...",
  "safer_alternative": "...",
  "pr_urls": ["https://github.com/org/repo/pull/123"],
  "demo_context": "schema guard for InsForge agent backends"
}
```

Implement in `lib/memoir-events.ts` when an endpoint URL is available (`MEMOIR_WEBHOOK_URL`).

## Not to be confused with

[memoir-ai](https://github.com/zhangfengcdt/memoir) on GitHub is a separate open-source agent memory system — unrelated to trymemoir.ai.
