import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseListParams } from "../lib/list-params";

describe("parseListParams", () => {
  it("uses defaults when params omitted", () => {
    const p = parseListParams(new URLSearchParams());
    assert.equal(p.limit, 100);
    assert.equal(p.offset, 0);
  });

  it("clamps limit to max", () => {
    const p = parseListParams(new URLSearchParams("limit=9999&offset=10"));
    assert.equal(p.limit, 500);
    assert.equal(p.offset, 10);
  });

  it("rejects negative offset", () => {
    const p = parseListParams(new URLSearchParams("offset=-5"));
    assert.equal(p.offset, 0);
  });
});
