import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../test-utils.ts";

describe("README Example: window functions", () => {

  test("over() with ranking - SQL", () => {
    const sql =
    // #region window-rank
      prisma.$from("Post")
        .select("id")
        .select(({ over, rowNumber }) => over(rowNumber(), {
          partitionBy: [ "authorId" ],
          orderBy: [ "createdAt DESC" ],
        }), "rn")
      // #endregion window-rank
        .getSQL();

    expectSQL(sql,
      // #region window-rank-sql
      "SELECT id, ROW_NUMBER() OVER (PARTITION BY authorId ORDER BY createdAt DESC) AS `rn` FROM Post;"
      // #endregion window-rank-sql
    );
  });

  test("lag() and a ROWS frame - SQL", () => {
    const sql =
    // #region window-nav
      prisma.$from("Post")
        .select("id")
        .select(({ over, lag, lit }) => over(lag("id", 1, lit(0)), { orderBy: [ "id" ] }), "prevId")
        .select(({ over, lastValue }) => over(lastValue("title"), {
          partitionBy: [ "authorId" ],
          orderBy: [ "id" ],
          frame: { rows: [ "currentRow", "unboundedFollowing" ] },
        }), "latestTitle")
      // #endregion window-nav
        .getSQL();

    expectSQL(sql,
      // #region window-nav-sql
      "SELECT id, LAG(id, 1, 0) OVER (ORDER BY id) AS `prevId`, LAST_VALUE(title) OVER (PARTITION BY authorId ORDER BY id ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS `latestTitle` FROM Post;"
      // #endregion window-nav-sql
    );
  });

  test("top-N per group - SQL and rows", async () => {
    // #region top-n
    const ranked = prisma.$from("Post")
      .select("id")
      .select("authorId")
      .select("title")
      .select(({ over, rowNumber }) => over(rowNumber(), {
        partitionBy: [ "authorId" ],
        orderBy: [ "createdAt DESC" ],
      }), "rn");

    const latestPerAuthor = prisma.$with("ranked", ranked)
      .from("ranked")
      .where({ "ranked.rn": { op: "<=", value: 1n } })
      .select("ranked.authorId", "authorId")
      .select("ranked.title", "title");
    // #endregion top-n

    expectSQL(latestPerAuthor.getSQL(),
      // #region top-n-sql
      "WITH ranked AS (SELECT id, authorId, title, ROW_NUMBER() OVER (PARTITION BY authorId ORDER BY createdAt DESC) AS `rn` FROM Post) SELECT ranked.authorId AS `authorId`, ranked.title AS `title` FROM ranked WHERE ranked.rn <= 1;"
      // #endregion top-n-sql
    );

    const rows = await latestPerAuthor.orderBy([ "authorId" ]).run();
    assert.deepStrictEqual(rows, [
      { authorId: 1, title: "blog 2" },
      { authorId: 2, title: "blog 3" },
    ]);
  });
});
