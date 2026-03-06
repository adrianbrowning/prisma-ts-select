import { describe, test } from "node:test";
import assert from "node:assert/strict";



import { prisma } from '#client';

describe("README Example: having", () => {
  test("having with groupBy - should generate correct SQL", () => {
    const $sql =
// #region with-groupby
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"])
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "bob%"
        }
      })
      .select("email");
      // #endregion with-groupby
    const sql = $sql.getSQL();

    const expectedSQL =
      // #region with-groupby-sql
      "SELECT email FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content HAVING User.name LIKE 'bob%';";
      // #endregion with-groupby-sql

    assert.equal(sql, expectedSQL);
  });

  test("having with groupBy - should be chainable", () => {
    const query =
// #region with-groupby-chain
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"])
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "bob%"
        }
      });
    // #endregion with-groupby

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content HAVING User.name LIKE 'bob%';");
  });

  test("having without groupBy - should generate correct SQL", () => {
    const $sql =
// #region without-groupby
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "stuart%"
        }
      })
      .select("email");
      // #endregion without-groupby
    const sql = $sql.getSQL();

    const expectedSQL =
      // #region without-groupby-sql
      "SELECT email FROM User JOIN Post ON Post.authorId = User.id HAVING User.name LIKE 'stuart%';";
      // #endregion without-groupby-sql

    assert.equal(sql, expectedSQL);
  });

  test("having without groupBy - should be chainable", () => {
    const query =
// #region without-groupby-run
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "stuart%"
        }
      });
    // #endregion without-groupby

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id HAVING User.name LIKE 'stuart%';");
  });

  test("having with aggregate fn (tuple syntax) - countAll", () => {
    const sql =
// #region agg-fn-tuple-countall
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["User.name"])
      .having(({ countAll }) => [[countAll(), { op: '>', value: 1 }]])
      .select("User.name")
      // #endregion agg-fn-tuple-countall
.getSQL();

    const expectedSQL =
      // #region agg-fn-tuple-countall-sql
      "SELECT name FROM User JOIN Post ON Post.authorId = User.id GROUP BY User.name HAVING COUNT(*) > 1;";
      // #endregion agg-fn-tuple-countall-sql

    assert.equal(sql, expectedSQL);
  });

  test("having with aggregate fn (tuple syntax) - count col", () => {
    const sql =
// #region agg-fn-tuple-count
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["User.name"])
      .having(({ count }) => [[count('User.id'), { op: '>=', value: 2n }]])
      .select("User.name")
      // #endregion agg-fn-tuple-count
.getSQL();

    const expectedSQL =
      // #region agg-fn-tuple-count-sql
      "SELECT name FROM User JOIN Post ON Post.authorId = User.id GROUP BY User.name HAVING COUNT(User.id) >= 2;";
      // #endregion agg-fn-tuple-count-sql

    assert.equal(sql, expectedSQL);
  });

  test("having with string expr fn (upper LIKE)", () => {
    const sql =
// #region agg-fn-string-upper
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["User.name"])
      .having(({ upper }) => [[upper('User.name'), { op: 'LIKE', value: 'John%' }]])
      .select("User.name")
      // #endregion agg-fn-string-upper
.getSQL();

    const expectedSQL =
      // #region agg-fn-string-upper-sql
      "SELECT name FROM User JOIN Post ON Post.authorId = User.id GROUP BY User.name HAVING UPPER(User.name) LIKE 'John%';";
      // #endregion agg-fn-string-upper-sql

    assert.equal(sql, expectedSQL);
  });
});
