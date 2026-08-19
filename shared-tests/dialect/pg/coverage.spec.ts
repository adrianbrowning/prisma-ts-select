import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";

// @ts-expect-error subpath wildcard import resolved by Node, not TS
import { postgresqlContextFns } from "#prisma-ts-select/dialects/postgresql.js";
import { expectSQL } from "../../test-utils.ts";

describe("pg coverage: dialect functions", () => {

  describe("quoteOrderByClause with qualified column", () => {
    it("quotes Table.col with dot", () => {
      assert.equal(dialect.quoteOrderByClause("User.name DESC"), "\"User\".\"name\" DESC");
    });

    it("quotes unqualified col", () => {
      assert.equal(dialect.quoteOrderByClause("name"), "\"name\"");
    });

    it("quotes unqualified col with suffix", () => {
      assert.equal(dialect.quoteOrderByClause("name ASC"), "\"name\" ASC");
    });
  });

  describe("quoteTableIdentifier", () => {
    it("quotes table name", () => {
      assert.equal(dialect.quoteTableIdentifier("User", false), "\"User\"");
    });
  });

  describe("needsBooleanCoercion", () => {
    it("returns false for pg", () => {
      assert.equal(dialect.needsBooleanCoercion(), false);
    });
  });

  describe("base postgresqlContextFns (overridden by version layer)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseFns: any = postgresqlContextFns((id: string) => `"${id}"`);

    it("countAll", () => {
      assert.equal(baseFns.countAll().sql, "COUNT(*)");
    });

    it("count with column", () => {
      assert.equal(baseFns.count("id").sql, "COUNT(\"id\")");
    });

    it("count with *", () => {
      assert.equal(baseFns.count("*").sql, "COUNT(*)");
    });

    it("countDistinct", () => {
      assert.equal(baseFns.countDistinct("name").sql, "COUNT(DISTINCT \"name\")");
    });

    it("ceil", () => {
      assert.equal(baseFns.ceil("id").sql, "CEIL(\"id\")");
    });

    it("floor", () => {
      assert.equal(baseFns.floor("id").sql, "FLOOR(\"id\")");
    });
  });

  describe("context fns invoked via select", () => {
    it("countAll", () => {
      expectSQL(
        prisma.$from("User").select(({ countAll }) => countAll(), "c")
          .getSQL(),
        `SELECT COUNT(*) AS "c" FROM "User";`
      );
    });

    it("count with *", () => {
      expectSQL(
        prisma.$from("User").select(({ count }) => count("*"), "c")
          .getSQL(),
        `SELECT COUNT(*) AS "c" FROM "User";`
      );
    });

    it("countDistinct", () => {
      expectSQL(
        prisma.$from("User").select(({ countDistinct }) => countDistinct("name"), "c")
          .getSQL(),
        `SELECT COUNT(DISTINCT "name") AS "c" FROM "User";`
      );
    });

    it("distinct", () => {
      expectSQL(
        prisma.$from("User").select(({ distinct }) => distinct("name"), "d")
          .getSQL(),
        `SELECT DISTINCT "name" AS "d" FROM "User";`
      );
    });

    it("ceil", () => {
      expectSQL(
        prisma.$from("User").select(({ ceil }) => ceil("id"), "c")
          .getSQL(),
        `SELECT CEIL("id") AS "c" FROM "User";`
      );
    });

    it("floor", () => {
      expectSQL(
        prisma.$from("User").select(({ floor }) => floor("id"), "f")
          .getSQL(),
        `SELECT FLOOR("id") AS "f" FROM "User";`
      );
    });
  });
});
