import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import {
  authenticateOperator,
  requireOperator,
  requireOperatorToken,
} from "../lib/api-auth";

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/actions", { headers });
}

describe("requireOperatorToken", () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function stash(...keys: string[]) {
    for (const key of keys) {
      saved[key] = process.env[key];
    }
  }

  it("allows requests when token is unset in development", () => {
    stash(
      "FORGEGUARD_OPERATOR_TOKEN",
      "FORGEGUARD_OPERATORS",
      "VERCEL",
      "NODE_ENV",
    );
    delete process.env.FORGEGUARD_OPERATOR_TOKEN;
    delete process.env.FORGEGUARD_OPERATORS;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "test";
    assert.equal(requireOperatorToken(req()), null);
    const auth = authenticateOperator(req());
    assert.equal(auth.ok, true);
    if (auth.ok) assert.equal(auth.operator.id, "local-dev");
  });

  it("rejects requests on Vercel when token is unset", () => {
    stash("FORGEGUARD_OPERATOR_TOKEN", "FORGEGUARD_OPERATORS", "VERCEL");
    delete process.env.FORGEGUARD_OPERATOR_TOKEN;
    delete process.env.FORGEGUARD_OPERATORS;
    process.env.VERCEL = "1";
    const res = requireOperatorToken(req());
    assert.ok(res);
    assert.equal(res!.status, 401);
  });

  it("accepts x-forgeguard-token when configured", () => {
    stash("FORGEGUARD_OPERATOR_TOKEN", "FORGEGUARD_OPERATORS");
    delete process.env.FORGEGUARD_OPERATORS;
    process.env.FORGEGUARD_OPERATOR_TOKEN = "secret";
    assert.equal(
      requireOperatorToken(req({ "x-forgeguard-token": "secret" })),
      null,
    );
  });

  it("accepts Authorization Bearer when configured", () => {
    stash("FORGEGUARD_OPERATOR_TOKEN", "FORGEGUARD_OPERATORS");
    delete process.env.FORGEGUARD_OPERATORS;
    process.env.FORGEGUARD_OPERATOR_TOKEN = "secret";
    assert.equal(
      requireOperatorToken(req({ authorization: "Bearer secret" })),
      null,
    );
  });

  it("rejects invalid token when configured", () => {
    stash("FORGEGUARD_OPERATOR_TOKEN", "FORGEGUARD_OPERATORS");
    delete process.env.FORGEGUARD_OPERATORS;
    process.env.FORGEGUARD_OPERATOR_TOKEN = "secret";
    const res = requireOperatorToken(req({ "x-forgeguard-token": "wrong" }));
    assert.ok(res);
    assert.equal(res!.status, 401);
  });

  it("resolves named operator from FORGEGUARD_OPERATORS", () => {
    stash(
      "FORGEGUARD_OPERATOR_TOKEN",
      "FORGEGUARD_OPERATORS",
      "FORGEGUARD_OPERATOR_ID",
    );
    delete process.env.FORGEGUARD_OPERATOR_TOKEN;
    process.env.FORGEGUARD_OPERATORS = JSON.stringify([
      { id: "alice", token: "alice-secret", name: "Alice" },
    ]);
    const auth = requireOperator(req({ "x-forgeguard-token": "alice-secret" }));
    assert.ok("operator" in auth);
    if ("operator" in auth) {
      assert.equal(auth.operator.id, "alice");
      assert.equal(auth.operator.displayName, "Alice");
    }
  });
});
