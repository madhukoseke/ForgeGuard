import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSql, astReferencedTables } from "../lib/sql-ast";

test("analyzeSql detects DROP TABLE via AST", () => {
  const a = analyzeSql("DROP TABLE users;");
  assert.equal(a.parsed, true);
  assert.equal(a.source, "ast");
  assert.equal(a.dropTable, true);
  assert.deepEqual(a.tables, ["users"]);
  assert.equal(a.statementClass, "drop");
});

test("analyzeSql detects unconditional DELETE including CTE wrappers", () => {
  const plain = analyzeSql("DELETE FROM orders;");
  assert.equal(plain.unconditionalWrite, true);
  const cte = analyzeSql("WITH t AS (SELECT 1) DELETE FROM orders;");
  assert.equal(cte.parsed, true);
  assert.equal(cte.unconditionalWrite, true);
  assert.equal(cte.statementClass, "delete");
});

test("analyzeSql ignores DELETE with WHERE", () => {
  const a = analyzeSql("DELETE FROM orders WHERE id = 1;");
  assert.equal(a.unconditionalWrite, false);
});

test("analyzeSql sees past leading comments", () => {
  const a = analyzeSql("/* comment */ DELETE FROM orders;");
  assert.equal(a.unconditionalWrite, true);
});

test("analyzeSql extracts quoted and schema-qualified tables", () => {
  const tables = astReferencedTables(
    'SELECT * FROM "secrets" JOIN public.users u ON true;',
  );
  assert.ok(tables);
  assert.deepEqual(tables!.sort(), ["secrets", "users"]);
});

test("analyzeSql returns unparsed on unsupported syntax", () => {
  const a = analyzeSql("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");
  assert.equal(a.parsed, false);
  assert.equal(a.source, "none");
});

test("analyzeSql detects ADD COLUMN NOT NULL without default", () => {
  const bad = analyzeSql(
    "ALTER TABLE users ADD COLUMN country text NOT NULL;",
  );
  assert.equal(bad.addNotNullNoDefault, true);
  const ok = analyzeSql(
    "ALTER TABLE users ADD COLUMN country text NOT NULL DEFAULT 'x';",
  );
  assert.equal(ok.addNotNullNoDefault, false);
});
