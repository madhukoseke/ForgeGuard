// Canned ops for the §9 demo and quick manual testing. The pre-seeded `users`
// table has ~5 rows and a `last_login` column the demo targets.

import { ProposedOp } from "./types";

export interface DemoOp extends ProposedOp {
  label: string;
}

export const DEMO_OPS: DemoOp[] = [
  {
    label: "Drop last_login column (the headline block)",
    operation_type: "db.migration",
    statement: "ALTER TABLE users DROP COLUMN last_login;",
    agent: "claude-code",
    session_id: "demo",
    target: "users",
    context: { table: "users", row_count: 5, has_rls: true, environment: "production" },
  },
  {
    label: "Safer alternative: soft-delete column",
    operation_type: "db.migration",
    statement: "ALTER TABLE users ADD COLUMN deleted_at timestamptz;",
    agent: "claude-code",
    session_id: "demo",
    target: "users",
    context: { table: "users", row_count: 5, environment: "production" },
  },
  {
    label: "DROP TABLE (critical)",
    operation_type: "db.migration",
    statement: "DROP TABLE sessions;",
    agent: "replicas",
    session_id: "demo",
    target: "sessions",
    context: { table: "sessions", row_count: 1240, environment: "production" },
  },
  {
    label: "DELETE without WHERE (critical)",
    operation_type: "db.migration",
    statement: "DELETE FROM orders;",
    agent: "devin",
    session_id: "demo",
    target: "orders",
    context: { table: "orders", row_count: 8801, environment: "production" },
  },
  {
    label: "Disable RLS (security)",
    operation_type: "auth.config",
    statement: "ALTER TABLE users DISABLE ROW LEVEL SECURITY;",
    agent: "claude-code",
    session_id: "demo",
    target: "users",
    context: { table: "users", has_rls: true, environment: "production" },
  },
  {
    label: "Make bucket public (security)",
    operation_type: "storage.config",
    statement: '{ "bucket": "avatars", "public": true }',
    agent: "claude-code",
    session_id: "demo",
    target: "avatars",
    context: { is_public: false, environment: "production" },
  },
  {
    label: "Add NOT NULL column, no default (medium)",
    operation_type: "db.migration",
    statement: "ALTER TABLE users ADD COLUMN country text NOT NULL;",
    agent: "claude-code",
    session_id: "demo",
    target: "users",
    context: { table: "users", row_count: 5, environment: "production" },
  },
  {
    label: "Create table (safe / auto-allowed)",
    operation_type: "db.migration",
    statement:
      "CREATE TABLE feature_flags (id uuid primary key default gen_random_uuid(), key text not null, enabled boolean not null default false);",
    agent: "claude-code",
    session_id: "demo",
    target: "feature_flags",
    context: { environment: "production" },
  },
];
