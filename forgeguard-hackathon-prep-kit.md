# ForgeGuard — InsForge Hackathon Prep Kit

**Event:** InsForge Hackathon (Agentic Dev Tools) · 6/6 · Entrepreneurs First, 501 Folsom St, SF
**Tagline:** *An AI agent can ship a full-stack app in minutes — and drop your production table in seconds. ForgeGuard is the seatbelt.*
**One-liner:** The reliability & observability control plane for agent-built backends on InsForge. Audit → Guard → Approve → Roll back.

---

## 0. Assumptions & switches

This plan is written so the **core is solo-doable**. Flip these any time:

- **Team size:** Core (web) = solo. If you get a teammate, hand them the Vercel dashboard UI + the Limrun mobile companion so you own the agent-infra core.
- **Limrun:** OFF by default in the core; included as a clearly-marked **STRETCH**. Limrun credits are in *every* prize tier, so it's worth touching if time allows — but never bet the project on mobile.
- **The "agent":** default is Claude Code driving InsForge via MCP (you control it live). **STRETCH:** make it a real **Replicas** background agent so the Replicas judge has a reason to back you.

---

## 1. The MVP — the minimum that wins (build this first, protect it)

If only one thing works at demo time, it's this loop:

1. An agent proposes a migration to your InsForge backend.
2. ForgeGuard **intercepts** it, classifies risk, and **blocks** a destructive `DROP COLUMN`.
3. The **audit log** (live dashboard on Vercel) shows the blocked action + severity + rationale.
4. You **approve a safer alternative**; it ships.
5. You trigger a bad migration and hit **one-click rollback** to restore.

Everything else (drift detection, Replicas, Limrun, Devin) is additive. **Do not start additive work until the MVP demo runs end-to-end.**

---

## 2. Tonight (June 5) — remove all friction before you arrive

### Registration
- [ ] Confirm you're **approved** (host approval required) and can get in the door. There's a wallet/token-verification step on the Luma page — resolve it tonight. (Host message in §12.)

### Stand up every account + verify with a throwaway hello-world
- [ ] **InsForge** — create a project at insforge.dev, then:
  ```bash
  npx @insforge/cli login
  npx @insforge/cli link        # link a throwaway dir to the project
  npx @insforge/cli current     # verify
  npx @insforge/cli metadata    # see what's configured (you'll use this for drift)
  npm i @insforge/sdk
  ```
  Then connect the **InsForge MCP server** in Claude Code and run their verification prompt:
  > "I'm using InsForge as my backend. Call InsForge MCP's `fetch-docs` tool to learn the instructions, then build a tiny todo app."
  Confirm the agent can actually create a table + deploy a function. **This is the most important thing to verify tonight — InsForge is new to you.**
- [ ] **Vercel** — account + CLI; `vercel` deploy a Next.js starter once so the path is warm.
- [ ] **Replicas** (stretch) — sign up at tryreplicas.com, connect a throwaway GitHub repo, fire one task, note the API shape (§7).
- [ ] **Limrun** (stretch only) — run the lim.run 3-minute quickstart; skim `@limrun/ui`.

### Pre-build *boilerplate only* (rebuild ForgeGuard logic on the day)
- [ ] A Next.js + `@insforge/sdk` starter (generic).
- [ ] Your Vercel project config.
- [ ] Keep §4 (schema), §5 (rules), §6 (prompt) **in your back pocket** — paste/assemble tomorrow.
> Hackathons generally allow prior boilerplate + existing open-source but expect the *project* to be built during the event. Confirm the rule at kickoff. Your DE-Guardian *ideas* are fair game; rebuild the *implementation* on the InsForge stack tomorrow.

### Pack
- [ ] Laptop + charger, headphones, **personal hotspot** (venue wifi is always the bottleneck), water/snacks, ID. Arrive early for a good seat and to talk to sponsor reps.

---

## 3. Architecture — a 3-layer guard (deterministic → LLM → human)

This three-layer design is the part that reads as senior engineering. It mirrors your "deterministic score + LLM judgment" pattern.

