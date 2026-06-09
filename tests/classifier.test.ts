import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heuristicVerdict } from "../lib/classifier";

describe("heuristicVerdict", () => {
  it("flags DROP COLUMN as high severity with safer guidance", () => {
    const v = heuristicVerdict({
      operation_type: "db.migration",
      statement: "ALTER TABLE users DROP COLUMN last_login;",
      context: { table: "users", row_count: 5 },
    });
    assert.equal(v.severity, "high");
    assert.equal(v.category, "data_loss");
    assert.equal(v.requires_approval, true);
    assert.ok(v.safer_alternative);
    assert.match(v.blast_radius, /5 rows/);
  });

  it("treats safe CREATE TABLE as benign", () => {
    const v = heuristicVerdict({
      operation_type: "db.migration",
      statement: "CREATE TABLE audit_log (id uuid primary key);",
    });
    assert.equal(v.severity, "safe");
    assert.equal(v.requires_approval, false);
  });

  it("flags DROP TABLE as critical", () => {
    const v = heuristicVerdict({
      operation_type: "db.migration",
      statement: "DROP TABLE sessions;",
      context: { table: "sessions", row_count: 100 },
    });
    assert.equal(v.severity, "critical");
    assert.equal(v.requires_approval, true);
  });
});
