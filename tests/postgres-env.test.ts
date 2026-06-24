import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  hasPostgresConnectionUrl,
  postgresConnectionUrl,
} from "../lib/postgres-env";

const ORIG = {
  DATABASE_URL: process.env.DATABASE_URL,
  FORGEGUARD_DATABASE_URL: process.env.FORGEGUARD_DATABASE_URL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIG)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("postgresConnectionUrl prefers FORGEGUARD_DATABASE_URL", () => {
  process.env.FORGEGUARD_DATABASE_URL = "postgres://override/db";
  process.env.DATABASE_URL = "postgres://fallback/db";
  assert.equal(postgresConnectionUrl(), "postgres://override/db");
  assert.equal(hasPostgresConnectionUrl(), true);
});

test("postgresConnectionUrl falls back to DATABASE_URL", () => {
  delete process.env.FORGEGUARD_DATABASE_URL;
  process.env.DATABASE_URL = "postgres://fallback/db";
  assert.equal(postgresConnectionUrl(), "postgres://fallback/db");
});
