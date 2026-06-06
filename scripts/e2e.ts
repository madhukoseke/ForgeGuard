/**
 * End-to-end API verification for ForgeGuard.
 * Run against a live dev server: npm run dev && npm run e2e
 */
const baseUrl = (process.env.FORGEGUARD_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const token = process.env.FORGEGUARD_OPERATOR_TOKEN;

const headers: Record<string, string> = { "content-type": "application/json" };
if (token) headers["x-forgeguard-token"] = token;

async function req(path: string, init: RequestInit = {}) {
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

async function main() {
  console.log(`E2E against ${baseUrl}`);

  // Homepage
  const home = await fetch(baseUrl);
  assert(home.ok, `homepage expected 200, got ${home.status}`);
  console.log("✓ homepage 200");

  // Reset
  let { res, body } = await req("/api/demo", {
    method: "POST",
    body: JSON.stringify({ action: "reset" }),
  });
  assert(res.ok, `reset failed: ${res.status} ${JSON.stringify(body)}`);
  console.log("✓ reset trail");

  // Safe op → auto_allowed
  ({ res, body } = await req("/api/guard/op", {
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

  // Risky op → pending
  ({ res, body } = await req("/api/guard/op", {
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

  // List
  ({ res, body } = await req("/api/actions"));
  assert(res.ok, `list failed: ${res.status}`);
  const actions = (body as { actions: unknown[] }).actions;
  assert(actions.length === 2, `expected 2 actions after reset, got ${actions.length}`);
  console.log("✓ list returns 2 actions");

  // Approve
  ({ res, body } = await req(`/api/actions/${risky.id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: "approve", reviewed_by: "e2e" }),
  }));
  assert(res.ok, `approve failed: ${res.status}`);
  const approved = (body as { action: { status: string; rollback_ref: string | null } }).action;
  assert(approved.status === "applied", "approve should set applied");
  assert(approved.rollback_ref, "approve should set rollback_ref");
  console.log("✓ approve → applied");

  // Rollback (safe op was auto-applied → status applied)
  ({ res, body } = await req(`/api/actions/${safe.id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: "rollback", reviewed_by: "e2e" }),
  }));
  assert(res.ok, `rollback failed: ${res.status}`);
  assert(
    (body as { action: { status: string } }).action.status === "rolled_back",
    "rollback should set rolled_back",
  );
  console.log("✓ rollback → rolled_back");

  // Reject
  ({ res, body } = await req("/api/guard/op", {
    method: "POST",
    body: JSON.stringify({
      operation_type: "db.migration",
      statement: "DROP TABLE users;",
      context: { table: "users", row_count: 5 },
    }),
  }));
  const drop = body as { id: string };
  ({ res, body } = await req(`/api/actions/${drop.id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: "reject", reviewed_by: "e2e" }),
  }));
  assert(res.ok, `reject failed: ${res.status}`);
  assert(
    (body as { action: { status: string } }).action.status === "rejected",
    "reject should set rejected",
  );
  console.log("✓ reject → rejected");

  // Seed all demo ops
  ({ res, body } = await req("/api/demo", {
    method: "POST",
    body: JSON.stringify({ action: "seed_all" }),
  }));
  assert(res.ok, `seed_all failed: ${res.status}`);
  assert((body as { count: number }).count === 8, "seed_all should create 8 ops");
  console.log("✓ seed_all (8 demo ops)");

  // Final list
  ({ res, body } = await req("/api/actions"));
  const finalCount = (body as { actions: unknown[] }).actions.length;
  assert(finalCount >= 8, `expected at least 8 actions, got ${finalCount}`);
  console.log(`✓ final audit trail: ${finalCount} actions`);

  console.log("\n=== ALL E2E TESTS PASSED ===");
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message ?? err);
  process.exit(1);
});

export {};
