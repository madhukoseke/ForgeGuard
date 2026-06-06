/**
 * Live InsForge integration checks (requires INSFORGE_URL + INSFORGE_KEY).
 * Usage: npm run integration:insforge
 */
import { getInsForgeConfig, InsForgeClient } from "../lib/insforge-client";
import { buildCompensatingSql } from "../lib/insforge-executor";

async function main() {
  const config = getInsForgeConfig();
  if (!config) {
    console.error("Set INSFORGE_URL and INSFORGE_KEY to run integration tests.");
    process.exit(1);
  }

  const client = new InsForgeClient(config);
  console.log(`Integration test against ${client.url}`);

  if (!(await client.healthCheck())) throw new Error("Health check failed");
  console.log("✓ health");

  const migrations = await client.listMigrations();
  const hasAgentActions = migrations.some((m) => m.name.includes("forgeguard"));
  if (!hasAgentActions) {
    console.warn("⚠ run npm run bootstrap:insforge first");
  } else {
    console.log("✓ forgeguard migrations present");
  }

  const compensating = buildCompensatingSql("ALTER TABLE users DROP COLUMN last_login;");
  if (!compensating) throw new Error("Expected compensating SQL for DROP COLUMN");
  console.log("✓ compensating SQL for DROP COLUMN");

  const rows = await client.queryRecords("agent_actions", "?limit=1");
  console.log(`✓ agent_actions query ok (${rows.length} row sample)`);

  console.log("\n=== INTEGRATION CHECKS PASSED ===");
}

main().catch((err) => {
  console.error("\nINTEGRATION FAILED:", err.message ?? err);
  process.exit(1);
});

export {};
