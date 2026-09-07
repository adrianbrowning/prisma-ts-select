import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";

describe("PostgreSQL aggregate fluent API (ORDER BY + FILTER)", () => {
  describe("stringAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("User.name", ", ").orderBy("User.name", "ASC"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("User"."name", ', ' ORDER BY "User"."name" ASC) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("stringAgg with .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("User.name", ", ").filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("User"."name", ', ') FILTER (WHERE "age" > 18) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("stringAgg with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("User.name", ", ").orderBy("User.name", "DESC")
          .filter({ age: { op: ">", value: 18 } }), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("User"."name", ', ' ORDER BY "User"."name" DESC) FILTER (WHERE "age" > 18) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("arrayAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ arrayAgg }) => arrayAgg("User.name").orderBy("User.name", "ASC"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ARRAY_AGG("User"."name" ORDER BY "User"."name" ASC) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("jsonAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ jsonAgg }) => jsonAgg("User.name").orderBy("User.name"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT JSON_AGG("User"."name" ORDER BY "User"."name") AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("jsonObjectAgg with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ jsonObjectAgg }) => jsonObjectAgg("User.name", "User.email").orderBy("User.name", "ASC")
          .filter({ age: { op: ">", value: 18 } }), "obj");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT JSON_OBJECT_AGG("User"."name", "User"."email" ORDER BY "User"."name" ASC) FILTER (WHERE "age" > 18) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });

    it("should run without error", async () => {
      const result = await createQuery().run();
      assert.ok(Array.isArray(result));
    });
  });

  describe("multiple .orderBy() calls", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("User.name", ", ").orderBy("User.age", "DESC")
          .orderBy("User.name", "ASC"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("User"."name", ', ' ORDER BY "User"."age" DESC, "User"."name" ASC) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });
  });

  describe("backwards compat: stringAgg without chaining", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("User.name", ", "), "names");
    }

    it("should match SQL (unchanged)", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("User"."name", ', ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY "User"."id";`);
    });
  });
});
