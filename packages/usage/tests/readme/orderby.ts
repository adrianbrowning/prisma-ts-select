import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: orderBy", () => {
  test("orderBy - should generate correct SQL", () => {
    const sql =
// #region basic
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .orderBy(["name", "Post.content DESC"])
      // #endregion basic
.getSQL();

    const expectedSQL =
      // #region basic-sql
      "FROM User JOIN Post ON Post.authorId = User.id ORDER BY name, Post.content DESC;";
      // #endregion basic-sql

    assert.equal(sql, expectedSQL);
  });

  test("orderBy - should be chainable", () => {
    const query =
// #region basic
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .orderBy(["name", "Post.content DESC"]);
    // #endregion basic

    const expectedSQL =
      // #region basic-sql
      "FROM User JOIN Post ON Post.authorId = User.id ORDER BY name, Post.content DESC;";
      // #endregion basic-sql

    assert.equal(query.getSQL(), expectedSQL);
  });
});
