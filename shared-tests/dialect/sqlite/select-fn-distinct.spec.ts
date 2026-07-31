import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

describe("SQLite distinct() helper", () => {
  describe("avg(distinct(col))", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ avg, distinct }) => avg(distinct("User.age")), "avgAge");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT AVG(DISTINCT ${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("avgAge", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("sum(distinct(col))", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ sum, distinct }) => sum(distinct("User.age")), "sumAge");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT SUM(DISTINCT ${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("sumAge", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat(distinct(col))", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat, distinct }) => groupConcat(distinct("User.name")), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(DISTINCT ${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat(distinct(col), sep) — unsupported in SQLite", () => {
    it("@ts-expect-error: sep not allowed with distinct", () => {
      // eslint-disable-next-line no-constant-condition, sonarjs/no-gratuitous-expressions, @typescript-eslint/no-unnecessary-condition
      if (false) {
        // @ts-expect-error - SQLite: GROUP_CONCAT(DISTINCT col, sep) not supported
        prisma.$from("User").select(({ groupConcat, distinct }) => groupConcat(distinct("User.name"), ", "), "names");
      }
    });

    it("throws at runtime if bypassed", () => {
      assert.throws(
        () => prisma.$from("User").select(({ groupConcat, distinct }) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (groupConcat as any)(distinct("User.name"), ", "), "names")
          .getSQL(),
        /does not support GROUP_CONCAT/
      );
    });
  });

  describe("groupConcat(distinct(col), sep with single quote) — unsupported in SQLite", () => {
    it("@ts-expect-error: sep not allowed with distinct", () => {
      // eslint-disable-next-line no-constant-condition, sonarjs/no-gratuitous-expressions, @typescript-eslint/no-unnecessary-condition
      if (false) {
        // @ts-expect-error - SQLite: GROUP_CONCAT(DISTINCT col, sep) not supported
        prisma.$from("User").select(({ groupConcat, distinct }) => groupConcat(distinct("User.name"), "it's"), "names");
      }
    });
  });

  describe("count(distinct(col))", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ count, distinct }) => count(distinct("User.name")), "cnt");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT COUNT(DISTINCT ${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("cnt", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    it("type: bigint", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ cnt: bigint; }>>>);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("type boundary", () => {
    it("avg(distinct(string col)) should be a type error", () => {
      // @ts-expect-error - User.name is string, avg expects number col
      prisma.$from("User").select(({ avg, distinct }) => avg(distinct("User.name")), "v");
    });
  });
});
