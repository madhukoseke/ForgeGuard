/**
 * End-to-end verification of the cinematic demo flow (dashboard "Run demo").
 */
import { spawn, type ChildProcess } from "node:child_process";

const E2E_PORT = process.env.FORGEGUARD_E2E_PORT ?? "3012";
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

    console.log(`\n=== Cinematic Demo E2E ===\n`);

    let { res, body } = await req(baseUrl, "/api/demo");
    assert(res.ok, `GET /api/demo failed: ${res.status}`);
    const ops = (body as { ops: { index: number; label: string }[] }).ops;
    assert(ops.length === 8, `expected 8 demo ops, got ${ops.length}`);
    console.log(`✓ GET /api/demo returns ${ops.length} ops`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    }));
    assert(res.ok, `reset failed: ${res.status} ${JSON.stringify(body)}`);
    console.log("✓ Step 1: reset trail");

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "seed_baseline" }),
    }));
    assert(res.ok, `seed_baseline failed: ${res.status} ${JSON.stringify(body)}`);
    const baseline = body as { id: string; severity: string };
    assert(baseline.id, "seed_baseline missing id");
    console.log(`✓ Step 2: seed_baseline → id=${baseline.id.slice(0, 8)}… severity=${baseline.severity}`);

    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `fetch actions failed: ${res.status}`);
    const allAfterBaseline = (body as { actions: { id: string; status: string }[] }).actions;
    const baselineAction = allAfterBaseline.find((a) => a.id === baseline.id)!;
    assert(baselineAction, "baseline not found in list");
    assert(
      baselineAction.status === "applied" || baselineAction.status === "auto_allowed",
      `baseline should be applied/auto_allowed, got ${baselineAction.status}`,
    );
    console.log(`  baseline status: ${baselineAction.status}`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ index: 0 }),
    }));
    assert(res.ok, `run op 0 failed: ${res.status} ${JSON.stringify(body)}`);
    const dropOp = body as { id: string; verdict: { severity: string; requires_approval: boolean } };
    assert(dropOp.id, "op 0 missing id");
    console.log(
      `✓ Step 3: op 0 (DROP COLUMN) → severity=${dropOp.verdict?.severity} requires_approval=${dropOp.verdict?.requires_approval}`,
    );

    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `fetch actions failed: ${res.status}`);
    const allAfterDrop = (body as { actions: { id: string; status: string; severity: string }[] }).actions;
    const dropAction = allAfterDrop.find((a) => a.id === dropOp.id)!;
    assert(dropAction, "drop op not found in list");
    assert(dropAction.status === "pending", `op 0 should be pending, got ${dropAction.status}`);
    assert(
      dropAction.severity === "high" || dropAction.severity === "critical",
      `op 0 should be high/critical, got ${dropAction.severity}`,
    );
    console.log(`  drop op status: ${dropAction.status}, severity: ${dropAction.severity}`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ index: 5 }),
    }));
    assert(res.ok, `run op 5 failed: ${res.status} ${JSON.stringify(body)}`);
    const bucketOp = body as { id: string; verdict: { severity: string; category: string } };
    console.log(
      `✓ Step 4: op 5 (public bucket) → severity=${bucketOp.verdict?.severity} category=${bucketOp.verdict?.category}`,
    );

    ({ res, body } = await req(baseUrl, `/api/actions/${dropOp.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "approve", reviewed_by: "demo-e2e" }),
    }));
    assert(res.ok, `approve drop failed: ${res.status} ${JSON.stringify(body)}`);
    const approved = (body as { action: { status: string; rollback_ref: string | null } }).action;
    assert(approved.status === "applied", `approve should set applied, got ${approved.status}`);
    console.log(`✓ Step 5: approve drop → status=${approved.status} rollback_ref=${approved.rollback_ref ? "set" : "missing"}`);

    ({ res, body } = await req(baseUrl, `/api/actions/${baseline.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "rollback", reviewed_by: "demo-e2e" }),
    }));
    assert(res.ok, `rollback baseline failed: ${res.status} ${JSON.stringify(body)}`);
    const rolled = (body as { action: { status: string } }).action;
    assert(rolled.status === "rolled_back", `rollback should set rolled_back, got ${rolled.status}`);
    console.log(`✓ Step 6: rollback baseline → status=${rolled.status}`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ index: 7 }),
    }));
    assert(res.ok, `run op 7 failed: ${res.status} ${JSON.stringify(body)}`);
    const autoAllow = body as { id: string };
    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `fetch actions failed: ${res.status}`);
    const autoAction = (body as { actions: { id: string; status: string }[] }).actions.find(
      (a) => a.id === autoAllow.id,
    )!;
    assert(autoAction, "auto-allow op not found");
    assert(
      autoAction.status === "applied" || autoAction.status === "auto_allowed",
      `op 7 should auto-apply, got ${autoAction.status}`,
    );
    console.log(`✓ Step 7: op 7 (auto-allow) → status=${autoAction.status}`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ index: 2 }),
    }));
    assert(res.ok, `run op 2 failed: ${res.status} ${JSON.stringify(body)}`);
    const dropTableOp = body as { id: string };
    ({ res, body } = await req(baseUrl, `/api/actions/${dropTableOp.id}`, {
      method: "PATCH",
      body: JSON.stringify({ decision: "reject", reviewed_by: "demo-e2e" }),
    }));
    assert(res.ok, `reject drop table failed: ${res.status} ${JSON.stringify(body)}`);
    const rejected = (body as { action: { status: string } }).action;
    assert(rejected.status === "rejected", `reject should set rejected, got ${rejected.status}`);
    console.log(`✓ Step 8: reject DROP TABLE → status=${rejected.status}`);

    ({ res, body } = await req(baseUrl, "/api/actions"));
    assert(res.ok, `list failed: ${res.status}`);
    const actions = (body as { actions: { status: string }[] }).actions;
    assert(actions.length >= 5, `expected at least 5 actions, got ${actions.length}`);
    console.log(`\n✓ Final trail: ${actions.length} actions`);

    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    }));
    ({ res, body } = await req(baseUrl, "/api/demo", {
      method: "POST",
      body: JSON.stringify({ action: "seed_all" }),
    }));
    assert(res.ok, `seed_all failed: ${res.status}`);
    assert((body as { count: number }).count === 8, "seed_all should create 8 ops");
    console.log("✓ seed_all creates 8 ops after reset");

    ({ res, body } = await req(baseUrl, "/api/health"));
    assert(res.ok, `health failed: ${res.status}`);
    const health = body as { store: string; executor: string };
    console.log(`✓ health: store=${health.store} executor=${health.executor}`);

    console.log("\n=== CINEMATIC DEMO E2E PASSED ===");
  } finally {
    if (devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("\nDEMO E2E FAILED:", err.message ?? err);
  process.exit(1);
});

export {};
