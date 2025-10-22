import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: having", () => {
  test("having with groupBy - should generate correct SQL", () => {
    // #region with-groupby
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"])
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "bob%"
        }
      })
      .select("*")
      .getSQL();
    // #endregion with-groupby

    assert.equal(sql, "SELECT * FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content HAVING (User.name LIKE 'bob%' );");
  });

  test("having with groupBy - should be chainable", () => {
    // #region with-groupby
    const query = prisma.$from("User")
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
    // #region without-groupby
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .having({
        "User.name": {
          "op": "LIKE",
          "value": "stuart%"
        }
      })
      .select("*")
      .getSQL();
    // #endregion without-groupby

      assert.equal(sql, "SELECT * FROM User JOIN Post ON Post.authorId = User.id HAVING (User.name LIKE 'stuart%' );");
  });

  test("having without groupBy - should be chainable", () => {
    // #region without-groupby
    const query = prisma.$from("User")
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
