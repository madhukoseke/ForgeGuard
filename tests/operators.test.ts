import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { loadOperators, localDevOperator } from "../lib/operators";

const ORIG = {
  FORGEGUARD_OPERATOR_TOKEN: process.env.FORGEGUARD_OPERATOR_TOKEN,
  FORGEGUARD_OPERATOR_ID: process.env.FORGEGUARD_OPERATOR_ID,
  FORGEGUARD_OPERATOR_NAME: process.env.FORGEGUARD_OPERATOR_NAME,
  FORGEGUARD_OPERATORS: process.env.FORGEGUARD_OPERATORS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("loadOperators is empty when unset", () => {
  delete process.env.FORGEGUARD_OPERATOR_TOKEN;
  delete process.env.FORGEGUARD_OPERATORS;
  assert.deepEqual(loadOperators(), []);
});

test("loadOperators maps single token with default id", () => {
  delete process.env.FORGEGUARD_OPERATORS;
  delete process.env.FORGEGUARD_OPERATOR_ID;
  delete process.env.FORGEGUARD_OPERATOR_NAME;
  process.env.FORGEGUARD_OPERATOR_TOKEN = "secret";
  assert.deepEqual(loadOperators(), [
    { id: "operator", displayName: "operator", token: "secret" },
  ]);
});

test("loadOperators honors OPERATOR_ID and OPERATOR_NAME", () => {
  delete process.env.FORGEGUARD_OPERATORS;
  process.env.FORGEGUARD_OPERATOR_TOKEN = "secret";
  process.env.FORGEGUARD_OPERATOR_ID = "alice";
  process.env.FORGEGUARD_OPERATOR_NAME = "Alice Admin";
  assert.deepEqual(loadOperators(), [
    { id: "alice", displayName: "Alice Admin", token: "secret" },
  ]);
});

test("loadOperators parses FORGEGUARD_OPERATORS JSON", () => {
  delete process.env.FORGEGUARD_OPERATOR_TOKEN;
  process.env.FORGEGUARD_OPERATORS = JSON.stringify([
    { id: "alice", token: "a-secret", name: "Alice" },
    { id: "bob", token: "b-secret" },
  ]);
  const ops = loadOperators();
  assert.equal(ops.length, 2);
  assert.deepEqual(ops[0], {
    id: "alice",
    displayName: "Alice",
    token: "a-secret",
  });
  assert.deepEqual(ops[1], {
    id: "bob",
    displayName: "bob",
    token: "b-secret",
  });
});

test("localDevOperator is stable", () => {
  assert.equal(localDevOperator().id, "local-dev");
});
