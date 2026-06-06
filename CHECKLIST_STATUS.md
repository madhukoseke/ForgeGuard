# ForgeGuard — Checklist Status

Last updated against [COMMIT_CHECKLIST.md](./COMMIT_CHECKLIST.md).

**Overall:** MVP commits 1–5 are **done**. Submission polish (README, LICENSE,
CLAUDE.md, 18 tests, CI) is **done**. Commit 6–7 (live InsForge persistence +
real apply/rollback) needs your credentials. Stretch integrations (Replicas,
Limrun, drift) are **not started**.

---

## North Star MVP Loop

| Step | Status | Notes |
|------|--------|-------|
| Agent proposes migration | ✅ Done | `POST /api/guard/op`, demo chips, `scripts/seed.ts` |
| ForgeGuard intercepts + classifies | ✅ Done | Layer 1 + Layer 2 with heuristic fallback |
| Destructive op blocked (`pending`) | ✅ Done | `DROP COLUMN` → 202, `requires_approval: true` |
| Audit log on dashboard | ✅ Done | Live refresh every 2s, severity badges |
| Approve safer alternative | ✅ Done | PATCH approve → `applied` |
| Rollback bad migration | ⚠️ Simulated | Status → `rolled_back`; no real InsForge branch revert yet |

---

## Every Commit — Pre-Push Gate

| Check | Status |
|-------|--------|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run e2e` | ✅ (full MVP loop verified) |
| `npm test` | ✅ (18 tests) |
| `npm run build` | ✅ |
| `npm run precommit` | ✅ script added |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| No secrets in repo | ✅ `.env*` gitignored |
| Demo works with zero env | ✅ memory store default |

---

## Milestone Commits

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Scaffold | ✅ Complete |
| 2 | Layer 1 deterministic | ✅ Complete |
| 3 | Layer 2 classifier | ✅ Complete (LLM when gateway configured) |
| 4 | Audit + review API | ✅ Complete |
| 5 | Dashboard | ✅ Complete (local; Vercel deploy pending) |
| 6 | InsForge persistence | ⚠️ Code ready; needs live project + `sql/schema.sql` applied |
| 7 | Real apply / rollback | ❌ Simulated only |
| 8 | Stretch (Replicas, Limrun, drift) | ❌ Not started |
| 9 | Submission freeze | ⚠️ Partial (docs done; Vercel URL + demo video pending) |

---

## Repo Structure

| Path | Status |
|------|--------|
| `app/page.tsx` | ✅ |
| `app/api/guard/op/route.ts` | ✅ |
| `app/api/actions/route.ts` | ✅ |
| `app/api/actions/[id]/route.ts` | ✅ |
| `lib/prefilter.ts` | ✅ |
| `lib/classifier.ts` | ✅ |
| `lib/guard.ts` | ✅ |
| `lib/store.ts` | ✅ (memory + InsForge REST) |
| `lib/types.ts` | ✅ |
| `sql/schema.sql` | ✅ (not yet applied to cloud) |
| `tests/guard.test.ts` | ✅ |
| `tests/prefilter.test.ts` | ✅ (13 critical-pattern tests) |
| `scripts/seed.ts` | ✅ |
| `scripts/e2e.ts` | ✅ |
| `README.md` | ✅ (badge, stack, demo; Vercel URL placeholder) |
| `AGENTS.md` | ✅ InsForge MCP instructions |
| `CLAUDE.md` | ✅ Agent chokepoint rules |
| `.env.example` | ✅ All integration vars documented |
| `COMMIT_CHECKLIST.md` | ✅ |
| `LICENSE` | ✅ MIT |

### Stretch (not present)

| Path | Status |
|------|--------|
| `lib/drift.ts` | ❌ |
| `lib/replicas.ts` | ❌ |
| Limrun mobile approve UI | ❌ |
| InsForge edge function deploy | ❌ |

---

## Integration Status

### InsForge

| Item | Status |
|------|--------|
| SDK / REST store code | ✅ |
| `sql/schema.sql` | ✅ written, not applied |
| `FORGEGUARD_STORE=insforge` | ⚠️ needs `INSFORGE_URL` + `INSFORGE_KEY` in env |
| Model Gateway classifier | ⚠️ code ready; needs `OPENROUTER_API_KEY` or `INSFORGE_KEY` |
| Preview-branch apply/rollback | ❌ simulated |
| InsForge MCP `fetch-docs` in AGENTS.md | ✅ |
| README InsForge badge | ✅ |
| Edge function chokepoint | ❌ uses Next.js API route instead |

### Vercel

| Item | Status |
|------|--------|
| Next.js build passes | ✅ |
| `vercel link` + deploy | ❌ needs your Vercel account |
| Live URL in README | ❌ pending deploy |
| Env vars in Vercel dashboard | ❌ pending deploy |

### Replicas (stretch)

| Item | Status |
|------|--------|
| API integration | ❌ |
| Demo ops use `agent: "replicas"` label | ✅ in `lib/demo-ops.ts` |

### Limrun (stretch)

| Item | Status |
|------|--------|
| `@limrun/ui` mobile approve | ❌ |

### Devin

| Item | Status |
|------|--------|
| `agent: "devin"` in demo ops | ✅ |

---

## Final Submission

| Item | Status |
|------|--------|
| Public GitHub repo | ❓ verify remote is public |
| Meaningful commit history | ❓ depends on your pushes |
| README answers what/why/how in 30s | ✅ |
| Live Vercel demo URL | ❌ |
| `curl` example in README | ✅ |
| InsForge badge | ✅ |
| Backup screen recording | ❌ manual |
| Pitch rehearsed | ❌ manual |

---

## What You Can Do Next (ordered)

These require **your** accounts/credentials — the codebase is ready:

1. **InsForge** — create project, apply `sql/schema.sql`, set env vars, flip `FORGEGUARD_STORE=insforge`
2. **Vercel** — `vercel link && vercel --prod`, add env vars, paste live URL into README
3. **Model Gateway** — `insforge ai setup` or set `OPENROUTER_API_KEY`, verify `source: "llm"` in dashboard
4. **Record demo** — 60–90s screen capture of §9 script
5. **Stretch** — Replicas task trigger, Limrun `RemoteControl` approve screen

---

## Quick verify locally

```bash
npm run dev          # terminal 1
npm run e2e          # terminal 2 — full MVP loop
npm run precommit    # before every push
```
