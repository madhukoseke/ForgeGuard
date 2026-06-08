/**
 * End-to-end verification for Limrun mobile preview integration.
 * Requires LIM_API_KEY (or LIMRUN_INSTANCE_ID) in .env.local.
 *
 * Usage: npm run e2e:limrun
 */
import { spawn, type ChildProcess } from "node:child_process";
import { isLimrunConfigured } from "../lib/limrun";

const PORT = process.env.FORGEGUARD_E2E_PORT ?? "3013";
const base = `http://127.0.0.1:${PORT}`;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "dev", "-p", PORT], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORGEGUARD_EXECUTOR: "simulated",
        FORGEGUARD_STORE: "memory",
        INSFORGE_URL: "",
        INSFORGE_KEY: "",
        LIMRUN_MIN_SEVERITY: "medium",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    const onReady = () => {
      if (settled) return;
      settled = true;
      resolve(child);
    };
    child.stdout?.on("data", (c: Buffer) => {
      if (c.toString().includes("Ready")) onReady();
    });
    child.stderr?.on("data", (c: Buffer) => {
      if (c.toString().includes("Ready")) onReady();
    });
    child.on("error", reject);
    setTimeout(() => {
      if (!settled) reject(new Error("Dev server startup timeout"));
    }, 90_000);
  });
}

async function waitForServer(url: string) {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready`);
}

async function main() {
  if (!isLimrunConfigured()) {
    console.error("Set LIM_API_KEY or LIMRUN_INSTANCE_ID in .env.local");
    process.exit(1);
  }

  console.log(`Starting dev server on port ${PORT} (Limrun enabled)…`);
  const child = await startServer();
  await waitForServer(base);
  console.log("✓ dev server ready");

  try {
    const health = await fetch(`${base}/api/health`);
    const healthBody = (await health.json()) as { limrun?: boolean };
    assert(healthBody.limrun === true, "health should report limrun=true");
    console.log("✓ GET /api/health limrun=true");

    await fetch(`${base}/api/demo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });

    const guardRes = await fetch(`${base}/api/guard/op`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation_type: "db.migration",
        statement: "ALTER TABLE users DROP COLUMN last_login;",
        agent: "claude-code",
        session_id: "limrun-e2e",
        target: "users",
        context: { table: "users", row_count: 5, environment: "production" },
      }),
    });
    const guardBody = (await guardRes.json()) as {
      id: string;
      status: string;
      requires_approval: boolean;
      severity: string;
    };
    assert(guardRes.status === 202, `guard op expected 202, got ${guardRes.status}`);
    assert(guardBody.status === "pending", "guard op should be pending");
    assert(guardBody.requires_approval, "guard op should require approval");
    assert(
      guardBody.severity === "high" || guardBody.severity === "critical",
      `expected high/critical severity, got ${guardBody.severity}`,
    );
    console.log(`✓ POST /api/guard/op → pending (${guardBody.severity})`);

    const list = await fetch(`${base}/api/actions`);
    const actionsBody = (await list.json()) as {
      actions: Array<{
        id: string;
        preview_url: string | null;
        status: string;
        severity: string;
      }>;
    };
    const action = actionsBody.actions.find((a) => a.id === guardBody.id);
    assert(action, "action not found in audit log");
    assert(action.status === "pending", `expected pending, got ${action.status}`);
    assert(
      typeof action.preview_url === "string" && action.preview_url.length > 0,
      `preview_url missing on audit row: ${JSON.stringify(action.preview_url)}`,
    );
    assert(
      action.preview_url.includes("limrun") || action.preview_url.includes("signedStream"),
      `preview_url does not look like Limrun: ${action.preview_url}`,
    );
    console.log("✓ audit row has preview_url");
    console.log(`  preview: ${action.preview_url.slice(0, 80)}…`);

    console.log("\n=== LIMRUN E2E PASSED ===");
  } finally {
    if (!child.killed) child.kill("SIGTERM");
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\nLIMRUN E2E FAILED:", msg);
  process.exit(1);
});
