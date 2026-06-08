-- ForgeGuard data model (InsForge Postgres) — §4 of the prep kit.
-- Apply this to your InsForge project before switching FORGEGUARD_STORE=insforge.

create table if not exists agent_actions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  agent             text not null,            -- 'claude-code' | 'devin' | 'replicas'
  session_id        text,
  action_type       text not null check (action_type in ('db.migration', 'function.deploy', 'storage.config', 'auth.config')),
  target            text,                     -- table/function/bucket name
  statement         text not null,            -- raw SQL / config / deploy descriptor
  diff              text,                     -- human-readable diff
  severity          text not null check (severity in ('safe', 'low', 'medium', 'high', 'critical')),
  category          text not null check (category in ('destructive', 'data_loss', 'security', 'cost', 'migration_risk', 'benign')),
  rationale         text,
  blast_radius      text,
  requires_approval boolean not null default false,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied', 'rolled_back', 'auto_allowed')),
  reviewed_by       text,
  reviewed_at       timestamptz,
  safer_alternative text,
  branch            text,                     -- insforge preview branch
  rollback_ref      text,                     -- JSON snapshot or compensating SQL
  source            text not null default 'deterministic' check (source in ('deterministic', 'llm')),
  replica_id        text,                     -- Replicas workspace id (webhook enrichment)
  pr_urls           jsonb,                    -- PR URLs opened by Replicas agent
  preview_url       text,                     -- Limrun signed stream URL for mobile review
  applied_safer     boolean not null default false  -- true when approve applied safer_alternative SQL
);

create index if not exists agent_actions_session_id_idx on agent_actions (session_id);
create index if not exists agent_actions_replica_id_idx on agent_actions (replica_id);

create index if not exists agent_actions_created_at_idx on agent_actions (created_at desc);
create index if not exists agent_actions_status_idx on agent_actions (status);
create index if not exists agent_actions_severity_idx on agent_actions (severity);

-- Demo seed: a users table with ~5 rows and a last_login column to target (§9).
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz not null default now(),
  last_login  timestamptz
);

insert into users (email, last_login) values
  ('ada@example.com',    now() - interval '1 day'),
  ('grace@example.com',  now() - interval '2 days'),
  ('linus@example.com',  now() - interval '3 days'),
  ('margaret@example.com', now() - interval '4 days'),
  ('alan@example.com',   now() - interval '5 days')
on conflict (email) do nothing;
