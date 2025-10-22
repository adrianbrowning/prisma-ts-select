import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: orderBy", () => {
  test("orderBy - should generate correct SQL", () => {
    // #region basic
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .orderBy(["name", "Post.content DESC"])
      .getSQL();
    // #endregion basic

    assert.equal(sql,"FROM User JOIN Post ON Post.authorId = User.id ORDER BY name, Post.content DESC;");
  });

  test("orderBy - should be chainable", () => {
    // #region basic
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .orderBy(["name", "Post.content DESC"]);
    // #endregion basic

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id ORDER BY name, Post.content DESC;");
  });
});
