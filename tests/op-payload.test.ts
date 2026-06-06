import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFunctionDeploy,
  parseStorageConfig,
  looksLikeJson,
} from "../lib/op-payload";
import { buildCompensatingSql } from "../lib/insforge-executor";

test("parseStorageConfig reads bucket and public flag", () => {
  const payload = parseStorageConfig('{ "bucket": "avatars", "public": true }');
  assert.equal(payload?.bucket, "avatars");
  assert.equal(payload?.public, true);
});

test("parseFunctionDeploy requires slug and code", () => {
  const payload = parseFunctionDeploy(
    '{"slug":"hello","code":"export default async function() {}"}',
  );
  assert.equal(payload?.slug, "hello");
  assert.match(payload?.code ?? "", /export default/);
});

test("looksLikeJson distinguishes SQL from JSON", () => {
  assert.equal(looksLikeJson('{ "bucket": "x" }'), true);
  assert.equal(looksLikeJson("ALTER TABLE users DISABLE ROW LEVEL SECURITY;"), false);
});

test("buildCompensatingSql reverses DISABLE RLS", () => {
  const sql = buildCompensatingSql("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");
  assert.match(sql ?? "", /ENABLE ROW LEVEL SECURITY/i);
});