```
            ┌─────────────────────────────────────────────────────────┐
 AI agent   │  proposes backend op (SQL migration / fn deploy /        │
 (Claude    │  storage cfg / auth cfg)                                 │
  Code,     └───────────────┬─────────────────────────────────────────┘
 Devin,                     │  POST /guard/op   (InsForge Edge Function)
 Replicas)                  ▼
              ┌──────────────────────────────┐
              │ Layer 1: deterministic filter │  instant, free, reliable
              │  (regex/keyword rules, §5)     │
              └──────────────┬────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Layer 2: LLM risk classifier  │  InsForge Model Gateway
              │  (severity, rationale,         │  → structured JSON (§6)
              │   safer_alternative)           │
              └──────────────┬────────────────┘
                             ▼
              ┌──────────────────────────────┐        ┌───────────────────┐
              │ write to agent_actions (§4)   │───────▶│ Vercel dashboard   │
              │ audit trail + status          │        │ (live URL)         │
              └──────────────┬────────────────┘        └───────────────────┘
                             ▼
              requires_approval?  ── yes ──▶  PAUSE → human approve/reject
                             │                       (Limrun mobile = STRETCH)
                             no
                             ▼
              apply on InsForge preview branch → merge
              rollback = revert branch/migration  (one click)
```

**Capture mechanism (the chokepoint):** the agent submits proposed ops to a ForgeGuard **edge function on InsForge** instead of applying directly. You own the chokepoint, which makes the demo deterministic. Tell the agent to route migrations through ForgeGuard via a `CLAUDE.md`/skill, or just drive it live in the demo.

**Drift detection (secondary):** poll `npx @insforge/cli metadata` (or SDK) on a timer, diff live schema vs declared/intended, surface drift in the dashboard. This is your DE-Guardian schema-drift feature, reused.

---

## 4. Data model (InsForge Postgres)

```sql
create table agent_actions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  agent             text not null,            -- 'claude-code' | 'devin' | 'replicas'
  session_id        text,
  action_type       text not null,            -- 'db.migration' | 'function.deploy' | 'storage.config' | 'auth.config'
  target            text,                     -- table/function/bucket name
  statement         text not null,            -- raw SQL / config / deploy descriptor
  diff              text,                     -- human-readable diff
  severity          text,                     -- 'safe'|'low'|'medium'|'high'|'critical'
  category          text,                     -- 'destructive'|'data_loss'|'security'|'cost'|'migration_risk'|'benign'
  rationale         text,
  blast_radius      text,
  requires_approval boolean not null default false,
  status            text not null default 'pending', -- pending|approved|rejected|applied|rolled_back|auto_allowed
  reviewed_by       text,
  reviewed_at       timestamptz,
  safer_alternative text,
  branch            text,                     -- insforge preview branch
  rollback_ref      text                      -- migration id / branch to revert to
);

create index on agent_actions (created_at desc);
create index on agent_actions (status);
create index on agent_actions (severity);
```

---

## 5. Layer 1 — deterministic pre-filter (instant, free)

Run this *before* the LLM. It's reliable and costs nothing; the LLM adds nuance + the safer alternative.

| Pattern (case-insensitive)                          | Severity  | Category       |
|-----------------------------------------------------|-----------|----------------|
| `DROP TABLE`                                        | critical  | destructive    |
| `TRUNCATE`                                          | critical  | data_loss      |
| `DELETE`/`UPDATE` with no `WHERE`                   | critical  | data_loss      |
| `DROP COLUMN`                                        | high      | data_loss      |
| `ALTER COLUMN ... TYPE` (narrowing)                 | high      | data_loss      |
| `DISABLE ROW LEVEL SECURITY` / `DROP POLICY`        | high      | security       |
| bucket → public / public-read                        | high      | security       |
| remove auth provider / rotate JWT secret            | high      | security       |
| `ADD COLUMN ... NOT NULL` (no default, populated)   | medium    | migration_risk |
| `CREATE INDEX` (non-`CONCURRENTLY`, large table)    | low       | migration_risk |
| `CREATE TABLE` / add nullable column / add concurrent index | safe | benign     |

`requires_approval = (severity in medium|high|critical)`.

---

## 6. Layer 2 — the risk-classifier prompt (copy-paste; this is the core IP)

Send to the **InsForge Model Gateway** (OpenAI-compatible). Request JSON mode.

```
You are ForgeGuard's backend-change risk classifier. You receive ONE proposed
backend operation that an AI coding agent wants to apply to a PRODUCTION
InsForge backend, plus context about current state. Classify its risk and
return STRICT JSON only — no prose, no markdown.

INPUT
- operation_type: db.migration | function.deploy | storage.config | auth.config
- statement: the raw SQL, config diff, or deploy descriptor
- context: { table?, row_count?, columns?, has_rls?, is_public?, environment } (may be partial)

JUDGE BY: irreversible DATA LOSS, SECURITY exposure, LOCKOUT, and MIGRATION-FAILURE risk.

RULES
- Destroying/truncating data on a populated table is at least "high".
- DROP TABLE, TRUNCATE, or unconditional DELETE/UPDATE is "critical".
- Disabling RLS/policies, making a bucket public, or rotating auth secrets is at least "high" (security).
- ADD COLUMN NOT NULL without default on a populated table, or non-concurrent
  index builds on large tables, are "medium".
- Additive, reversible changes (create table, add nullable column, add concurrent index) are "safe".
- requires_approval = true for medium and above.
- Always propose a concrete safer_alternative when one exists
  (soft-delete column instead of DROP; backfill then NOT NULL in two steps;
  CREATE INDEX CONCURRENTLY; scoped WHERE clause), else null.

RETURN EXACTLY:
{
  "severity": "safe|low|medium|high|critical",
  "category": "destructive|data_loss|security|cost|migration_risk|benign",
  "requires_approval": true|false,
  "rationale": "one or two sentences, specific to THIS statement",
  "safer_alternative": "concrete suggestion or null",
  "blast_radius": "rows/objects affected if known, else 'unknown'"
}
```

