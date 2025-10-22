import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: groupBy", () => {
  test("groupBy - should generate correct SQL", () => {
    // #region basic
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"])
      .getSQL();
    // #endregion basic

      assert.equal(sql, "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content;")
      });

  test("groupBy - should be chainable", () => {
    // #region basic
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"]);
    // #endregion basic

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content;");
  });
});
