import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

describe("PostgreSQL cast() fn", () => {

  describe("cast(col, 'INTEGER')", () => {
    function createQuery() {
      return prisma.$from("User").select(({ cast }) => cast("User.id", "INTEGER"), "a");
    }

    it("should emit CAST(... AS INTEGER)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS INTEGER) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
    });

    it("type: number", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ a: number; }>>>);
    });

    it("returns integer values", async () => {
      const result = await createQuery().run();
      assert.deepEqual(result.map(r => r.a).sort((a, b) => a - b), [ 1, 2, 3 ]);
    });
  });

  describe("cast(col, 'TEXT')", () => {
    function createQuery() {
      return prisma.$from("User").select(({ cast }) => cast("User.id", "TEXT"), "a");
    }

    it("should emit CAST(... AS TEXT)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS TEXT) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
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

  describe("cast(col, 'BOOLEAN')", () => {
    function createQuery() {
      return prisma.$from("Post").select(({ cast }) => cast("Post.published", "BOOLEAN"), "a");
    }

    it("should emit CAST(... AS BOOLEAN)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT CAST(${dialect.quoteQualifiedColumn("Post.published")} AS BOOLEAN) AS ${dialect.quote("a", true)} FROM ${dialect.quote("Post")};`);
    });

    it("type: boolean", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ a: boolean; }>>>);
    });

    it("returns boolean values", async () => {
      const result = await createQuery().run();
      assert.ok(result.every(r => r.a === false));
    });
  });

  describe("type safety", () => {
    it("rejects unknown cast type", () => {
      // @ts-expect-error NOPE is not a valid PG cast type — TS-only check; runtime guard also throws
      try { prisma.$from("User").select(({ cast }) => cast("User.age", "NOPE"), "a"); }
      catch { /* expected */ }
    });

    it("throws on invalid cast type", () => {
      assert.throws(
        () => prisma.$from("Post").select(({ cast }) => cast("Post.id", "INJECTED;DROP TABLE--" as unknown as "TEXT"), "x"),
        /invalid cast type/i
      );
    });

    it("accepts DateTime col in cast()", () => {
      prisma.$from("Post").select(({ cast }) => cast("Post.createdAt", "TEXT"), "t");
    });
  });

});
