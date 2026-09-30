import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";

const q = (ref: string) => dialect.quoteQualifiedColumn(ref);
const alias = (name: string) => dialect.quote(name, true);
const Post = dialect.quoteTableIdentifier("Post", false);

/** Window values come back as bigint, number or text depending on the driver; compare them as numbers. */
const num = (v: unknown) => v === null ? null : Number(v);

describe("select() fn context — window functions", () => {

  describe("over() + ranking functions", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select("id")
        .select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "authorId" ], orderBy: [ "Post.id DESC" ] }), "rn")
        .select(({ over, rank }) => over(rank(), { orderBy: [ "authorId" ] }), "rk")
        .select(({ over, denseRank }) => over(denseRank(), { orderBy: [ "authorId" ] }), "drk")
        .orderBy([ "id" ]);
    }

    it("should emit OVER (PARTITION BY … ORDER BY …) SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ${q("id")}, ROW_NUMBER() OVER (PARTITION BY ${q("authorId")} ORDER BY ${q("Post.id")} DESC) AS ${alias("rn")}, `
        + `RANK() OVER (ORDER BY ${q("authorId")}) AS ${alias("rk")}, DENSE_RANK() OVER (ORDER BY ${q("authorId")}) AS ${alias("drk")} `
        + `FROM ${Post} ORDER BY ${q("id")};`);
    });

    it("type: ranks are bigint and the other columns keep their types", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ id: number; rn: bigint; rk: bigint; drk: bigint; }>>>);
    });

    it("should rank within partitions", async () => {
      const result = await createQuery().run();
      assert.deepStrictEqual(result, [
        { id: 1, rn: 2n, rk: 1n, drk: 1n },
        { id: 2, rn: 1n, rk: 1n, drk: 1n },
        { id: 3, rn: 1n, rk: 3n, drk: 2n },
      ]);
    });

    it("over() without options renders an empty window", () => {
      expectSQL(prisma.$from("Post").select(({ over, rowNumber }) => over(rowNumber()), "rn")
        .getSQL(),
      `SELECT ROW_NUMBER() OVER () AS ${alias("rn")} FROM ${Post};`);
    });

    it("ranking functions run with a frame, which they ignore", async () => {
      const result = await prisma.$from("Post")
        .select("id")
        .select(({ over, rowNumber }) => over(rowNumber(), { orderBy: [ "id" ], frame: { rows: [{ following: 1 }, "unboundedFollowing" ] } }), "rn")
        .select(({ over, rank }) => over(rank(), { orderBy: [ "authorId" ], frame: { range: [ "unboundedPreceding", "currentRow" ] } }), "rk")
        .orderBy([ "id" ])
        .run();
      typeCheck({} as Expect<Equal<typeof result, Array<{ id: number; rn: bigint; rk: bigint; }>>>);
      assert.deepStrictEqual(result, [
        { id: 1, rn: 1n, rk: 1n },
        { id: 2, rn: 2n, rk: 1n },
        { id: 3, rn: 3n, rk: 3n },
      ]);
    });
  });

  describe("partition and order terms", () => {
    it("accept expressions from the same context", () => {
      const sql = prisma.$from("Post")
        .select(({ over, rowNumber, lower }) => over(rowNumber(), { partitionBy: [ lower("title") ], orderBy: [[ lower("title"), "DESC" ], "id ASC" ] }), "rn")
        .getSQL();
      expectSQL(sql,
        `SELECT ROW_NUMBER() OVER (PARTITION BY LOWER(${q("title")}) ORDER BY LOWER(${q("title")}) DESC, ${q("id")} ASC) AS ${alias("rn")} FROM ${Post};`);
    });

    it("accept columns from joined tables", async () => {
      const result = await prisma.$from("Post")
        .join("User", "id", "Post.authorId")
        .select("Post.id")
        .select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "User.email" ], orderBy: [ "Post.id" ] }), "rn")
        .orderBy([ "Post.id" ])
        .run();
      assert.deepStrictEqual(result.map(r => r.rn), [ 1n, 2n, 1n ]);
    });

    it("reject columns that are not in scope", () => {
      // @ts-expect-error — User is not joined
      prisma.$from("Post").select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "User.email" ] }), "rn");
      // @ts-expect-error — no such column
      prisma.$from("Post").select(({ over, rowNumber }) => over(rowNumber(), { orderBy: [ "Post.nope DESC" ] }), "rn");
      prisma.$from("Post").join("User", "id", "Post.authorId")
        // @ts-expect-error — `id` is ambiguous once User is joined
        .select(({ over, rowNumber }) => over(rowNumber(), { orderBy: [ "id" ] }), "rn");
    });

    it("accept a CTE's own columns and reject any other", async () => {
      const inner = prisma.$from("Post").select("id")
        .select("authorId");
      const result = await prisma.$with("pp", inner)
        .from("pp")
        .select("pp.id", "id")
        .select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "pp.authorId" ], orderBy: [ "pp.id DESC" ] }), "rn")
        .orderBy([ "id" ])
        .run();
      assert.deepStrictEqual(result.map(r => r.rn), [ 2n, 1n, 1n ]);

      prisma.$with("pp", inner).from("pp")
        // @ts-expect-error — not a column of the CTE
        .select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "pp.nope" ] }), "rn");
    });

    it("a window function is not selectable without over()", () => {
      // @ts-expect-error — ROW_NUMBER() needs an OVER clause
      prisma.$from("Post").select(({ rowNumber }) => rowNumber(), "rn");
    });

    it("window functions are not in the where() / having() context", () => {
      // @ts-expect-error — SQL rejects a window function in WHERE
      prisma.$from("Post").where(({ over, rowNumber }) => [[ over(rowNumber()), 1n ]]);
      prisma.$from("Post").groupBy([ "authorId" ])
        // @ts-expect-error — and in HAVING
        .having(({ over, rowNumber }) => [[ over(rowNumber()), 1n ]]);
      // @ts-expect-error — the navigation functions are left out too
      prisma.$from("Post").where(({ over, lead }) => [[ over(lead("id")), 1 ]]);
      // @ts-expect-error — and HAVING without GROUP BY
      prisma.$from("Post").having(({ over, firstValue }) => [[ over(firstValue("id")), 1 ]]);
    });
  });

  describe("lag() / lead()", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select("id")
        .select(({ over, lag }) => over(lag("id"), { orderBy: [ "id" ] }), "prevId")
        .select(({ over, lag, lit }) => over(lag("id", 2, lit(0)), { orderBy: [ "id" ] }), "prev2")
        .select(({ over, lead }) => over(lead("title"), { partitionBy: [ "authorId" ], orderBy: [ "id" ] }), "nextTitle")
        .orderBy([ "id" ]);
    }

    it("should emit LAG / LEAD SQL with offset and default", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ${q("id")}, LAG(${q("id")}) OVER (ORDER BY ${q("id")}) AS ${alias("prevId")}, `
        + `LAG(${q("id")}, 2, 0) OVER (ORDER BY ${q("id")}) AS ${alias("prev2")}, `
        + `LEAD(${q("title")}) OVER (PARTITION BY ${q("authorId")} ORDER BY ${q("id")}) AS ${alias("nextTitle")} `
        + `FROM ${Post} ORDER BY ${q("id")};`);
    });

    it("type: a string column stays string, and LEAD without a default is nullable", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<(typeof _result)[number]["nextTitle"], string | null>>);
    });

    it("should read neighbouring rows, NULL past the edge unless defaulted", async () => {
      const result = await createQuery().run();
      assert.deepStrictEqual(result.map(r => [ r.id, num(r.prevId), num(r.prev2), r.nextTitle ]), [
        [ 1, null, 0, "blog 2" ],
        [ 2, 1, 0, null ],
        [ 3, 2, 1, null ],
      ]);
    });

    it("the default must match the argument type", () => {
      // @ts-expect-error — string default for a number column
      prisma.$from("Post").select(({ over, lag, lit }) => over(lag("id", 1, lit("none"))), "x");
    });

    it("rejects a negative offset", () => {
      assert.throws(() => prisma.$from("Post").select(({ over, lag }) => over(lag("id", -1)), "x"), /non-negative integer/);
    });
  });

  describe("firstValue() / lastValue() and frames", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select("id")
        .select(({ over, firstValue }) => over(firstValue("title"), { partitionBy: [ "authorId" ], orderBy: [ "id" ] }), "firstTitle")
        .select(({ over, lastValue }) => over(lastValue("title"), {
          orderBy: [ "id" ],
          frame: { rows: [ "currentRow", "unboundedFollowing" ] },
        }), "lastTitle")
        .select(({ over, lastValue }) => over(lastValue("title"), {
          orderBy: [ "id" ],
          frame: { rows: [{ following: 1 }, { following: 1 }] },
        }), "nextTitle")
        .select(({ over, firstValue }) => over(firstValue("title"), {
          orderBy: [ "id" ],
          frame: { range: [ "unboundedPreceding", "currentRow" ] },
        }), "runningFirst")
        .orderBy([ "id" ]);
    }

    it("should emit ROWS / RANGE frame SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT ${q("id")}, FIRST_VALUE(${q("title")}) OVER (PARTITION BY ${q("authorId")} ORDER BY ${q("id")}) AS ${alias("firstTitle")}, `
        + `LAST_VALUE(${q("title")}) OVER (ORDER BY ${q("id")} ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS ${alias("lastTitle")}, `
        + `LAST_VALUE(${q("title")}) OVER (ORDER BY ${q("id")} ROWS BETWEEN 1 FOLLOWING AND 1 FOLLOWING) AS ${alias("nextTitle")}, `
        + `FIRST_VALUE(${q("title")}) OVER (ORDER BY ${q("id")} RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ${alias("runningFirst")} `
        + `FROM ${Post} ORDER BY ${q("id")};`);
    });

    it("type: non-null over a frame holding the current row, nullable over one that can be empty", async () => {
      const _result = await createQuery().run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ id: number; firstTitle: string; lastTitle: string; nextTitle: string | null; runningFirst: string; }>>>);
    });

    it("should read the frame's first / last row", async () => {
      const result = await createQuery().run();
      assert.deepStrictEqual(result, [
        { id: 1, firstTitle: "Blog 1", lastTitle: "blog 3", nextTitle: "blog 2", runningFirst: "Blog 1" },
        { id: 2, firstTitle: "Blog 1", lastTitle: "blog 3", nextTitle: "blog 3", runningFirst: "Blog 1" },
        { id: 3, firstTitle: "blog 3", lastTitle: "blog 3", nextTitle: null, runningFirst: "Blog 1" },
      ]);
    });

    it("rejects frames the databases reject", () => {
      assert.throws(() => prisma.$from("Post")
        // @ts-expect-error — a frame cannot start after CURRENT ROW and end at it
        .select(({ over, lastValue }) => over(lastValue("title"), { frame: { rows: [{ following: 1 }, "currentRow" ] } }), "x"), /cannot start/);
      // @ts-expect-error — RANGE offsets are not portable
      prisma.$from("Post").select(({ over, lastValue }) => over(lastValue("title"), { frame: { range: [{ preceding: 1 }, "currentRow" ] } }), "x");
    });
  });

  describe("top-N per group", () => {
    it("keeps each author's latest post through a CTE", async () => {
      const ranked = prisma.$from("Post")
        .select("id")
        .select("authorId")
        .select("title")
        .select(({ over, rowNumber }) => over(rowNumber(), { partitionBy: [ "authorId" ], orderBy: [ "createdAt DESC" ] }), "rn");

      const result = await prisma.$with("ranked", ranked)
        .from("ranked")
        .where({ "ranked.rn": 1n })
        .select("ranked.authorId", "authorId")
        .select("ranked.title", "title")
        .orderBy([ "authorId" ])
        .run();

      typeCheck({} as Expect<Equal<typeof result, Array<{ authorId: number; title: string; }>>>);
      assert.deepStrictEqual(result, [
        { authorId: 1, title: "blog 2" },
        { authorId: 2, title: "blog 3" },
      ]);
    });
  });
});
