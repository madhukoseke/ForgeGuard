import assert from "node:assert/strict";
import test from "node:test";
import { prefilter } from "../lib/prefilter";

function pf(statement: string) {
  return prefilter({
    operation_type: "db.migration",
    statement,
  });
}

test("DROP TABLE is critical destructive", () => {
  const v = pf("DROP TABLE users;");
  assert.equal(v.severity, "critical");
  assert.equal(v.category, "destructive");
  assert.equal(v.requires_approval, true);
});

test("TRUNCATE is critical data_loss", () => {
  const v = pf("TRUNCATE users;");
  assert.equal(v.severity, "critical");
  assert.equal(v.category, "data_loss");
});

test("DELETE without WHERE is critical data_loss", () => {
  const v = pf("DELETE FROM orders;");
  assert.equal(v.severity, "critical");
  assert.equal(v.category, "data_loss");
});

test("UPDATE without WHERE is critical data_loss", () => {
  const v = pf("UPDATE orders SET status = 'cancelled';");
  assert.equal(v.severity, "critical");
});

test("DROP COLUMN is high data_loss", () => {
  const v = pf("ALTER TABLE users DROP COLUMN last_login;");
  assert.equal(v.severity, "high");
  assert.equal(v.category, "data_loss");
  assert.equal(v.requires_approval, true);
});

test("ALTER COLUMN TYPE is high data_loss", () => {
  const v = pf("ALTER TABLE users ALTER COLUMN age TYPE smallint;");
  assert.equal(v.severity, "high");
  assert.equal(v.category, "data_loss");
});

test("DISABLE RLS is high security", () => {
  const v = pf("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");
  assert.equal(v.severity, "high");
  assert.equal(v.category, "security");
});

test("DROP POLICY is high security", () => {
  const v = pf("DROP POLICY users_select ON users;");
  assert.equal(v.severity, "high");
  assert.equal(v.category, "security");
});

test("public bucket config is high security", () => {
  const v = prefilter({
    operation_type: "storage.config",
    statement: '{ "bucket": "avatars", "public": true }',
  });
  assert.equal(v.severity, "high");
  assert.equal(v.category, "security");
});

test("JWT secret rotation is high security", () => {
  const v = pf("rotate jwt secret for production;");
  assert.equal(v.severity, "high");
  assert.equal(v.category, "security");
});

test("ADD COLUMN NOT NULL without default is medium migration_risk", () => {
  const v = pf("ALTER TABLE users ADD COLUMN country text NOT NULL;");
  assert.equal(v.severity, "medium");
  assert.equal(v.category, "migration_risk");
  assert.equal(v.requires_approval, true);
});

test("CREATE INDEX without CONCURRENTLY is low migration_risk", () => {
  const v = pf("CREATE INDEX users_email_idx ON users (email);");
  assert.equal(v.severity, "low");
  assert.equal(v.category, "migration_risk");
  assert.equal(v.requires_approval, false);
});

test("CREATE TABLE with no destructive patterns is safe benign", () => {
  const v = pf(
    "CREATE TABLE feature_flags (id uuid primary key, key text not null);",
  );
  assert.equal(v.severity, "safe");
  assert.equal(v.category, "benign");
  assert.equal(v.requires_approval, false);
});
