import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "./safe-return-path.ts";

test("accepts only same-site relative return paths", () => {
  assert.equal(safeReturnPath("/wardrobe?category=tops"), "/wardrobe?category=tops");
  for (const unsafe of [null, "https://attacker.example", "//attacker.example", "javascript:alert(1)", "/\\attacker.example"]) {
    assert.equal(safeReturnPath(unsafe), "/dashboard");
  }
});
