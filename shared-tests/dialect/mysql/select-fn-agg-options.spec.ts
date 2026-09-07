import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../../test-utils.ts";

describe("MySQL aggregate fluent API (ORDER BY + FILTER via CASE WHEN)", () => {
  describe("groupConcat with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").orderBy("User.name", "ASC"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(\`User\`.\`name\` ORDER BY \`User\`.\`name\` ASC SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat with .filter() (CASE WHEN rewrite)", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(CASE WHEN \`age\` > 18 THEN \`User\`.\`name\` END SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").orderBy("User.name", "DESC")
          .filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(CASE WHEN \`age\` > 18 THEN \`User\`.\`name\` END ORDER BY \`User\`.\`name\` DESC SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat with .orderBy() and no direction", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").orderBy("User.name"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(\`User\`.\`name\` ORDER BY \`User\`.\`name\` SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("JSON aggregates expose no aggregate clauses", () => {
    it("jsonArrayAgg has neither .orderBy() nor .filter()", () => {
      prisma.$from("User").select(({ jsonArrayAgg }) => {
        const expr = jsonArrayAgg("User.name");
        // @ts-expect-error — MySQL JSON_ARRAYAGG has no aggregate ORDER BY
        assert.equal(expr.orderBy, undefined);
        // @ts-expect-error — JSON_ARRAYAGG keeps NULL elements, so CASE WHEN cannot emulate FILTER
        assert.equal(expr.filter, undefined);
        return expr;
      }, "names");
    });

    it("jsonObjectAgg has neither .orderBy() nor .filter()", () => {
      prisma.$from("User").select(({ jsonObjectAgg }) => {
        const expr = jsonObjectAgg("User.email", "User.name");
        // @ts-expect-error — MySQL JSON_OBJECTAGG has no aggregate ORDER BY
        assert.equal(expr.orderBy, undefined);
        // @ts-expect-error — JSON_OBJECTAGG rejects NULL keys, so CASE WHEN cannot emulate FILTER
        assert.equal(expr.filter, undefined);
        return expr;
      }, "obj");
    });
  });

  describe("backwards compat: groupConcat without chaining", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ","), "names");
    }

    it("should match SQL (unchanged)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(\`User\`.\`name\` SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });
  });
});
