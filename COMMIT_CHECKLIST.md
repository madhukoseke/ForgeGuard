# ForgeGuard — GitHub Commit & Submission Checklist

**End goal:** A public GitHub repo that demonstrates ForgeGuard as the reliability
control plane for agent-built backends on InsForge — intercept risky agent ops,
classify them, log an audit trail, pause for approval, and roll back mistakes —
with a live Vercel dashboard judges can open in 90 seconds.

---

## North Star (what "done" looks like)

Before your final push, this loop must work end-to-end:

1. An agent proposes a migration to InsForge (e.g. `DROP COLUMN last_login`).
2. ForgeGuard **intercepts** it via `POST /api/guard/op`.
3. Layer 1 (deterministic) + Layer 2 (LLM via InsForge Model Gateway) classify risk.
4. A destructive op is **blocked** (`requires_approval: true`, status `pending`).
5. The **audit log** appears on the Vercel dashboard with severity, rationale, blast radius.
6. You **approve** a safer alternative → status `applied`.
7. You trigger a bad migration → **one-click rollback** → status `rolled_back`.

Everything else (Replicas agent, Limrun mobile approvals, drift detection) is stretch —
never block the MVP on it.

---

## Every Commit — Pre-Push Gate

Run this before **every** `git push`:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Or use the convenience script:

```bash
npm run precommit
```

### Code quality

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds (catches Next.js production issues early)
- [ ] No `console.log` debug noise left in API routes or lib code
- [ ] No commented-out dead code blocks (delete or ticket them)

### Security (non-negotiable)

- [ ] **No secrets in diff** — `.env`, `.env.local`, API keys, `INSFORGE_KEY`, `REPLICAS_KEY`, tokens
- [ ] `.env.example` updated if you added new env vars (values blank, comments explain purpose)
- [ ] `.gitignore` covers `.env*`, `.next/`, `node_modules/`, OS junk
- [ ] No hardcoded production URLs or keys in source — use `process.env.*`

### Commit hygiene

- [ ] Commit message describes **why**, not just what (e.g. `feat(guard): block DROP COLUMN via Layer 1 prefilter`)
- [ ] One logical change per commit (guard logic ≠ dashboard polish ≠ README)
- [ ] No `.next/`, `node_modules/`, or build artifacts staged
- [ ] `ui-only-backup/` not accidentally committed as the "real" app

### Demo safety

- [ ] App still runs with **zero env vars** (`FORGEGUARD_STORE=memory` fallback works)
- [ ] `npm run seed` still populates demo actions against a running dev server
- [ ] `npm run e2e` still passes the happy-path guard flow

---

## Repo Structure — What Must Be Present

### Core application (required)

| Path | Purpose | Commit when |
|------|---------|-------------|
| `app/page.tsx` | Live audit dashboard | UI shows actions, severity badges, approve/reject/rollback |
| `app/api/guard/op/route.ts` | Chokepoint — intercept agent ops | MVP commit |
| `app/api/actions/route.ts` | List audit trail | MVP commit |
| `app/api/actions/[id]/route.ts` | Approve / reject / apply / rollback | MVP commit |
| `lib/prefilter.ts` | Layer 1 deterministic rules | MVP commit |
| `lib/classifier.ts` | Layer 2 LLM classifier (with heuristic fallback) | MVP commit |
| `lib/guard.ts` | Orchestrates prefilter → classify → persist | MVP commit |
| `lib/store.ts` | Memory + InsForge persistence adapters | MVP commit |
| `lib/types.ts` | Shared types for `agent_actions` | MVP commit |
| `sql/schema.sql` | InsForge Postgres schema + demo `users` seed | Before `FORGEGUARD_STORE=insforge` |
| `tests/guard.test.ts` | Unit tests for guard/classifier | With each guard change |
| `scripts/seed.ts` | Demo data for judges | Before demo freeze |
| `scripts/e2e.ts` | End-to-end smoke test | Before demo freeze |

### Documentation (required for judging)

| Path | Must include |
|------|--------------|
| `README.md` | One-liner, InsForge badge, live Vercel URL, demo curl, stack list, "why ForgeGuard" |
| `AGENTS.md` or `CLAUDE.md` | Instruction for agents to route ops through ForgeGuard, not direct InsForge |
| `.env.example` | All integration env vars documented |

### Optional / stretch

| Path | Integration |
|------|-------------|
| `lib/drift.ts` | InsForge metadata polling for schema drift |
| `lib/replicas.ts` | Replicas webhook / task trigger |
| `components/LimrunApproval.tsx` | Limrun `@limrun/ui` mobile approve screen |

---

## Integration Checklists

### InsForge (required — primary sponsor)

**Accounts & CLI**

