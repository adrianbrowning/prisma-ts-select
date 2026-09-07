import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../../test-utils.ts";

describe("SQLite aggregate fluent API (ORDER BY + FILTER)", () => {
  describe("groupConcat with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").orderBy("User.name", "DESC"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(User.name, ',' ORDER BY User.name DESC) AS \`names\` FROM User GROUP BY User.id;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("groupConcat with .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("User.name", ",").filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(User.name, ',') FILTER (WHERE age > 18) AS \`names\` FROM User GROUP BY User.id;`);
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
        .select(({ groupConcat }) => groupConcat("User.name", ",").orderBy("User.name", "ASC")
          .filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(User.name, ',' ORDER BY User.name ASC) FILTER (WHERE age > 18) AS \`names\` FROM User GROUP BY User.id;`);
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
        `SELECT GROUP_CONCAT(User.name, ',' ORDER BY User.name) AS \`names\` FROM User GROUP BY User.id;`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
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
        `SELECT GROUP_CONCAT(User.name, ',') AS \`names\` FROM User GROUP BY User.id;`);
    });
  });
});
