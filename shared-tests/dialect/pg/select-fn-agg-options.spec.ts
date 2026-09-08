import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// Every query below joins before grouping so each group holds more than one row — user 1 owns
// 'Blog 1' + 'blog 2', user 2 owns 'blog 3'. A one-row-per-group shape cannot show wrong
// aggregate ordering or a filter that silently does nothing.
describe("PostgreSQL aggregate fluent API (ORDER BY + FILTER)", () => {
  describe("stringAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", ").orderBy("Post.title", "DESC"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    function createUnchainedQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", "), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("type: string — unchanged by .orderBy()", async () => {
      const _chained = await createQuery().run();
      const _unchained = await createUnchainedQuery().run();
      typeCheck({} as Expect<Equal<typeof _chained, Array<{ titles: string; }>>>);
      typeCheck({} as Expect<Equal<typeof _unchained, Array<{ titles: string; }>>>);
    });

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."title", ', ' ORDER BY "Post"."title" DESC) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should concatenate each group in descending title order", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2, Blog 1" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("stringAgg with .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", ").filter({ "Post.id": { op: ">", value: 1 } }), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("type: string — unchanged by .filter()", async () => {
      const _rows = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _rows, Array<{ titles: string; }>>>);
    });

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."title", ', ') FILTER (WHERE "Post"."id" > 1) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should drop the filtered-out row from user 1's group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("stringAgg with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.content", ", ").orderBy("Post.content", "DESC")
          .filter({ "Post.id": { op: "<", value: 3 } }), "contents")
        .orderBy([ "User.id ASC" ]);
    }

    it("type: string | null — unchanged by .orderBy().filter()", async () => {
      const _rows = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _rows, Array<{ contents: string | null; }>>>);
    });

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."content", ', ' ORDER BY "Post"."content" DESC) FILTER (WHERE "Post"."id" < 3) AS ${dialect.quote("contents", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should order the surviving rows and empty out the fully-filtered group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { contents: "sql, Something" },
        { contents: null },
      ]);
    });
  });

  describe("arrayAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ arrayAgg }) => arrayAgg("Post.title").orderBy("Post.title", "ASC"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ARRAY_AGG("Post"."title" ORDER BY "Post"."title" ASC) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should return each group as an ascending array", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: [ "Blog 1", "blog 2" ] },
        { titles: [ "blog 3" ] },
      ]);
    });
  });

  describe("jsonAgg with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ jsonAgg }) => jsonAgg("Post.title").orderBy("Post.title"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT JSON_AGG("Post"."title" ORDER BY "Post"."title") AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should return each group as an ascending JSON array", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: [ "Blog 1", "blog 2" ] },
        { titles: [ "blog 3" ] },
      ]);
    });
  });

  describe("jsonObjectAgg with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ jsonObjectAgg }) => jsonObjectAgg("Post.title", "Post.content").orderBy("Post.title", "ASC")
          .filter({ "Post.id": { op: "<", value: 3 } }), "obj")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT JSON_OBJECT_AGG("Post"."title", "Post"."content" ORDER BY "Post"."title" ASC) FILTER (WHERE "Post"."id" < 3) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should build the object from the surviving rows only", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { obj: { "Blog 1": "Something", "blog 2": "sql" } },
        { obj: null },
      ]);
    });
  });

  describe("multiple .orderBy() calls", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", ").orderBy("Post.published", "DESC")
          .orderBy("Post.title", "ASC"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."title", ', ' ORDER BY "Post"."published" DESC, "Post"."title" ASC) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should apply both aggregate ORDER BY terms", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "Blog 1, blog 2" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("aggregate ORDER BY coexists with a query-level ORDER BY", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", ").orderBy("Post.title", "DESC"), "titles")
        .orderBy([ "User.id DESC" ]);
    }

    it("should match SQL — aggregate ORDER BY inside, query ORDER BY after GROUP BY", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."title", ', ' ORDER BY "Post"."title" DESC) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" DESC;`);
    });

    it("should apply both orderings independently", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 3" },
        { titles: "blog 2, Blog 1" },
      ]);
    });
  });

  // PostgreSQL rejects an aggregate with DISTINCT whose ORDER BY term is not in the argument
  // list (SQLSTATE 42P10). Emitting that SQL turns a library-level mistake into a runtime
  // database error, so the builder must refuse it up front. MySQL and SQLite accept the form,
  // hence the guard is PostgreSQL-only.
  describe("stringAgg(distinct(col)) with an unrelated .orderBy() — unsupported in PostgreSQL", () => {
    it("throws instead of emitting SQL PostgreSQL rejects", () => {
      assert.throws(
        () => prisma.$from("Post")
          .innerJoin("User", "id", "Post.authorId")
          .groupBy([ "User.id" ])
          .select(({ stringAgg, distinct }) => stringAgg(distinct("User.name"), ", ").orderBy("User.age", "DESC"), "names")
          .getSQL(),
        /DISTINCT/
      );
    });
  });

  describe("arrayAgg(distinct(col)) with an unrelated .orderBy() — unsupported in PostgreSQL", () => {
    it("throws instead of emitting SQL PostgreSQL rejects", () => {
      assert.throws(
        () => prisma.$from("Post")
          .innerJoin("User", "id", "Post.authorId")
          .groupBy([ "User.id" ])
          .select(({ arrayAgg, distinct }) => arrayAgg(distinct("User.name")).orderBy("User.age"), "names")
          .getSQL(),
        /DISTINCT/
      );
    });
  });

  describe("stringAgg(distinct(col)) ordered by the aggregated column stays legal", () => {
    // Grouping from Post repeats 'John Doe' once per post, so DISTINCT collapses it to one value.
    function createQuery() {
      return prisma.$from("Post")
        .innerJoin("User", "id", "Post.authorId")
        .groupBy([ "User.id" ])
        .select(({ stringAgg, distinct }) => stringAgg(distinct("User.name"), ", ").orderBy("User.name", "DESC"), "names")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG(DISTINCT "User"."name", ', ' ORDER BY "User"."name" DESC) AS ${dialect.quote("names", true)} FROM ${dialect.quote("Post")} INNER JOIN ${dialect.quote("User")} ON "User"."id" = "Post"."authorId" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should dedupe each group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { names: "John Doe" },
        { names: "John Smith" },
      ]);
    });
  });

  describe("arrayAgg(distinct(col)) ordered by the aggregated column stays legal", () => {
    function createQuery() {
      return prisma.$from("Post")
        .innerJoin("User", "id", "Post.authorId")
        .groupBy([ "User.id" ])
        .select(({ arrayAgg, distinct }) => arrayAgg(distinct("User.name")).orderBy("User.name", "ASC"), "names")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ARRAY_AGG(DISTINCT "User"."name" ORDER BY "User"."name" ASC) AS ${dialect.quote("names", true)} FROM ${dialect.quote("Post")} INNER JOIN ${dialect.quote("User")} ON "User"."id" = "Post"."authorId" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should dedupe each group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { names: [ "John Doe" ] },
        { names: [ "John Smith" ] },
      ]);
    });
  });

  describe("stringAgg with chained .filter()", () => {
    // Post 2 is the only row satisfying both predicates, so a lost condition is visible in the
    // rows: dropping the second would leave user 2 with 'blog 3', dropping the first would give
    // user 1 both titles.
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => stringAgg("Post.title", ", ")
          .filter({ "Post.id": { op: ">", value: 1 } })
          .filter({ "Post.id": { op: "<", value: 3 } }), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL — both conditions parenthesised and ANDed", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT STRING_AGG("Post"."title", ', ') FILTER (WHERE ("Post"."id" > 1) AND ("Post"."id" < 3)) AS ${dialect.quote("titles", true)} FROM ${dialect.quote("User")} INNER JOIN ${dialect.quote("Post")} ON "Post"."authorId" = "User"."id" GROUP BY "User"."id" ORDER BY "User"."id" ASC;`);
    });

    it("should keep only the row satisfying both conditions", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2" },
        { titles: null },
      ]);
    });
  });

  describe("chained aggregate toString()", () => {
    it("renders the same SQL as .sql, and the fragment the statement embeds", () => {
      let captured: { sql: string; toString: () => string; } | undefined;
      const query = prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ stringAgg }) => {
          const agg = stringAgg("Post.title", ", ").orderBy("Post.title", "DESC")
            .filter({ "Post.id": { op: ">", value: 1 } });
          captured = agg;
          return agg;
        }, "titles");
      assert.ok(captured, "select() should invoke its callback eagerly");
      // `SQLExpr` publishes `toString`, so template interpolation of an aggregate must render what
      // `.sql` renders — asserted twice, since the second read comes from the memoised render.
      assert.equal(String(captured), captured.sql);
      assert.equal(String(captured), captured.sql);
      assert.ok(query.getSQL().includes(String(captured)));
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
