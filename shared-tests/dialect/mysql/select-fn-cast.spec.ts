import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

describe("MySQL cast() fn", () => {

  describe("cast(col, 'CHAR')", () => {
    function createQuery() {
      return prisma.$from("User").select(({ cast }) => cast("User.id", "CHAR"), "a");
    }

    it("should emit CAST(... AS CHAR)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS CHAR) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
    });

    it("type: string", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ a: string; }>>>);
    });

    it("returns string values", async () => {
      const result = await createQuery().run();
      assert.deepEqual(result.map(r => r.a).sort((a, b) => String(a).localeCompare(String(b))), [ "1", "2", "3" ]);
    });
  });

  describe("cast(col, 'SIGNED')", () => {
    function createQuery() {
      return prisma.$from("User").select(({ cast }) => cast("User.id", "SIGNED"), "a");
    }

    it("should emit CAST(... AS SIGNED)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS SIGNED) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
    });

    it("type: bigint", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ a: bigint; }>>>);
    });

    it("returns bigint values", async () => {
      const result = await createQuery().run();
      assert.deepEqual(result.map(r => r.a).sort((a, b) => String(a).localeCompare(String(b))), [ 1n, 2n, 3n ]);
    });
  });

  describe("cast(col, 'DECIMAL')", () => {
    function createQuery() {
      return prisma.$from("User").select(({ cast }) => cast("User.id", "DECIMAL"), "a");
    }

    it("should emit CAST(... AS DECIMAL)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS DECIMAL) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
    });

    it("type: Decimal", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ a: Decimal; }>>>);
    });

    it("returns Decimal values", async () => {
      const result = await createQuery().run();
      assert.deepEqual(result.map(r => r.a.toNumber()).sort((a, b) => a - b), [ 1, 2, 3 ]);
    });
  });

  describe("type safety", () => {
    it("rejects unknown cast type", () => {
      // @ts-expect-error NOPE is not a valid MySQL cast type — TS-only check; runtime guard also throws
      try { prisma.$from("User").select(({ cast }) => cast("User.age", "NOPE"), "a"); }
      catch { /* expected */ }
    });

    it("throws on invalid cast type", () => {
      assert.throws(
        () => prisma.$from("Post")
            .select(({ cast }) => cast("Post.id",
              //@ts-expect-error testing the as TEXT
                    "INJECTED;DROP TABLE--" as unknown as "TEXT")
                , "x"),
        /invalid cast type/i
      );
    });

    it("accepts DateTime col in cast()", () => {
      prisma.$from("Post").select(({ cast }) => cast("Post.createdAt", "CHAR"), "t");
    });
  });

});