---

## 7. Sponsor integration snippets

> ⚠️ The InsForge/Limrun SDK surfaces below are **illustrative**. Confirm exact
> method names, base URLs, and model IDs via the InsForge MCP `fetch-docs` tool,
> `docs.insforge.dev`, and `docs.limrun.com`. Don't trust these verbatim — verify.

### InsForge SDK init
```ts
// confirm via InsForge MCP fetch-docs + docs.insforge.dev
import { createClient } from "@insforge/sdk";
const forge = createClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_KEY!,
});
// DB / storage / auth / functions exposed through this client
```

### Model Gateway (OpenAI-compatible) — the classifier call
```ts
import OpenAI from "openai";
const ai = new OpenAI({
  baseURL: process.env.INSFORGE_MODEL_GATEWAY_URL, // OpenAI-compatible gateway
  apiKey: process.env.INSFORGE_KEY,
});
const res = await ai.chat.completions.create({
  model: "gpt-4o-mini",                 // or any provider model the gateway exposes
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: RISK_PROMPT },
    { role: "user", content: JSON.stringify(op) },
  ],
});
const verdict = JSON.parse(res.choices[0].message.content!);
```

### The guard edge function (chokepoint) — pseudocode
```
POST /guard/op   (InsForge Edge Function, Deno)
  body = { operation_type, statement, context, agent, session_id }
  1. det   = prefilter(statement)                 // Layer 1, §5
  2. verdict = (det.severity >= 'medium')
                 ? merge(det, await classify(op))  // Layer 2 adds rationale + safer_alt
                 : await classify(op)              // still explain even when safe
  3. insert into agent_actions {...verdict, status:
        verdict.requires_approval ? 'pending' : 'auto_allowed'}
  4. if verdict.requires_approval → return { status:'pending', id }   // PAUSE
     else → applyOnBranch(statement); return { status:'applied', id }
```
**Apply/rollback for real:** apply on an InsForge **preview branch**, then merge; rollback = revert to the prior branch/migration. Real, not faked — judges notice.

### Vercel
```bash
vercel            # link + deploy the dashboard; get the live URL early
```
Add `[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)` to the README.

### Replicas (STRETCH — gives the Replicas judge a reason to back you)
```bash
# confirm base URL on tryreplicas.com
curl -X POST https://api.tryreplicas.com/v1/replica \
  -H "Authorization: Bearer $REPLICAS_KEY" \
  -d '{ "repository": "<you>/forgeguard-demo",
        "message": "Add soft-delete to users table",
        "coding_agent": "claude" }'
```
Story: the Replicas agent picks up a task, and when it applies the InsForge migration, ForgeGuard gates it — the PR comment shows the verdict. Clean Replicas × InsForge × ForgeGuard loop.

### Limrun (STRETCH — credits in every prize tier)
```tsx
// confirm props in docs.limrun.com
import { RemoteControl } from "@limrun/ui";
// a tiny mobile "approvals" screen running on a Limrun cloud simulator,
// streamed live into the dashboard so judges see you approve a blocked
// migration "from your phone"
<RemoteControl instanceId={iosInstanceId} />
```

---

## 8. Day-of timeline (typical: ~9:30 start → ~6pm submit → judging → ~9:30 awards)

- **Arrive 8:30–9:00** — set up, coffee, and **talk to every sponsor rep** (they're the judges; ask what they'd love to see). Confirm tracks/rubric announced at kickoff; slot ForgeGuard into the best track.
- **First hour** — lock scope to MVP (§1); Limrun/Replicas = stretch. Init repo + InsForge project.
- **Vertical slices (always keep a working demo):**
  1. *H1–2:* InsForge backend for the dashboard + capture **one** agent action into `agent_actions` end-to-end.
  2. *H2–4:* Layer 1 filter + Layer 2 classifier → make `DROP COLUMN → blocked` work.
  3. *H4–5:* dashboard UI + **deploy to Vercel early** (live URL exists).
  4. *H5–6:* approve/reject + one-click rollback via branch.
  5. *Stretch:* Replicas real agent; Limrun mobile approve screen; drift detection.
