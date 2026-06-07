/**
 * End-to-end verification for Replicas webhook integration.
 * Spawns an isolated dev server with REPLICAS_WEBHOOK_SECRET set.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";

const PORT = process.env.FORGEGUARD_E2E_PORT ?? "3011";
const SECRET = "whsec_e2e_test";
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
        REPLICAS_WEBHOOK_SECRET: SECRET,
        INSFORGE_URL: "",
        INSFORGE_KEY: "",
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
  console.log(`Starting dev server on port ${PORT}...`);
  const child = await startServer();
  await waitForServer(base);
  console.log("✓ dev server ready");

  try {
    const getWh = await fetch(`${base}/api/webhooks/replicas`);
    const getWhBody = await getWh.json();
    assert(getWh.ok, `GET webhook failed: ${getWh.status}`);
    assert(getWhBody.ok === true, "GET webhook should return ok");
    assert(getWhBody.signature_required === true, "signature_required should be true");
    console.log("✓ GET /api/webhooks/replicas");

    const health = await fetch(`${base}/api/health`);
    const healthBody = await health.json();
    assert(healthBody.replicas_webhook === true, "health should report replicas_webhook");
    console.log("✓ GET /api/health replicas_webhook=true");

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
        statement: "DROP TABLE sessions;",
        agent: "replicas",
        session_id: "rep-e2e-1",
        target: "sessions",
        context: { table: "sessions", row_count: 1240, environment: "production" },
      }),
    });
    const guardBody = (await guardRes.json()) as {
      id: string;
      status: string;
      requires_approval: boolean;
    };
    assert(guardRes.status === 202, `guard op expected 202, got ${guardRes.status}`);
    assert(guardBody.status === "pending", "guard op should be pending");
    assert(guardBody.requires_approval, "guard op should require approval");
    console.log("✓ POST /api/guard/op (replicas agent → pending 202)");

    const badWh = await fetch(`${base}/api/webhooks/replicas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "replica.turn_completed",
        replica: { id: "rep-e2e-1", name: "test", status: "active" },
      }),
    });
    assert(badWh.status === 401, `unsigned webhook expected 401, got ${badWh.status}`);
    console.log("✓ POST webhook without signature → 401");

    const payload = {
      id: "wh_1",
      type: "replica.turn_completed",
      created_at: "2026-01-01T00:00:00Z",
      replica: { id: "rep-e2e-1", name: "fix", status: "active" },
      data: {
        pr_urls: ["https://github.com/o/r/pull/99"],
        repository_statuses: [
          {
            repository: "monorepo",
            branch: "fix",
            default_branch: "main",
            pr_urls: ["https://github.com/o/r/pull/100"],
          },
        ],
      },
    };
    const raw = JSON.stringify(payload);
    const sig = `sha256=${createHmac("sha256", SECRET).update(raw, "utf8").digest("hex")}`;
    const goodWh = await fetch(`${base}/api/webhooks/replicas`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-replicas-signature": sig,
        "x-replicas-event": "replica.turn_completed",
      },
      body: raw,
    });
    const goodWhBody = (await goodWh.json()) as {
      ok: boolean;
      enriched: number;
      pr_urls: string[];
    };
    assert(goodWh.ok, `signed webhook failed: ${goodWh.status}`);
    assert(goodWhBody.enriched === 1, `expected 1 enriched, got ${goodWhBody.enriched}`);
    assert(goodWhBody.pr_urls.length === 2, "expected 2 PR URLs");
    console.log("✓ POST webhook with valid signature → enriched audit row");

    const list = await fetch(`${base}/api/actions`);
    const actions = (await list.json()) as {
      actions: Array<{ id: string; replica_id: string | null; pr_urls: string[] | null }>;
    };
    const action = actions.actions.find((a) => a.id === guardBody.id);
    assert(action, "action not found in audit log");
    assert(action.replica_id === "rep-e2e-1", `replica_id mismatch: ${action.replica_id}`);
    assert(
      Array.isArray(action.pr_urls) && action.pr_urls.length === 2,
      `pr_urls mismatch: ${JSON.stringify(action.pr_urls)}`,
    );
    console.log("✓ audit row enriched with replica_id + pr_urls");

    console.log("\n=== REPLICAS E2E PASSED ===");
  } finally {
    if (!child.killed) child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("\nREPLICAS E2E FAILED:", err.message ?? err);
  process.exit(1);
});
