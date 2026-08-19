import assert from "node:assert/strict";
import { describe, test } from "node:test";

void describe("module imports (coverage of entry-point lines)", () => {
  void test("constants.ts exports GENERATOR_NAME", async () => {
    const { GENERATOR_NAME } = await import("../src/constants.ts");
    assert.equal(GENERATOR_NAME, "prisma-ts-select");
  });

  void test("db.ts exports DB", async () => {
    const { DB } = await import("../src/db.ts");
    assert.deepEqual(DB, {});
  });

  void test("fn-context.ts re-exports sql-expr primitives", async () => {
    const mod = await import("../src/fn-context.ts");
    assert.equal(typeof mod.lit, "function");
    assert.equal(typeof mod.sqlExpr, "function");
    assert.equal(typeof mod.resolveArg, "function");
  });

  void test("utils/types.ts can be imported (type-only module)", async () => {
    const mod = await import("../src/utils/types.ts");
    assert.ok(mod);
  });
});
