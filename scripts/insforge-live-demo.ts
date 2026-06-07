/**
 * Live InsForge demo flow — persists to agent_actions and applies via InsForge.
 * Usage: npm run demo:insforge
 *
 * Safer than full cinematic approve: exercises auto-apply + pending + rollback
 * without permanently dropping demo columns (reject the risky op).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.local");

const PORT = process.env.FORGEGUARD_LIVE_PORT ?? "3014";
const baseUrl = `http://127.0.0.1:${PORT}`;
const token = process.env.FORGEGUARD_OPERATOR_TOKEN;
const REQUEST_TIMEOUT_MS = Number(process.env.FORGEGUARD_LIVE_TIMEOUT_MS ?? 120_000);

const headers: Record<string, string> = { "content-type": "application/json" };
if (token) headers["x-forgeguard-token"] = token;

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string>) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

async function waitForServer(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${baseUrl} did not become ready`);
}

async function existingLiveServer(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return false;
    const health = (await res.json()) as { store?: string; executor?: string };
    return health.store === "insforge" && health.executor === "insforge";
  } catch {
    return false;
  }
}

function startDevServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "dev", "-p", PORT], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORGEGUARD_STORE: "insforge",
        FORGEGUARD_EXECUTOR: "insforge",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    let stderr = "";
    const onReady = () => {
      if (settled) return;
      settled = true;
      resolve(child);
    };

    child.stdout?.on("data", (c: Buffer) => {
      if (c.toString().includes("Ready")) onReady();
    });
    child.stderr?.on("data", (c: Buffer) => {
      const chunk = c.toString();
      stderr += chunk;
      if (chunk.includes("Ready")) onReady();
      if (chunk.includes("EADDRINUSE")) {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              `Port ${PORT} is already in use. Stop the other dev server or set FORGEGUARD_LIVE_PORT.`,
            ),
          );
        }
      }
    });
    child.on("error", (err) => {
      if (!settled) reject(err);
    });
    child.on("exit", (code) => {
      if (!settled) {
        reject(
          new Error(
            `Dev server exited with code ${code}${stderr ? `: ${stderr.trim().slice(-300)}` : ""}`,
          ),
        );
      }
    });
    setTimeout(() => {
      if (!settled) reject(new Error("Dev server startup timeout"));
    }, 120_000);
  });
}

async function step(label: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`→ ${label}…`);
  try {
    await fn();
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(` done (${secs}s)\n`);
  } catch (err) {
    process.stdout.write("\n");
    throw err;
  }
}

async function main() {
  if (!process.env.INSFORGE_URL || !process.env.INSFORGE_KEY) {
    throw new Error("INSFORGE_URL and INSFORGE_KEY required (.env.local)");
  }

  console.log(`Live demo against InsForge (${process.env.INSFORGE_URL})`);
  console.log(
    "Note: seed_baseline calls the model gateway + applies SQL on InsForge (~20–30s is normal).\n",
  );

  let devServer: ChildProcess | null = null;
  let spawned = false;

  if (await existingLiveServer()) {
    console.log(`✓ reusing dev server at ${baseUrl}`);
  } else {
    devServer = await startDevServer();
    spawned = true;
    await waitForServer();
    console.log(`✓ dev server ready at ${baseUrl} (store=insforge, executor=insforge)`);
  }

  try {
    await step("health check", async () => {
      const { res, body } = await req("/api/health");
      assert(res.ok, `health failed: ${res.status}`);
      const health = body as {
        store: string;
        executor: string;
        insforge_reachable: boolean;
      };
      assert(health.store === "insforge", `expected insforge store, got ${health.store}`);
      assert(health.executor === "insforge", `expected insforge executor, got ${health.executor}`);
      assert(health.insforge_reachable, "InsForge should be reachable");
    });

    await step("reset audit trail", async () => {
      const { res, body } = await req("/api/demo", {
        method: "POST",
        body: JSON.stringify({ action: "reset" }),
      });
      assert(res.ok, `reset failed: ${res.status} ${JSON.stringify(body)}`);
    });

    let baselineId = "";
    await step("seed_baseline (classify + CREATE TABLE on InsForge)", async () => {
      const { res, body } = await req("/api/demo", {
        method: "POST",
        body: JSON.stringify({ action: "seed_baseline" }),
      });
      assert(res.ok, `seed_baseline failed: ${res.status} ${JSON.stringify(body)}`);
      baselineId = (body as { id: string }).id;
    });
    console.log(`  baseline id=${baselineId.slice(0, 8)}…`);

    let dropId = "";
    await step("intercept DROP COLUMN (op 0)", async () => {
      const { res, body } = await req("/api/demo", {
        method: "POST",
        body: JSON.stringify({ index: 0 }),
      });
      assert(res.ok, `op 0 failed: ${res.status} ${JSON.stringify(body)}`);
      dropId = (body as { id: string }).id;
    });
    console.log(`  drop op id=${dropId.slice(0, 8)}…`);

    await step("verify drop is pending", async () => {
      const { res, body } = await req("/api/actions");
      assert(res.ok, `list failed: ${res.status}`);
      const actions = (body as { actions: { id: string; status: string }[] }).actions;
      const drop = actions.find((a) => a.id === dropId);
      assert(drop?.status === "pending", `drop should stay pending, got ${drop?.status}`);
    });

    await step("reject DROP COLUMN", async () => {
      const { res, body } = await req(`/api/actions/${dropId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "reject", reviewed_by: "live-demo" }),
      });
      assert(res.ok, `reject failed: ${res.status} ${JSON.stringify(body)}`);
    });

    await step("rollback baseline CREATE TABLE", async () => {
      const { res, body } = await req(`/api/actions/${baselineId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "rollback", reviewed_by: "live-demo" }),
      });
      assert(res.ok, `rollback failed: ${res.status} ${JSON.stringify(body)}`);
      assert(
        (body as { action: { status: string } }).action.status === "rolled_back",
        "baseline should be rolled_back",
      );
    });

    await step("clean up audit trail", async () => {
      const { res, body } = await req("/api/demo", {
        method: "POST",
        body: JSON.stringify({ action: "reset" }),
      });
      assert(res.ok, `final reset failed: ${res.status} ${JSON.stringify(body)}`);
    });

    console.log("\n=== LIVE INSFORGE DEMO PASSED ===");
  } finally {
    if (spawned && devServer && !devServer.killed) {
      devServer.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("TimeoutError") || msg.includes("timed out")) {
    console.error(
      `\nLIVE DEMO FAILED: request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`,
    );
    console.error("Check InsForge connectivity and model gateway (OPENROUTER_API_KEY).");
  } else {
    console.error("\nLIVE DEMO FAILED:", msg);
  }
  process.exit(1);
});

export {};
