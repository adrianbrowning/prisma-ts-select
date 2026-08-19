import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";

describe("coverage: extend.js gaps", () => {

  describe("getTables / getFields / toString", () => {
    it("getTables returns empty object", () => {
      const q = prisma.$from("User").select("id");
      assert.deepEqual(q.getTables(), {});
    });

    it("getFields returns empty object", () => {
      const q = prisma.$from("User").select("id");
      assert.deepEqual(q.getFields(), {});
    });

    it("toString returns wrapped SQL", () => {
      const q = prisma.$from("User").select("id");
      expectSQL(
        q.toString(),
        `(SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")})`
      );
    });

    it("template literal coercion uses toString", () => {
      const q = prisma.$from("User").select("id");
      expectSQL(
        `${q}`,
        `(SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")})`
      );
    });
  });

  describe("$from context: min / max", () => {
    it("min produces MIN(col)", () => {
      const q = prisma.$from("User").select(({ min }) => min("User.id"), "m");
      expectSQL(
        q.getSQL(),
        `SELECT MIN(${dialect.quoteQualifiedColumn("User.id")}) AS ${dialect.quote("m", true)} FROM ${dialect.quote("User")};`
      );
    });

    it("max produces MAX(col)", () => {
      const q = prisma.$from("User").select(({ max }) => max("User.id"), "m");
      expectSQL(
        q.getSQL(),
        `SELECT MAX(${dialect.quoteQualifiedColumn("User.id")}) AS ${dialect.quote("m", true)} FROM ${dialect.quote("User")};`
      );
    });
  });

  describe("boolean coercion in run()", () => {
    it("coerces integer 1/0 to boolean for Boolean fields", { skip: !dialect.needsBooleanCoercion() }, async () => {
      const results = await prisma.$from("Post")
        .select("id", "published")
        .limit(1)
        .run();
      if (results.length > 0) {
        assert.equal(typeof results[0].published, "boolean");
      }
    });
  });

  describe("where with single condition (no parens wrapping)", () => {
    it("single field condition produces no extra parens", () => {
      expectSQL(
        prisma.$from("User").where({ id: 1 })
          .select("id")
          .getSQL(),
        `SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("id")} = 1;`
      );
    });
  });

  describe("where with null value (sqlVal null branch)", () => {
    it("null produces IS NULL", () => {
      expectSQL(
        prisma.$from("User")
          // @ts-expect-error runtime-only: exercising defensive null→IS NULL path
          .where({ name: null })
          .select("id")
          .getSQL(),
        `SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("name")} IS NULL;`
      );
    });
  });

  describe("$with CTE", () => {
    it("CTE wraps subquery in WITH clause", () => {
      const cte = prisma.$from("User").select("id");
      expectSQL(
        prisma.$with("u", cte).from("u")
          .select("*")
          .getSQL(),
        `WITH ${dialect.quote("u")} AS (SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")}) SELECT * FROM ${dialect.quote("u")};`
      );
    });
  });

  describe("having(fn) on _fHaving (via groupBy)", () => {
    it("fn form produces HAVING clause", () => {
      expectSQL(
        prisma.$from("User")
          .join("Post", "authorId", "User.id")
          .groupBy([ "User.id" ])
          .having(({ count }) => [[ count("Post.id"), { op: ">", value: 1 }]])
          .select("User.id")
          .getSQL(),
        `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")} HAVING COUNT(${dialect.quoteQualifiedColumn("Post.id")}) > 1;`
      );
    });
  });

  describe("having(fn) on _fGroupBy (without groupBy)", () => {
    it("fn form on join chain hits _fGroupBy.having()", () => {
      expectSQL(
        prisma.$from("User")
          .join("Post", "authorId", "User.id")
          .having(({ count }) => [[ count("Post.id"), { op: ">", value: 1 }]])
          .select("User.id")
          .getSQL(),
        `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} HAVING COUNT(${dialect.quoteQualifiedColumn("Post.id")}) > 1;`
      );
    });
  });

  describe("where with op condition (applyOpCondition)", () => {
    it("op > produces comparison", () => {
      expectSQL(
        prisma.$from("User").where({ id: { op: ">", value: 5 } })
          .select("id")
          .getSQL(),
        `SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("id")} > 5;`
      );
    });

    it("op != produces comparison", () => {
      expectSQL(
        prisma.$from("User").where({ id: { op: "!=", value: 0 } })
          .select("id")
          .getSQL(),
        `SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("id")} != 0;`
      );
    });
  });

  describe("extractSelectAlias edge cases", () => {
    it("plain column used as CTE column name", () => {
      const cte = prisma.$from("User").select("id");
      expectSQL(
        prisma.$with("u", cte).from("u")
          .select("*")
          .getSQL(),
        `WITH ${dialect.quote("u")} AS (SELECT ${dialect.quote("id")} FROM ${dialect.quote("User")}) SELECT * FROM ${dialect.quote("u")};`
      );
    });

    it("aliased column name in select", () => {
      const q = prisma.$from("User").select("id", "uid");
      expectSQL(
        q.getSQL(),
        `SELECT ${dialect.quote("id")} AS ${dialect.quote("uid", true)} FROM ${dialect.quote("User")};`
      );
    });
  });

  describe("run() without boolean fields (line 211)", () => {
    it("returns results unchanged when no boolean coercion needed", async () => {
      const results = await prisma.$from("User")
        .select("id")
        .limit(1)
        .run();
      if (results.length > 0) {
        assert.equal(typeof results[0].id, "number");
      }
    });
  });

  describe("sqlVal unsupported type (line 51)", () => {
    it("throws on unsupported value type", () => {
      assert.throws(
        () => prisma.$from("User")
          .where({ id: undefined as unknown as number })
          .select("id")
          .getSQL(),
        /Unsupported value type in sqlVal/
      );
    });
  });

  describe("applyOpCondition unsupported op (line 80)", () => {
    it("throws on unknown op", () => {
      assert.throws(
        () => prisma.$from("User")
          // @ts-expect-error runtime-only: exercising unsupported op throw
          .where({ id: { op: "NOPE", value: 1 } })
          .select("id")
          .getSQL(),
        /Unsupported operation/
      );
    });
  });

  describe("manyToManyJoin error: no junction table", () => {
    it("throws when target has no junction", () => {
      assert.throws(
        () => prisma.$from("User")
          // @ts-expect-error runtime-only: exercising m2m error path
          .manyToManyJoin("User", "Post")
          .select("User.id")
          .getSQL(),
        /manyToManyJoin/
      );
    });
  });

  describe("extractSelectAlias returns null for complex expression (line 705)", () => {
    it("CTE with unrecognizable expression omits column list", () => {
      const cte = prisma.$from("User")
        .select(({ concat }) => concat("email", "name"));
      const sql = prisma.$with("x", cte).from("x")
        .select("*")
        .getSQL();
      // Key assertion: no column list between CTE name and AS — extractSelectAlias returned null
      assert.match(sql, new RegExp(`${dialect.quote("x")}\\s+AS\\s+\\(`));
      assert.ok(sql.includes("SELECT * FROM"));
    });
  });

});
