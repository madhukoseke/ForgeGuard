import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_POLICY,
  MASKED_PLACEHOLDER,
  checkPolicy,
  loadPolicy,
  maskRows,
  referencedTables,
  setPolicyForTests,
} from "../lib/policy";

function policy(overrides: Partial<typeof DEFAULT_POLICY>) {
  return { ...DEFAULT_POLICY, ...overrides };
}

test("referencedTables extracts tables from common clauses", () => {
  assert.deepEqual(referencedTables("SELECT * FROM users"), ["users"]);
  assert.deepEqual(
    referencedTables(
      "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id",
    ).sort(),
    ["customers", "orders"],
  );
  assert.deepEqual(referencedTables("INSERT INTO audit_log VALUES (1)"), [
    "audit_log",
  ]);
  assert.deepEqual(referencedTables("UPDATE accounts SET x = 1"), ["accounts"]);
  assert.deepEqual(referencedTables("TRUNCATE sessions"), ["sessions"]);
});

test("checkPolicy blocks denied tables", () => {
  const p = policy({ denied_tables: ["secrets"] });
  const violation = checkPolicy("SELECT * FROM secrets", p);
  assert.equal(violation?.rule, "denied_table");
  assert.equal(checkPolicy("SELECT * FROM users", p), null);
});

test("checkPolicy blocks statement classes outside the allowlist", () => {
  const p = policy({ allowed_statements: ["select", "with"] });
  const violation = checkPolicy("DELETE FROM users WHERE id = 1", p);
  assert.equal(violation?.rule, "statement_not_allowed");
  assert.equal(checkPolicy("SELECT 1", p), null);
});

test("maskRows masks bare and table-qualified columns", () => {
  const p = policy({ masked_columns: ["password_hash", "users.email"] });
  const { rows, masked_cells } = maskRows(
    [
      { id: 1, email: "a@example.com", password_hash: "xxx" },
      { id: 2, email: "b@example.com", password_hash: null },
    ],
    ["users"],
    p,
  );
  assert.equal(masked_cells, 3); // 2 emails + 1 non-null hash
  assert.equal(rows[0].email, MASKED_PLACEHOLDER);
  assert.equal(rows[0].password_hash, MASKED_PLACEHOLDER);
  assert.equal(rows[1].password_hash, null);
  assert.equal(rows[0].id, 1);
});

test("maskRows does not mask qualified columns of other tables", () => {
  const p = policy({ masked_columns: ["users.email"] });
  const { rows, masked_cells } = maskRows(
    [{ email: "ops@example.com" }],
    ["invoices"],
    p,
  );
  assert.equal(masked_cells, 0);
  assert.equal(rows[0].email, "ops@example.com");
});

test("loadPolicy falls back to defaults when no config exists", () => {
  setPolicyForTests(null);
  const p = loadPolicy();
  assert.equal(p.max_rows, DEFAULT_POLICY.max_rows);
  assert.deepEqual(p.denied_tables, []);
  assert.equal(p.approval_threshold, "medium");
  assert.equal(p.blast_radius_probe, false);
  setPolicyForTests(null);
});

test("referencedTables prefers AST for quoted identifiers", () => {
  assert.deepEqual(
    referencedTables('SELECT * FROM "api_keys"').sort(),
    ["api_keys"],
  );
});

test("checkPolicy uses AST statement class for CTE deletes", () => {
  const p = policy({ allowed_statements: ["select", "with"] });
  const violation = checkPolicy(
    "WITH t AS (SELECT 1) DELETE FROM users;",
    p,
  );
  assert.equal(violation?.rule, "statement_not_allowed");
  assert.match(violation!.detail, /DELETE/);
});