- [ ] Project created at [insforge.dev](https://insforge.dev)
- [ ] `npx @insforge/cli login` + `link` + `current` verified
- [ ] InsForge MCP connected in your agent — `fetch-docs` works

**Database**

- [ ] `sql/schema.sql` applied to InsForge Postgres (`agent_actions` + demo `users`)
- [ ] `FORGEGUARD_STORE=insforge` persists audit rows (not just in-memory)
- [ ] Indexes on `created_at`, `status`, `severity` exist

**Edge function (stretch but high impact)**

- [ ] `POST /guard/op` deployed as InsForge edge function (true chokepoint)
- [ ] Agent skill instructs: *never apply migrations directly — POST to ForgeGuard first*

**Model Gateway (Layer 2)**

- [ ] `INSFORGE_MODEL_GATEWAY_URL` + `INSFORGE_KEY` set in Vercel env (not in repo)
- [ ] Classifier returns strict JSON: `severity`, `category`, `requires_approval`, `rationale`, `safer_alternative`, `blast_radius`
- [ ] Graceful fallback to deterministic classifier when gateway unavailable

**Preview branches (apply / rollback)**

- [ ] Risky approved ops apply on InsForge preview branch, not production
- [ ] Rollback reverts to `rollback_ref` / prior branch — real, not faked status flip
- [ ] `branch` and `rollback_ref` columns populated in `agent_actions`

**README**

- [ ] InsForge badge present:

  ```markdown
  [![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)
  ```

**Commit message examples**

- `feat(insforge): persist agent_actions to Postgres via REST store`
- `feat(insforge): wire Model Gateway classifier with JSON mode`
- `feat(insforge): apply approved migrations on preview branch`

---

### Vercel (required — live demo URL)

**Setup**

- [ ] `vercel link` — project connected to repo
- [ ] Production/preview deploy succeeds (`npm run build` clean)
- [ ] Live URL in README (e.g. `https://forgeguard.vercel.app`)

**Environment variables (Vercel dashboard only)**

- [ ] `INSFORGE_URL`, `INSFORGE_KEY`
- [ ] `INSFORGE_MODEL_GATEWAY_URL`, `FORGEGUARD_MODEL`
- [ ] `FORGEGUARD_STORE=insforge`
- [ ] `FORGEGUARD_OPERATOR_TOKEN` (optional — protects mutations in prod demo)

**Dashboard UX (judges open this)**

- [ ] Actions table: agent, type, statement, severity, status, timestamp
- [ ] Detail panel: rationale, blast radius, safer alternative
- [ ] Approve / Reject buttons for `pending` actions
- [ ] Rollback button for `applied` actions
- [ ] Visual severity coding (critical = red, high = orange, etc.)
- [ ] Real-time or refresh-after-mutation (no stale state after approve)

**Commit message examples**

- `feat(dashboard): add approve/reject controls for pending actions`
- `chore(vercel): add env var docs and deployment notes to README`

---

### Replicas (stretch — Replicas judge story)

- [ ] Account at [tryreplicas.com](https://tryreplicas.com)
- [ ] Throwaway repo connected; one background task fired successfully
- [ ] `agent` field in audit log set to `'replicas'` when triggered via Replicas
- [ ] Flow: Replicas agent proposes migration → ForgeGuard gates → PR comment or dashboard shows verdict
- [ ] `REPLICAS_KEY` in Vercel env only — never committed
- [ ] README "Stack" section mentions Replicas integration (even if minimal)

**Commit message example**

- `feat(replicas): trigger guard check when background agent submits migration`

---

### Limrun (stretch — mobile approvals)

- [ ] Quickstart at [lim.run](https://lim.run) completed
- [ ] `@limrun/ui` `RemoteControl` streams iOS simulator into dashboard or separate approve screen
- [ ] Approve action from "phone" updates `agent_actions.status` → `approved`
- [ ] README notes Limrun as mobile approval channel

**Commit message example**

- `feat(limrun): embed RemoteControl for mobile approval demo`

---

### Cognition / Devin (optional agent swap)

- [ ] `agent` field supports `'devin'` | `'claude-code'` | `'replicas'`
- [ ] Demo can be driven by Claude Code live OR Devin — same guard path
- [ ] No Devin-specific code required unless you have API access; agent label in audit log is enough for pitch

---

## Milestone Commit Roadmap

Use this order so you always have a working demo:

### Commit 1 — Scaffold

- [ ] Next.js app, `lib/types.ts`, in-memory store, basic `POST /api/guard/op`
- [ ] README stub, `.env.example`, `.gitignore`
- [ ] `npm test` with one guard test

### Commit 2 — Layer 1 (deterministic)

- [ ] `lib/prefilter.ts` with destructive-op rules (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, RLS disable, etc.)
- [ ] `DROP COLUMN` → `high` / `data_loss` / `requires_approval: true`
- [ ] Tests for each critical pattern

### Commit 3 — Layer 2 (classifier)

- [ ] `lib/classifier.ts` — LLM via InsForge gateway + heuristic fallback
- [ ] `safer_alternative` populated (e.g. soft-delete instead of DROP)
- [ ] `source` field: `'deterministic'` vs `'llm'`

### Commit 4 — Audit + review API

- [ ] `GET /api/actions`, `PATCH /api/actions/[id]` (approve / reject / apply / rollback)
- [ ] Status machine: `pending` → `approved` → `applied` → `rolled_back`
- [ ] Optional `FORGEGUARD_OPERATOR_TOKEN` auth on mutations

### Commit 5 — Dashboard (Vercel-deployable)

- [ ] `app/page.tsx` — table + detail + action buttons
- [ ] Deploy to Vercel; live URL in README
- [ ] `scripts/seed.ts` for demo data

### Commit 6 — InsForge persistence

- [ ] Apply `sql/schema.sql`
- [ ] `FORGEGUARD_STORE=insforge` writes real rows
- [ ] Vercel env vars configured

### Commit 7 — Apply / rollback (real)

- [ ] Preview-branch apply on InsForge
- [ ] One-click rollback restores prior state
- [ ] Demo `users` table with 5 rows + `last_login` column

### Commit 8 — Stretch integrations

- [ ] Replicas trigger, Limrun mobile approve, drift detection
- [ ] Only after Commit 7 demo runs cleanly

### Commit 9 — Submission freeze

- [ ] README final (badge, live URL, demo script, stack, architecture diagram)
- [ ] `AGENTS.md` / agent skill for routing through ForgeGuard
- [ ] 60–90s backup screen recording linked in README or Luma submission
- [ ] All tests green, no secrets, no `.next` in repo

---

## Final GitHub Submission Checklist

### Repository

- [ ] Public repo URL ready for judges
- [ ] Default branch is clean (`main` or `master`)
- [ ] No force-pushed history mess; meaningful commit history (not one giant "hackathon dump")
- [ ] License file if open-sourcing (MIT is fine)

### README must answer in 30 seconds

- [ ] **What** — reliability control plane for agent-built InsForge backends
- [ ] **Why** — agents ship fast but can destroy prod; ForgeGuard is the seatbelt
- [ ] **How** — 3-layer guard: deterministic → LLM → human approval
- [ ] **Live demo** — Vercel URL clickable
- [ ] **Try it** — `curl` example for `POST /api/guard/op`
- [ ] **Stack** — InsForge · Vercel · (Replicas · Limrun if built)
- [ ] InsForge badge

### Demo assets

- [ ] `scripts/seed.ts` seeds the demo (`DROP COLUMN last_login` scenario)
- [ ] Backup screen recording (60–90s) with subtitles
- [ ] Pitch rehearsed 3× against the demo script below

### Sponsor visibility (helps judging)

- [ ] README explicitly names InsForge, Vercel
- [ ] Stretch: Replicas loop demonstrated or documented
- [ ] Stretch: Limrun mobile approval shown live
- [ ] Mention InsForge stat in pitch: *"1.7× more accurate — ForgeGuard makes it safe"*

---

## What NOT to Commit

| Never commit | Instead |
|--------------|---------|
| `.env.local`, API keys, tokens | Vercel env vars + `.env.example` placeholders |
| `.next/`, `node_modules/` | `.gitignore` |
| Production InsForge credentials in screenshots | Redact or use demo project |
| Half-finished stretch code that breaks MVP | Feature flag or separate branch |
| `ui-only-backup/` as primary app | Delete or clearly mark as archive before submit |
| Generated `tsconfig.tsbuildinfo` | Add to `.gitignore` if not already |

---

## Quick Reference — Env Vars by Integration

```bash
# InsForge (required for production demo)
INSFORGE_URL=
INSFORGE_KEY=
INSFORGE_MODEL_GATEWAY_URL=
FORGEGUARD_MODEL=gpt-4o-mini
FORGEGUARD_STORE=insforge          # memory for offline dev

# Vercel (set in dashboard, not repo)
FORGEGUARD_OPERATOR_TOKEN=         # optional mutation auth
FORGEGUARD_BASE_URL=               # for seed script against deployed URL

# Replicas (stretch)
REPLICAS_KEY=

# Limrun (stretch)
LIMRUN_INSTANCE_ID=
```

---

## 90-Second Demo Script (align commits to this)

| Step | What judges see | Required commit milestone |
|------|-----------------|---------------------------|
| 1 | Agent proposes `DROP COLUMN last_login` | Commit 2–3 |
| 2 | Dashboard flashes **HIGH / data_loss** | Commit 5 |
| 3 | Safer alternative: soft-delete `deleted_at` | Commit 3 |
| 4 | Approve safe version → `applied` | Commit 4–5 |
| 5 | Bad migration → Rollback → `rolled_back` | Commit 7 |

---

## Priority Order (if time runs out)

1. **MVP loop** — intercept → block → log → approve → rollback
2. **Vercel live URL** — judges need a link
3. **InsForge persistence** — real Postgres audit trail
4. **InsForge badge + README** — sponsor visibility
5. **Replicas** — background agent story
6. **Limrun** — mobile approval flair
7. **Drift detection** — nice-to-have

---

## CI

GitHub Actions runs the same checks on every push and pull request. See
`.github/workflows/ci.yml`. Locally, mirror CI with:

```bash
npm run precommit
```

## Live status

See [CHECKLIST_STATUS.md](./CHECKLIST_STATUS.md) for what's implemented vs what
still needs your InsForge/Vercel credentials or stretch work.
