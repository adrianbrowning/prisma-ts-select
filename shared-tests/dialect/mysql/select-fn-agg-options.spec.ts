import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// Every query below joins before grouping so each group holds more than one row — user 1 owns
// 'Blog 1' + 'blog 2', user 2 owns 'blog 3'. A one-row-per-group shape cannot show wrong
// aggregate ordering or a filter that silently does nothing.
describe("MySQL aggregate fluent API (ORDER BY + FILTER via CASE WHEN)", () => {
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
        `SELECT GROUP_CONCAT(\`Post\`.\`title\` ORDER BY \`Post\`.\`title\` DESC SEPARATOR ',') AS \`titles\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
    });

    it("should concatenate each group in descending title order", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2,Blog 1" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("groupConcat with .filter() (CASE WHEN rewrite)", () => {
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
        `SELECT GROUP_CONCAT(CASE WHEN \`Post\`.\`id\` > 1 THEN \`Post\`.\`title\` END SEPARATOR ',') AS \`titles\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
    });

    it("should drop the filtered-out row from user 1's group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 2" },
        { titles: "blog 3" },
      ]);
    });
  });

  describe("groupConcat .filter() is equivalent to a WHERE-filtered aggregate", () => {
    // GROUP_CONCAT skips NULL, so CASE WHEN <cond> THEN col END must return exactly what the
    // same aggregate returns over WHERE-filtered rows. Post.content is NULL for 'blog 3', so the
    // comparison covers a group whose surviving rows are all NULL.
    function createFilteredQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.content", ",").filter({ "Post.id": { op: ">", value: 1 } }), "contents")
        .orderBy([ "User.id ASC" ]);
    }

    function createWhereQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .where({ "Post.id": { op: ">", value: 1 } })
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.content", ","), "contents")
        .orderBy([ "User.id ASC" ]);
    }

    it("should return the same rows either way", async () => {
      const filtered = await createFilteredQuery().run();
      const whereFiltered = await createWhereQuery().run();
      assert.deepStrictEqual(filtered, [
        { contents: "sql" },
        { contents: null },
      ]);
      assert.deepStrictEqual(filtered, whereFiltered);
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
        `SELECT GROUP_CONCAT(CASE WHEN \`Post\`.\`id\` < 3 THEN \`Post\`.\`content\` END ORDER BY \`Post\`.\`content\` DESC SEPARATOR ',') AS \`contents\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
    });

    it("should order the surviving rows and empty out the fully-filtered group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { contents: "sql,Something" },
        { contents: null },
      ]);
    });
  });

  describe("groupConcat(distinct(col)) with .filter()", () => {
    // Grouping from Post repeats 'John Doe' once per post, so DISTINCT collapses it to one value.
    // DISTINCT must sit outside the CASE: `CASE WHEN … THEN DISTINCT col END` is a MySQL syntax error.
    function createQuery() {
      return prisma.$from("Post")
        .innerJoin("User", "id", "Post.authorId")
        .groupBy([ "User.id" ])
        .select(({ groupConcat, distinct }) => groupConcat(distinct("User.name"), ",")
          .filter({ "Post.id": { op: "<", value: 3 } }), "names")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(DISTINCT CASE WHEN \`Post\`.\`id\` < 3 THEN \`User\`.\`name\` END SEPARATOR ',') AS \`names\` FROM \`Post\` INNER JOIN \`User\` ON \`User\`.\`id\` = \`Post\`.\`authorId\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
    });

    it("should dedupe the surviving rows and empty out the fully-filtered group", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { names: "John Doe" },
        { names: null },
      ]);
    });
  });

  describe("groupConcat(distinct(col)) with .filter() + .orderBy() + separator", () => {
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat, distinct }) => groupConcat(distinct("Post.content"), ",").orderBy("Post.content", "DESC")
          .filter({ "User.age": { op: "<", value: 30 } }), "contents")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL — DISTINCT outside the CASE, ORDER BY and SEPARATOR after it", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(DISTINCT CASE WHEN \`User\`.\`age\` < 30 THEN \`Post\`.\`content\` END ORDER BY \`Post\`.\`content\` DESC SEPARATOR ',') AS \`contents\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
    });

    it("should apply all three clauses at once", async () => {
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
        `SELECT GROUP_CONCAT(\`Post\`.\`title\` ORDER BY \`Post\`.\`title\` SEPARATOR ',') AS \`titles\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
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
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ",").orderBy("Post.title", "DESC"), "titles")
        .orderBy([ "User.id DESC" ]);
    }

    it("should match SQL — aggregate ORDER BY inside, query ORDER BY after GROUP BY", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(\`Post\`.\`title\` ORDER BY \`Post\`.\`title\` DESC SEPARATOR ',') AS \`titles\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` DESC;`);
    });

    it("should apply both orderings independently", async () => {
      assert.deepStrictEqual(await createQuery().run(), [
        { titles: "blog 3" },
        { titles: "blog 2,Blog 1" },
      ]);
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

  describe("groupConcat with chained .filter() (CASE WHEN rewrite)", () => {
    // Post 2 is the only row satisfying both predicates, so a lost condition is visible in the
    // rows: dropping the second would leave user 2 with 'blog 3', dropping the first would give
    // user 1 both titles.
    function createQuery() {
      return prisma.$from("User")
        .innerJoin("Post", "authorId", "User.id")
        .groupBy([ "User.id" ])
        .select(({ groupConcat }) => groupConcat("Post.title", ",")
          .filter({ "Post.id": { op: ">", value: 1 } })
          .filter({ "Post.id": { op: "<", value: 3 } }), "titles")
        .orderBy([ "User.id ASC" ]);
    }

    it("should match SQL — both conditions parenthesised and ANDed inside the CASE", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(CASE WHEN (\`Post\`.\`id\` > 1) AND (\`Post\`.\`id\` < 3) THEN \`Post\`.\`title\` END SEPARATOR ',') AS \`titles\` FROM \`User\` INNER JOIN \`Post\` ON \`Post\`.\`authorId\` = \`User\`.\`id\` GROUP BY \`User\`.\`id\` ORDER BY \`User\`.\`id\` ASC;`);
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
        `SELECT GROUP_CONCAT(\`User\`.\`name\` SEPARATOR ',') AS \`names\` FROM \`User\` GROUP BY \`User\`.\`id\`;`);
    });
  });
});