- **Last 60–90 min — FREEZE features.** Polish the demo path, write README, add the InsForge badge, push the repo, and **record a 60–90s backup screen capture with clean audio + subtitles** (in case live fails). Rehearse the pitch 3×.

---

## 9. The demo (≈90 seconds — this *is* the pitch)

Pre-seed: a `users` table with ~5 rows; a `last_login` column you'll target.

1. "I ask the agent to clean up the users table." → it proposes `ALTER TABLE users DROP COLUMN last_login;`
2. ForgeGuard **intercepts** → dashboard flashes **HIGH / data_loss**, rationale, blast radius (5 rows), `requires_approval`.
3. "It suggested a safer path" → show `safer_alternative`: add `deleted_at` soft-delete instead. You **approve the safe version** → it ships (status `applied`).
4. "Now watch a real disaster." → trigger a bad migration that applies → hit **Rollback** → dashboard shows `rolled_back`, data restored from the branch.
5. Land it: "Every action — logged. Every risk — caught. Every mistake — reversible."

Keep your hands off slides during this. Let the dashboard tell the story.

---

## 10. The pitch (2 min)

1. **Hook (15s):** "An AI agent can ship a full-stack app in minutes. It can also drop your production table in seconds. Right now, nobody's watching it."
2. **Problem (20s):** background coding agents now operate real backends; one bad migration = data loss; teams have no audit trail, no guardrails, no rollback.
3. **Solution (20s):** ForgeGuard — the reliability control plane for agent-built backends on InsForge. Audit. Guard. Approve. Roll back.
4. **Demo (75–90s):** §9.
5. **Stack (15s):** built on InsForge, deployed on Vercel, driven by a real Replicas agent — turning InsForge's "1.7× more accurate" into "accurate *and* safe."
6. **Close (15s):** "Agents are becoming the default way we ship software. ForgeGuard is the seatbelt — and we want to keep building it." (Founder energy → wins the YC dinner.)

---

## 11. Morning talk track for sponsor reps (they're your judges)

- **InsForge:** "I'm building the safety/observability layer on top of InsForge so agents can ship to real backends *and* be trusted. What would make this most compelling to you?"
- **Limrun:** "I want a mobile approvals screen running on your cloud sim so you can approve a blocked migration from your phone — does `<RemoteControl/>` fit?"
- **Replicas:** "I want a real Replicas background agent to be the thing ForgeGuard guards. Easiest path to wire repo + trigger today?"
- **Vercel / Cognition:** quick rapport; mention you're deploying on Vercel / can swap Devin in as the agent.

Listen for the rubric and any track. Align to it. That's most of the game.

---

## 12. Host registration message (send tonight)

> Hi James — excited for tomorrow's InsForge Hackathon. I requested to join under [name/email]; could you confirm my registration is approved? I also want to make sure I complete the token/wallet verification step correctly before arriving — anything I should do in advance? Planning to build a reliability + observability layer for agent-built backends on InsForge. Thanks!

---

## 13. Repo README (paste-ready)

```markdown
# ForgeGuard 🛡️
**The reliability & observability control plane for agent-built backends on InsForge.**

> An AI agent can ship a full-stack app in minutes — and drop your production
> table in seconds. ForgeGuard is the seatbelt.

[![Made with InsForge](https://insforge.dev/badge-made-with-insforge.svg)](https://insforge.dev)

## What it does
When a coding agent (Claude Code, Devin, or a Replicas background agent) builds
or modifies an app on InsForge, ForgeGuard sits in the loop:

- **Audit trail** — every backend action (migrations, fn deploys, bucket/auth
  changes) logged with who/what/when/diff.
- **Guardrails** — a 3-layer guard (deterministic filter → LLM risk classifier
  on the InsForge Model Gateway → human approval) blocks destructive ops.
- **Schema-drift detection** — diffs live InsForge schema vs intended.
- **One-click rollback** — revert via InsForge preview branches.
- **Live dashboard** — built on InsForge, deployed on Vercel.

## Stack
InsForge (DB · Auth · Storage · Edge Functions · Model Gateway · preview branches)
· Vercel (dashboard) · Replicas (background agent) · Limrun (mobile approvals).

## Why
InsForge makes agents 1.7× more accurate. ForgeGuard makes them *safe* —
the missing trust layer for the agentic-backend era.
```

---

*Go build. Protect the MVP, talk to the judges early, keep a backup recording, and let the dashboard tell the story.*
