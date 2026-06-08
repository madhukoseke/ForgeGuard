/**
 * Bootstrap ForgeGuard schema on a linked InsForge project.
 * Usage: npm run bootstrap:insforge
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  getInsForgeConfig,
  InsForgeClient,
  migrationVersion,
} from "../lib/insforge-client";

interface ProjectJson {
  oss_host?: string;
  api_key?: string;
}

function loadClient(): InsForgeClient {
  const fromEnv = getInsForgeConfig();
  if (fromEnv) return new InsForgeClient(fromEnv);

  const projectPath = join(process.cwd(), ".insforge", "project.json");
  if (!existsSync(projectPath)) {
    throw new Error(
      "No InsForge config found. Set INSFORGE_URL/INSFORGE_KEY or run `npx @insforge/cli link`.",
    );
  }

  const project = JSON.parse(readFileSync(projectPath, "utf8")) as ProjectJson;
  if (!project.oss_host || !project.api_key) {
    throw new Error(".insforge/project.json missing oss_host or api_key");
  }
  return new InsForgeClient({ url: project.oss_host, key: project.api_key });
}

const AGENT_ACTIONS_SQL = `
create table if not exists agent_actions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  agent             text not null,
  session_id        text,
  action_type       text not null check (action_type in ('db.migration', 'function.deploy', 'storage.config', 'auth.config')),
  target            text,
  statement         text not null,
  diff              text,
  severity          text not null check (severity in ('safe', 'low', 'medium', 'high', 'critical')),
  category          text not null check (category in ('destructive', 'data_loss', 'security', 'cost', 'migration_risk', 'benign')),
  rationale         text,
  blast_radius      text,
  requires_approval boolean not null default false,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied', 'rolled_back', 'auto_allowed')),
  reviewed_by       text,
  reviewed_at       timestamptz,
  safer_alternative text,
  branch            text,
  rollback_ref      text,
  source            text not null default 'deterministic' check (source in ('deterministic', 'llm')),
  replica_id        text,
  pr_urls           jsonb,
  preview_url       text,
  applied_safer     boolean not null default false
);

create index if not exists agent_actions_created_at_idx on agent_actions (created_at desc);
create index if not exists agent_actions_status_idx on agent_actions (status);
create index if not exists agent_actions_severity_idx on agent_actions (severity);
create index if not exists agent_actions_session_id_idx on agent_actions (session_id);
create index if not exists agent_actions_replica_id_idx on agent_actions (replica_id);
`.trim();

const USERS_DEMO_SQL = `
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
`.trim();

function nextMigrationVersion(existing: { version: string }[]): string {
  const numeric = existing
    .map((m) => m.version)
    .filter((v) => /^\d+$/.test(v))
    .map((v) => BigInt(v));
  const latest = numeric.length
    ? numeric.reduce((a, b) => (a > b ? a : b))
    : BigInt(0);
  const candidate = BigInt(migrationVersion());
  return String(latest >= candidate ? latest + BigInt(1) : candidate);
}

async function ensureMigration(
  client: InsForgeClient,
  name: string,
  sql: string,
  delayMs = 0,
): Promise<void> {
  const existing = await client.listMigrations();
  if (existing.some((m) => m.name === name)) {
    console.log(`✓ migration "${name}" already applied`);
    return;
  }
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const version = nextMigrationVersion(existing);
  await client.createMigration({ version, name, sql });
  console.log(`✓ applied migration "${name}" (${version})`);
}

const ENRICHMENT_COLUMNS_SQL = `
alter table agent_actions add column if not exists replica_id text;
alter table agent_actions add column if not exists pr_urls jsonb;
alter table agent_actions add column if not exists preview_url text;
alter table agent_actions add column if not exists applied_safer boolean not null default false;
`.trim();

async function main() {
  const client = loadClient();
  console.log(`Bootstrapping ForgeGuard on ${client.url}`);

  if (!(await client.healthCheck())) {
    throw new Error("InsForge health check failed");
  }
  console.log("✓ InsForge health OK");

  await ensureMigration(client, "forgeguard-agent-actions", AGENT_ACTIONS_SQL);
  await ensureMigration(
    client,
    "forgeguard-agent-actions-enrichment",
    ENRICHMENT_COLUMNS_SQL,
    500,
  );
  await ensureMigration(client, "forgeguard-users-demo", USERS_DEMO_SQL, 500);

  const rows = await client.queryRecords<{ id: string }>("agent_actions", "?limit=1");
  console.log(`✓ agent_actions table reachable (${rows.length} row sample)`);

  console.log("\n--- Add to .env.local / Vercel ---");
  console.log(`INSFORGE_URL=${client.url}`);
  console.log("INSFORGE_KEY=<copy from InsForge dashboard>");
  console.log("FORGEGUARD_STORE=insforge");
  console.log("FORGEGUARD_EXECUTOR=insforge");
  console.log("FORGEGUARD_OPERATOR_TOKEN=<generate a strong secret>");
  console.log("\nBootstrap complete.");
}

main().catch((err) => {
  console.error("\nBootstrap FAILED:", err.message ?? err);
  process.exit(1);
});

export {};
