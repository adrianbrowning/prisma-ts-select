import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../client.ts";

describe("README Example: groupBy", () => {
  test("groupBy - should generate correct SQL", () => {
    const sql =
// #region basic
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"])
      // #endregion basic
.getSQL();

    const expectedSQL =
      // #region basic-sql
      "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content;";
      // #endregion basic-sql

    assert.equal(sql, expectedSQL);
  });

  test("groupBy - should be chainable", () => {
    const query =
// #region basic
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["name", "Post.content"]);
    // #endregion basic

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id GROUP BY name, Post.content;");
  });
});
