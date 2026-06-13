# ForgeGuard (design prototype — not maintained)

> **Warning:** This standalone Next.js app is a **historical design reference only**. It is not updated with the production ForgeGuard app, uses stale dependencies, and must not be used in production. See the [root README](../../../../README.md) and [docs/STABLE_0.3.0.md](../../../STABLE_0.3.0.md).

# ForgeGuard

**The reliability & observability control plane for AI-agent-built backends on InsForge.**

> An AI agent can ship a full-stack app in minutes — and drop your production table in seconds. ForgeGuard is the seatbelt.

When a coding agent (Claude Code, Devin, a Replicas background agent) proposes a backend change — a SQL migration, function deploy, storage config, or auth config — ForgeGuard intercepts it at a single **chokepoint**, classifies its risk, writes an immutable audit row, and **pauses** risky changes for human approval. Safe changes flow through; dangerous ones wait.

---

## Run it

```bash
npm install
npm run dev
# → http://localhost:3000
```

Requires Node 18.18+ / 20+. Tailwind is pinned to **3.4** (`tailwindcss@3.4.17`) — do not upgrade to v4.

---

## The 90-second demo

Press **`Run demo`** (or the `D` key) for a scripted, cinematic run. The data tells the story with no narration needed:

1. **An agent proposes a destructive migration** — `ALTER TABLE users DROP COLUMN last_login`. ForgeGuard intercepts it; the card flashes **HIGH / data_loss** with a rationale and blast radius (5 rows).
2. **A safer alternative is surfaced** — soft-delete instead of a hard drop — in a green callout.
3. **The operator approves the safe version** → status becomes `applied`, and the card notes the safer alternative was substituted.
4. **A migration applies, then turns out bad** — a blocking index holds an `ACCESS EXCLUSIVE` lock → one-click **Rollback** → status `rolled_back`.
5. Land it: *Every action — logged. Every risk — caught. Every mistake — reversible.*

You can also drive it by hand: fire any chip in the **Simulate an agent** bar, or use the keyboard — `1`–`8` for ops, `A` approve, `R` rollback, `S` seed, `X` reset.

---

## Architecture

```
app/
  page.tsx                      server page → renders <Dashboard/> (client)
  layout.tsx                    fonts + globals
  globals.css                   theme tokens + component styling
  api/
    actions/route.ts            GET  /api/actions          → the live audit feed (polled ~2s)
    actions/[id]/route.ts       POST /api/actions/:id       → approve | reject | rollback
    guard/op/route.ts           POST /api/guard/op          → THE CHOKEPOINT: classify + record
    trail/route.ts              POST /api/trail             → seed | reset (demo controls)
components/
  Dashboard.tsx                 client: polling loop, mutations, auto-demo, shortcuts
  ActionCard.tsx                the hero component
  StatTile.tsx                  KPI tile with count-up
  BlastRadius.tsx  Sql.tsx  Toasts.tsx  severity.tsx
lib/
  types.ts                      AgentAction model
  ops.ts                        canned proposed ops + their classification
  store.ts                      in-memory audit store (server singleton)
  sql.ts                        dependency-free SQL tokenizer
```

The dashboard is a **client component** that polls `GET /api/actions` every 2 seconds. If a poll fails it keeps the last good state and shows a quiet inline note — the feed never blanks out. Mutations hit their routes and trigger an immediate refresh so the UI feels instant but stays server-authoritative.

In this build, classification ships pre-computed per op and the store is in-memory. In production, `guard/op` would run the two real layers (below) and persist `AgentAction`s to Postgres on InsForge, streamed to the client over SSE.

---

## Design decisions & how each part supports the demo

**Two-layer guard, made visible.** Every card carries a source pill: **Deterministic** (Layer 1 — a regex filter that unconditionally catches `TRUNCATE`, `DROP`, `DISABLE ROW LEVEL SECURITY`, blocking `CREATE INDEX`) or **LLM classified** (Layer 2 — the model that reasons about intent, blast radius, and proposes the safer path). This makes the "defense in depth" story legible at a glance rather than buried in prose.

**Severity is the visual anchor.** A 5-step scale — `safe → low → medium → high → critical` mapped to teal → slate-blue → amber → orange → red — drives the badge, the card's left accent border, the blast-radius bars, and the KPI numbers. The palette is tuned for WCAG-AA contrast on the near-black background. The brand cyan is deliberately *outside* the severity scale so "ForgeGuard chrome" never reads as a risk signal.

**The ActionCard earns the most attention.** Severity badge + monospace SQL with syntax highlighting + plain-language rationale + a qualitative blast-radius mini-viz + the **safer-alternative callout** (positive green, the key selling point) + a status pill with contextual buttons. Pending → Approve / Reject. Applied → Rollback. Buttons disable mid-flight. Cards are compact by default and expand to show the diff and rollback ref, so the feed stays dense without losing detail.

**Motion that informs, never decorates.** New rows slide/fade in at the top; high/critical cards pulse once and glow briefly on arrival to pull the eye during a live demo; numbers count up; status transitions animate. Everything is gated behind `prefers-reduced-motion: reduce`, which collapses animations and renders content in its final state.

**Trustworthy by construction.** Dark, dense, monospace where data lives, a steady "live audit trail" pulse, a `production` environment pill, semantic landmarks (`header`/`main`/`section`), keyboard-operable controls, visible focus rings, and `aria-live` on the feed. It should read like a control plane an engineer would actually leave running against production — not a toy.

---

## Data model — `AgentAction`

See `lib/types.ts`. Each audit row carries: `id`, `created_at`, `agent`, `session_id`, `action_type`, `target`, `statement`, `diff`, `severity`, `category`, `rationale`, `blast_radius`, `requires_approval`, `status`, `reviewed_by`, `reviewed_at`, `safer_alternative`, `branch`, `rollback_ref`, and `source`.
