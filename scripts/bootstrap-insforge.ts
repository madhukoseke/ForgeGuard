/**
 * Bootstrap ForgeGuard schema on a linked InsForge project.
 * Loads canonical SQL from sql/schema.sql.
 * Usage: npm run bootstrap:insforge
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getInsForgeConfig,
  InsForgeClient,
  migrationVersion,
} from "../lib/insforge-client";
import {
  getBootstrapMigrations,
  MIGRATION_NAMES,
} from "../lib/schema-sql";

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

async function main() {
  const client = loadClient();
  const migrations = getBootstrapMigrations();
  console.log(`Bootstrapping ForgeGuard on ${client.url}`);

  if (!(await client.healthCheck())) {
    throw new Error("InsForge health check failed");
  }
  console.log("✓ InsForge health OK");

  await ensureMigration(
    client,
    MIGRATION_NAMES.agentActions,
    migrations[MIGRATION_NAMES.agentActions],
  );
  await ensureMigration(
    client,
    MIGRATION_NAMES.agentActionsUpgrade,
    migrations[MIGRATION_NAMES.agentActionsUpgrade],
    500,
  );
  await ensureMigration(
    client,
    MIGRATION_NAMES.usersDemo,
    migrations[MIGRATION_NAMES.usersDemo],
    500,
  );

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
