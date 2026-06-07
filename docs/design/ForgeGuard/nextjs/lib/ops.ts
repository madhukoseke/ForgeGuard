// ============================================================
// ForgeGuard — canned proposed operations + their classification
//
// In production these fields would be produced by the two-layer guard:
//   Layer 1  deterministic regex filter  → catches TRUNCATE / DROP / DISABLE RLS
//   Layer 2  LLM classifier              → reasons about intent, blast radius,
//                                           and proposes a safer alternative
// Here each op ships pre-classified so the demo is deterministic.
// ============================================================
import type {
  ActionType,
  Agent,
  Category,
  DiffLine,
  Severity,
  Source,
} from "./types";

export interface OpTemplate {
  label: string;
  agent: Agent;
  action_type: ActionType;
  target: string;
  statement: string;
  diff: DiffLine[];
  severity: Severity;
  category: Category;
  rationale: string;
  blast_radius: string;
  requires_approval: boolean;
  source: Source;
  safer_alternative: string | null;
}

export const OPS = {
  drop_last_login: {
    label: "Drop last_login column",
    agent: "claude-code",
    action_type: "db.migration",
    target: "public.users",
    statement: "ALTER TABLE users DROP COLUMN last_login;",
    diff: [
      ["ctx", " table public.users"],
      ["del", "-  last_login   timestamptz   -- 5 non-null values"],
    ],
    severity: "high",
    category: "data_loss",
    rationale:
      "Dropping a populated column is irreversible — the 5 timestamps in last_login are destroyed and cannot be recovered after commit.",
    blast_radius: "5 rows",
    requires_approval: true,
    source: "llm",
    safer_alternative:
      "Soft-deprecate instead: rename to last_login_deprecated and stop writing to it for one release, or add a deleted_at column and never hard-drop.",
  },
  truncate_orders: {
    label: "Truncate orders",
    agent: "devin",
    action_type: "db.migration",
    target: "public.orders",
    statement: "TRUNCATE TABLE orders RESTART IDENTITY CASCADE;",
    diff: [
      ["ctx", " table public.orders"],
      ["del", "-  12,480 rows  (CASCADE → order_items, refunds)"],
    ],
    severity: "critical",
    category: "destructive",
    rationale:
      "TRUNCATE … CASCADE empties orders and every table referencing it. 12,480 rows plus child records are deleted with no WHERE clause and no transaction log to replay.",
    blast_radius: "12,480 rows",
    requires_approval: true,
    source: "deterministic",
    safer_alternative:
      "Archive then delete in a transaction: INSERT INTO orders_archive SELECT * FROM orders WHERE …; then a scoped DELETE you can roll back.",
  },
  avatars_public: {
    label: "Make avatars bucket public",
    agent: "claude-code",
    action_type: "storage.config",
    target: "storage://avatars",
    statement: "UPDATE storage.buckets SET public = true WHERE id = 'avatars';",
    diff: [
      ["ctx", " bucket avatars"],
      ["del", "-  public: false"],
      ["add", "+  public: true   -- anonymous read on every object"],
    ],
    severity: "high",
    category: "security",
    rationale:
      "Flipping the bucket to public grants anonymous read to all current and future objects, including any PII or signed uploads mistakenly stored there.",
    blast_radius: "all objects",
    requires_approval: true,
    source: "llm",
    safer_alternative:
      "Keep the bucket private and serve images through short-lived signed URLs (createSignedUrl, 1h TTL) so access stays scoped per request.",
  },
  disable_rls: {
    label: "Disable RLS on profiles",
    agent: "replicas",
    action_type: "auth.config",
    target: "public.profiles",
    statement: "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;",
    diff: [
      ["ctx", " table public.profiles"],
      ["del", "-  row level security: ENABLED"],
      ["add", "+  row level security: DISABLED   -- every role reads every row"],
    ],
    severity: "critical",
    category: "security",
    rationale:
      "Disabling RLS removes per-row tenant isolation. The anon and authenticated roles can read and write every user's profile, not just their own.",
    blast_radius: "all tenants",
    requires_approval: true,
    source: "llm",
    safer_alternative:
      "Leave RLS enabled and add a scoped policy: CREATE POLICY own_profile ON profiles USING (auth.uid() = user_id).",
  },
  blocking_index: {
    label: "Blocking index on orders",
    agent: "devin",
    action_type: "db.migration",
    target: "public.orders",
    statement: "CREATE INDEX idx_orders_created ON orders (created_at);",
    diff: [
      ["ctx", " table public.orders"],
      ["add", "+  index idx_orders_created  (ACCESS EXCLUSIVE lock held during build)"],
    ],
    severity: "medium",
    category: "migration_risk",
    rationale:
      "A plain CREATE INDEX takes an ACCESS EXCLUSIVE lock and blocks writes to a 12k-row hot table for the duration of the build.",
    blast_radius: "writes blocked",
    requires_approval: true,
    source: "deterministic",
    safer_alternative:
      "Build it without locking: CREATE INDEX CONCURRENTLY idx_orders_created ON orders (created_at).",
  },
  widen_grants: {
    label: "Grant anon write on payments",
    agent: "replicas",
    action_type: "auth.config",
    target: "public.payments",
    statement: "GRANT INSERT, UPDATE, DELETE ON payments TO anon;",
    diff: [
      ["ctx", " role anon"],
      ["add", "+  GRANT insert,update,delete ON public.payments  -- unauthenticated writes"],
    ],
    severity: "critical",
    category: "security",
    rationale:
      "Granting write on payments to the anon role lets unauthenticated callers create or alter payment records directly through the public API.",
    blast_radius: "payments table",
    requires_approval: true,
    source: "llm",
    safer_alternative:
      "Keep payments writes server-side only: route through an authenticated Edge Function with the service_role key, never the anon grant.",
  },
  add_nullable: {
    label: "Add nullable column",
    agent: "claude-code",
    action_type: "db.migration",
    target: "public.users",
    statement: "ALTER TABLE users ADD COLUMN locale text;",
    diff: [
      ["ctx", " table public.users"],
      ["add", "+  locale   text   NULL   -- no default, no rewrite"],
    ],
    severity: "low",
    category: "migration_risk",
    rationale:
      "Adding a nullable column with no default is metadata-only on Postgres — no table rewrite, no lock contention, no data touched.",
    blast_radius: "0 rows",
    requires_approval: false,
    source: "deterministic",
    safer_alternative: null,
  },
  create_index_cc: {
    label: "Create index concurrently",
    agent: "devin",
    action_type: "db.migration",
    target: "public.sessions",
    statement: "CREATE INDEX CONCURRENTLY idx_sessions_uid ON sessions (user_id);",
    diff: [
      ["ctx", " table public.sessions"],
      ["add", "+  index idx_sessions_uid  CONCURRENTLY  (no write lock)"],
    ],
    severity: "safe",
    category: "benign",
    rationale:
      "CONCURRENTLY builds the index without an exclusive lock, so reads and writes continue uninterrupted. No approval needed.",
    blast_radius: "non-blocking",
    requires_approval: false,
    source: "deterministic",
    safer_alternative: null,
  },
  deploy_fn: {
    label: "Deploy resize-avatar fn",
    agent: "claude-code",
    action_type: "function.deploy",
    target: "fn://resize-avatar",
    statement: "supabase functions deploy resize-avatar --no-verify-jwt=false",
    diff: [
      ["ctx", " function resize-avatar"],
      ["add", "+  v7  (jwt verification: on, +12 LOC)"],
    ],
    severity: "safe",
    category: "benign",
    rationale:
      "Routine function redeploy with JWT verification left on and no change to data access scope. Auto-allowed.",
    blast_radius: "1 function",
    requires_approval: false,
    source: "llm",
    safer_alternative: null,
  },
} satisfies Record<string, OpTemplate>;

export type OpKey = keyof typeof OPS;

/** Order shown in the "Simulate an agent" chip bar. */
export const CHIP_ORDER: OpKey[] = [
  "drop_last_login",
  "truncate_orders",
  "avatars_public",
  "disable_rls",
  "blocking_index",
  "widen_grants",
  "add_nullable",
  "create_index_cc",
];
