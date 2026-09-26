import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";

const q = dialect.quote;
const qc = dialect.quoteQualifiedColumn;

// Seed: User 1 (age 25) wrote posts 1 and 2, User 2 (age 30) wrote post 3, User 3 (age null) wrote nothing.
// No post is published and nobody has liked a post.
const postsByUser = `SELECT 1 FROM ${q("Post")} WHERE ${qc("Post.authorId")} = ${qc("User.id")}`;

describe("exists / notExists criteria", () => {

  describe("correlated exists", () => {
    function createQuery() {
      return prisma.$from("User")
        .where({
          exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }),
        })
        .select("id")
        .orderBy([ "id" ]);
    }

    it("emits EXISTS with SELECT 1 and the outer column reference", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE EXISTS (${postsByUser}) ORDER BY ${q("id", false)};`);
    });

    it("renders the subquery in the outer query's formatted mode", () => {
      expectSQL(createQuery().getSQL(true),
        `SELECT ${q("id", false)}\nFROM ${q("User")}\nWHERE EXISTS (SELECT 1\nFROM ${q("Post")}\nWHERE ${qc("Post.authorId")} = ${qc("User.id")})\nORDER BY ${q("id", false)};`);
    });

    it("keeps only users with a post", async () => {
      assert.deepEqual(await createQuery().run(), [{ id: 1 }, { id: 2 }]);
    });
  });

  describe("correlated notExists", () => {
    function createQuery() {
      return prisma.$from("User")
        .where({
          notExists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }),
        })
        .select("id");
    }

    it("emits NOT EXISTS", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE NOT EXISTS (${postsByUser});`);
    });

    it("keeps only users without a post", async () => {
      assert.deepEqual(await createQuery().run(), [{ id: 3 }]);
    });
  });

  describe("composition with criteria", () => {
    it("inside $OR", async () => {
      const query = prisma.$from("User")
        .where({
          $OR: [
            { notExists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }) },
            { id: 1 },
          ],
        })
        .select("id")
        .orderBy([ "id" ]);

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE (NOT EXISTS (${postsByUser}) OR ${qc("id")} = 1) ORDER BY ${q("id", false)};`);
      assert.deepEqual(await query.run(), [{ id: 1 }, { id: 3 }]);
    });

    it("inside $NOT", async () => {
      const query = prisma.$from("User")
        .where({
          $NOT: [{ exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }) }],
        })
        .select("id");

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE (NOT(EXISTS (${postsByUser})));`);
      assert.deepEqual(await query.run(), [{ id: 3 }]);
    });

    it("AND-ed with a column condition in the same object", async () => {
      const query = prisma.$from("User")
        .where({
          age: { op: ">", value: 26 },
          exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }),
        })
        .select("id");

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE ${qc("age")} > 26 AND EXISTS (${postsByUser});`);
      assert.deepEqual(await query.run(), [{ id: 2 }]);
    });

    it("sees every joined table of the outer query", async () => {
      const query = prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .where({
          "Post.published": false,
          notExists: ({ from }) => from("LikedPosts").where({ "LikedPosts.postId": { $col: "Post.id" } }),
        })
        .select("Post.id")
        .orderBy([ "Post.id" ]);

      // The inner FROM holds only the subquery's own table; the outer User and Post stay outside.
      expectSQL(query.getSQL(),
        `SELECT ${qc("Post.id")} AS ${q("Post.id", true)} FROM ${q("User")} JOIN ${q("Post")} ON ${qc("Post.authorId")} = ${qc("User.id")} WHERE ${qc("Post.published")} = false AND NOT EXISTS (SELECT 1 FROM ${q("LikedPosts")} WHERE ${qc("LikedPosts.postId")} = ${qc("Post.id")}) ORDER BY ${qc("Post.id")};`);
      assert.deepEqual(await query.run(), [{ "Post.id": 1 }, { "Post.id": 2 }, { "Post.id": 3 }]);
    });
  });

  describe("subquery shape", () => {
    it("keeps an explicit select list", () => {
      const query = prisma.$from("User")
        .where({ exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } })
          .select("title") })
        .select("id");

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE EXISTS (SELECT ${q("title", false)} FROM ${q("Post")} WHERE ${qc("Post.authorId")} = ${qc("User.id")});`);
    });

    it("accepts an uncorrelated builder", async () => {
      const published = prisma.$from("Post").where({ published: true });

      const none = prisma.$from("User").where({ exists: published })
        .select("id");
      expectSQL(none.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE EXISTS (SELECT 1 FROM ${q("Post")} WHERE ${qc("published")} = true);`);
      assert.deepEqual(await none.run(), []);

      const all = prisma.$from("User").where({ notExists: published })
        .select("id")
        .orderBy([ "id" ]);
      assert.deepEqual(await all.run(), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it("correlates an aliased self-reference", async () => {
      const query = prisma.$from("User u")
        .where({
          exists: ({ from }) => from("User older").where({ "older.age": { op: ">", value: { $col: "u.age" } } }),
        })
        .select("id");

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} AS ${q("u", true)} WHERE EXISTS (SELECT 1 FROM ${q("User")} AS ${q("older", true)} WHERE ${qc("older.age")} > ${qc("u.age")});`);
      assert.deepEqual(await query.run(), [{ id: 1 }]);
    });

    it("nests, with the innermost subquery seeing every enclosing source", async () => {
      const query = prisma.$from("User")
        .where({
          exists: ({ from }) => from("Post").where({
            "Post.authorId": { $col: "User.id" },
            notExists: ({ from }) => from("LikedPosts").where({
              "LikedPosts.postId": { $col: "Post.id" },
              "LikedPosts.authorId": { $col: "User.id" },
            }),
          }),
        })
        .select("id")
        .orderBy([ "id" ]);

      expectSQL(query.getSQL(),
        `SELECT ${q("id", false)} FROM ${q("User")} WHERE EXISTS (SELECT 1 FROM ${q("Post")} WHERE ${qc("Post.authorId")} = ${qc("User.id")} AND NOT EXISTS (SELECT 1 FROM ${q("LikedPosts")} WHERE (${qc("LikedPosts.postId")} = ${qc("Post.id")} AND ${qc("LikedPosts.authorId")} = ${qc("User.id")}))) ORDER BY ${q("id", false)};`);
      assert.deepEqual(await query.run(), [{ id: 1 }, { id: 2 }]);
    });
  });

  describe("type safety", () => {
    it("rejects a column from a table the outer query does not have", () => {
      prisma.$from("User").where({
        exists: ({ from }) => from("Post").where({
          // @ts-expect-error LikedPosts is not in the outer query
          "Post.authorId": { $col: "LikedPosts.authorId" },
        }),
      });
    });

    it("rejects a subquery table that shadows an outer table", () => {
      prisma.$from("User").where({
        // @ts-expect-error "User" is already the outer table; the subquery needs an alias
        exists: ({ from }) => from("User"),
      });
    });

    it("rejects operands that are not query builders", () => {
      // @ts-expect-error raw SQL is not a query builder
      prisma.$from("User").where({ exists: "SELECT 1" });
      // @ts-expect-error a pending $with() has no FROM yet
      prisma.$from("User").where({ exists: prisma.$with("u", prisma.$from("User").select("id")) });
      // @ts-expect-error the callback must return a query builder
      prisma.$from("User").where({ notExists: () => "SELECT 1" });
    });
  });

  describe("runtime validation", () => {
    it("throws when the operand is not a query builder", () => {
      const query = prisma.$from("User").where({ exists: "SELECT 1" as never });
      assert.throws(() => query.getSQL(), {
        name: "TypeError",
        message: "\"exists\" expects a query builder or a callback returning one, got string",
      });
    });

    it("throws when the callback does not return a query builder", () => {
      const query = prisma.$from("User").where({ notExists: (() => undefined) as never });
      assert.throws(() => query.getSQL(), {
        name: "TypeError",
        message: "\"notExists\" expects a query builder or a callback returning one, got a callback returning undefined",
      });
    });
  });
});
