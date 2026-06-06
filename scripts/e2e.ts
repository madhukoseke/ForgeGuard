/**
 * End-to-end API verification for ForgeGuard.
 * Spawns an isolated simulated dev server unless FORGEGUARD_BASE_URL is set.
 */
import { spawn, type ChildProcess } from "node:child_process";

const E2E_PORT = process.env.FORGEGUARD_E2E_PORT ?? "3010";
const token = process.env.FORGEGUARD_OPERATOR_TOKEN;

const headers: Record<string, string> = { "content-type": "application/json" };
if (token) headers["x-forgeguard-token"] = token;

async function req(baseUrl: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string>) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function waitForServer(url: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready`);
}

function startSimulatedDevServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "dev", "-p", E2E_PORT], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORGEGUARD_EXECUTOR: "simulated",
        FORGEGUARD_STORE: "memory",
        FORGEGUARD_BRANCH_MODE: "",
        INSFORGE_URL: "",
        INSFORGE_KEY: "",
        OPENROUTER_API_KEY: "",
        LIM_API_KEY: "",
        LIMRUN_INSTANCE_ID: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    const onReady = () => {
      if (settled) return;
      settled = true;
      resolve(child);
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("Ready")) onReady();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("Ready")) onReady();
    });
    child.on("error", (err) => {
      if (!settled) reject(err);
    });
    child.on("exit", (code) => {
      if (!settled) reject(new Error(`Dev server exited with code ${code}`));
    });

    setTimeout(() => {
      if (!settled) reject(new Error("Dev server startup timeout"));
    }, 90_000);
  });
}

async function main() {
  const externalBase = process.env.FORGEGUARD_BASE_URL?.replace(/\/$/, "");
  let devServer: ChildProcess | null = null;
  const baseUrl = externalBase ?? `http://127.0.0.1:${E2E_PORT}`;

  try {
    if (!externalBase) {
      console.log(`Starting simulated dev server on port ${E2E_PORT}...`);
      devServer = await startSimulatedDevServer();
      await waitForServer(baseUrl);
      console.log("✓ dev server ready");
    }

    console.log(`E2E against ${baseUrl}`);

    const home = await fetch(baseUrl);
    assert(home.ok, `homepage expected 200, got ${home.status}`);
    console.log("✓ homepage 200");

    let { res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    });
    assert(res.ok, `reset failed: ${res.status} ${JSON.stringify(body)}`);
    console.log("✓ reset trail");

    ({ res, body } = await req(baseUrl, "/api/guard/op", {
      method: "POST",
      body: JSON.stringify({
        operation_type: "db.migration",
        statement: "ALTER TABLE users ADD COLUMN nickname text;",
        context: { table: "users", row_count: 5 },
      }),
    }));
    assert(res.status === 200, `safe op expected 200, got ${res.status}`);
    const safe = body as {
      id: string;
      status: string;
      requires_approval: boolean;
      applied?: boolean;
    };
    assert(safe.status === "applied", "safe op should be applied after auto-apply");
    assert(safe.applied !== false, "safe op should report applied");
    console.log("✓ safe op applied (200)");

    ({ res, body } = await req(baseUrl, "/api/guard/op", {
      method: "POST",
      body: JSON.stringify({
        operation_type: "db.migration",
        statement: "ALTER TABLE users DROP COLUMN last_login;",
        context: { table: "users", row_count: 5, environment: "production" },
      }),
    }));
    assert(res.status === 202, `risky op expected 202, got ${res.status}`);
    const risky = body as { id: string; requires_approval: boolean; status: string };
    assert(risky.requires_approval, "risky op should require approval");
    assert(risky.status === "pending", "risky op should be pending");
    console.log("✓ risky op pending (202)");

    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `list failed: ${res.status}`);
    const actions = (body as { actions: unknown[] }).actions;
    assert(actions.length === 2, `expected 2 actions after reset, got ${actions.length}`);
    console.log("✓ list returns 2 actions");

    ({ res, body } = await req(baseUrl, `/api/actions/${risky.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approve", reviewed_by: "e2e" }),
    }));
    assert(res.ok, `approve failed: ${res.status}`);
    const approved = (body as { action: { status: string; rollback_ref: string | null } }).action;
    assert(approved.status === "applied", "approve should set applied");
    assert(approved.rollback_ref, "approve should set rollback_ref");
    console.log("✓ approve → applied");

    ({ res, body } = await req(baseUrl, `/api/actions/${safe.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "rollback", reviewed_by: "e2e" }),
    }));
    assert(res.ok, `rollback failed: ${res.status}`);
    assert(
      (body as { action: { status: string } }).action.status === "rolled_back",
      "rollback should set rolled_back",
    );
    console.log("✓ rollback → rolled_back");

    ({ res, body } = await req(baseUrl, "/api/guard/op", {
      method: "POST",
      body: JSON.stringify({
        operation_type: "db.migration",
        statement: "DROP TABLE users;",
        context: { table: "users", row_count: 5 },
      }),
    }));
    const drop = body as { id: string };
    ({ res, body } = await req(baseUrl, `/api/actions/${drop.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "reject", reviewed_by: "e2e" }),
    }));
    assert(res.ok, `reject failed: ${res.status}`);
    assert(
      (body as { action: { status: string } }).action.status === "rejected",
      "reject should set rejected",
    );
    console.log("✓ reject → rejected");

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "seed_all" }),
    }));
    assert(res.ok, `seed_all failed: ${res.status}`);
    assert((body as { count: number }).count === 8, "seed_all should create 8 ops");
    console.log("✓ seed_all (8 demo ops)");

    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `final list failed: ${res.status} ${JSON.stringify(body)}`);
    const finalActions = (body as { actions?: unknown[] }).actions;
    assert(Array.isArray(finalActions), `final list missing actions array: ${JSON.stringify(body)}`);
    assert(finalActions.length >= 8, `expected at least 8 actions, got ${finalActions.length}`);
    console.log(`✓ final audit trail: ${finalActions.length} actions`);

    console.log("\n=== ALL E2E TESTS PASSED ===");
  } finally {
    if (devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message ?? err);
  process.exit(1);
});

export {};
