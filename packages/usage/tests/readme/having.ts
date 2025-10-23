import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: having", () => {
  test("having with groupBy - should generate correct SQL", () => {
    const sql =
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
      .select("*")
      // #endregion with-groupby
.getSQL();

    const expectedSQL =
      // #region with-groupby-sql
      "SELECT * FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content HAVING (User.name LIKE 'bob%' );";
      // #endregion with-groupby-sql

    assert.equal(sql, expectedSQL);
  });

  test("having with groupBy - should be chainable", () => {
    const query =
// #region with-groupby
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

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content HAVING (User.name LIKE 'bob%' );");
  });

  test("having without groupBy - should generate correct SQL", () => {
    const sql =
// #region without-groupby
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "stuart%"
        }
      })
      .select("*")
      // #endregion without-groupby
.getSQL();

    const expectedSQL =
      // #region without-groupby-sql
      "SELECT * FROM User JOIN Post ON Post.authorId = User.id HAVING (User.name LIKE 'stuart%' );";
      // #endregion without-groupby-sql

    assert.equal(sql, expectedSQL);
  });

  test("having without groupBy - should be chainable", () => {
    const query =
// #region without-groupby
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "stuart%"
        }
      });
    // #endregion without-groupby

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id HAVING (User.name LIKE 'stuart%' );");
  });
});
