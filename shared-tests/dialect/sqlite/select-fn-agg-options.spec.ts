import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// Every query below joins before grouping so each group holds more than one row — user 1 owns
// 'Blog 1' + 'blog 2', user 2 owns 'blog 3'. A one-row-per-group shape cannot show wrong
// aggregate ordering or a filter that silently does nothing.
describe("SQLite aggregate fluent API (ORDER BY + FILTER)", () => {
  describe("groupConcat with .orderBy()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ",").orderBy("Post.title", "DESC"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    function createUnchainedQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ","), "titles")
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
        `SELECT GROUP_CONCAT(Post.title, ',' ORDER BY Post.title DESC) AS \`titles\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id ASC;`);
    });

    it("should concatenate each group in descending title order", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2,Blog 1" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("groupConcat with .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ",").filter({ "Post.id": { op: ">", value: 1 } }), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("type: string — unchanged by .filter()", async () => {
      const _rows = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _rows, Array<{ titles: string; }>>>);
    });

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(Post.title, ',') FILTER (WHERE Post.id > 1) AS \`titles\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id ASC;`);
    });

    it("should drop the filtered-out row from user 1's group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("groupConcat with .orderBy() + .filter()", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.content", ",").orderBy("Post.content", "DESC")
          .filter({ "Post.id": { op: "<", value: 3 } }), "contents")
        .orderBy([ "User.id ASC" ]);
    }

    it("type: string | null — unchanged by .orderBy().filter()", async () => {
      const _rows = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _rows, Array<{ contents: string | null; }>>>);
    });

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(Post.content, ',' ORDER BY Post.content DESC) FILTER (WHERE Post.id < 3) AS \`contents\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id ASC;`);
    });

    it("should order the surviving rows and empty out the fully-filtered group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { contents: "sql,Something" },
        { contents: null },
      ]);
    });
  });

  describe("groupConcat with .orderBy() and no direction", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ",").orderBy("Post.title"), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(Post.title, ',' ORDER BY Post.title) AS \`titles\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id ASC;`);
    });

    it("should default to ascending", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "Blog 1,blog 2" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("aggregate ORDER BY coexists with a query-level ORDER BY", () => {
    function createQuery() {
      return (
        // #region agg-order-by
        prisma.$from("User")
          .innerJoin("Post", "authorId", "User.id")
          .groupBy([ "User.id" ])
          .select(({ groupConcat }) => groupConcat("Post.title", ",").orderBy("Post.title", "DESC"), "titles")
          .orderBy([ "User.id DESC" ])
      // #endregion agg-order-by
      );
    }

    it("should match SQL — aggregate ORDER BY inside, query ORDER BY after GROUP BY", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(Post.title, ',' ORDER BY Post.title DESC) AS \`titles\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id DESC;`);
    });

    it("should apply both orderings independently", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 3" },
        { titles: "blog 2,Blog 1" },
      ]);
    });
  });

  describe("groupConcat with chained .filter()", () => {
    // Post 2 is the only row satisfying both predicates, so a lost condition is visible in the
    // rows: dropping the second would leave user 2 with 'blog 3', dropping the first would give
    // user 1 both titles.
    function createQuery() {
      return (
        // #region agg-filter-chained
        prisma.$from("User")
          .innerJoin("Post", "authorId", "User.id")
          .groupBy([ "User.id" ])
          .select(({ groupConcat }) => groupConcat("Post.title", ",")
            .filter({ "Post.id": { op: ">", value: 1 } })
            .filter({ "Post.id": { op: "<", value: 3 } }), "titles")
          .orderBy([ "User.id ASC" ])
      // #endregion agg-filter-chained
      );
    }

    it("should match SQL — both conditions parenthesised and ANDed", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(Post.title, ',') FILTER (WHERE (Post.id > 1) AND (Post.id < 3)) AS \`titles\` FROM User INNER JOIN Post ON Post.authorId = User.id GROUP BY User.id ORDER BY User.id ASC;`);
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
        .select(({ groupConcat }) => {
          const agg = groupConcat("Post.title", ",").orderBy("Post.title", "DESC")
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
