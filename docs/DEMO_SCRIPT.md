# Demo recording script

Use this checklist when recording a screen capture for Memoir, Show HN, or the README.

**Duration target:** 90–120 seconds  
**Resolution:** 1920×1080, dark mode browser  
**URL:** http://localhost:3000 (or production deploy)

---

## Setup (before recording)

```bash
npm install
npm run dev
```

Open two tabs:

1. `/` — landing page (optional 5s intro)
2. `/dashboard` — operator dashboard

Click **Reset trail** in the simulator panel to start clean.

---

## Scene 1 — The problem (10s)

Narration: *"Agents propose schema changes fast. ForgeGuard intercepts every op before it hits production."*

Show the simulator chip: **Drop last_login column (the headline block)**

---

## Scene 2 — Guard blocks (20s)

Click the chip. Show the audit card appear:

- Severity: **high**
- Status: **pending**
- Rationale visible
- Safer alternative: soft-delete via `deleted_at`

Narration: *"Destructive changes pause for human review with a safer alternative."*

---

## Scene 3 — Approve (15s)

Click **Approve**. Status changes to **applied**.  
Expand or scroll to show `rollback_ref` / compensating SQL in the card metadata.

Narration: *"Approve applies through InsForge with a rollback snapshot stored in the audit trail."*

---

## Scene 4 — Rollback (15s)

Find a previously applied safe op (e.g. **Create table feature_flags**) or run **Safer alternative: soft-delete column**, approve it, then click **Rollback**.

Show status → **rolled_back**.

Narration: *"One-click rollback replays compensating SQL — no manual recovery."*

---

## Scene 5 — Auto-allow (10s)

Run **Create table (safe / auto-allowed)**.  
Show it goes straight to **applied** without approval.

Narration: *"Benign ops auto-allow. Everything is still audited."*

---

## Scene 6 — Reject (10s)

Run **DROP TABLE (critical)**. Click **Reject**.  
Show status → **rejected**.

---

## Export checklist

- [ ] MP4 or GIF under 15 MB for GitHub README → save to [docs/assets/](./assets/)
- [ ] Upload to Memoir repo artifacts folder (when granted access)
- [ ] Link in [CHANGELOG.md](../CHANGELOG.md) under Unreleased
- [ ] Thumbnail: dashboard with one pending high-severity card

---

## curl alternative (for terminal-only demos)

```bash
# Risky op → pending
curl -s -X POST http://localhost:3000/api/guard/op \
  -H 'content-type: application/json' \
  -d '{"operation_type":"db.migration","statement":"ALTER TABLE users DROP COLUMN last_login;","context":{"table":"users","row_count":5}}'

# List audit trail
curl -s http://localhost:3000/api/actions | jq '.actions[0]'

# Approve (replace ID)
curl -s -X PATCH http://localhost:3000/api/actions/<id> \
  -H 'content-type: application/json' \
  -d '{"decision":"approve"}'
```
