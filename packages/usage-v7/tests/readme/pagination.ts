import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../client.ts";

describe("README Example: pagination", () => {
  test("limit - should generate correct SQL", () => {
    const sql =
// #region limit
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1)
      // #endregion limit
.getSQL();

    const expectedSQL =
      // #region limit-sql
      "FROM User JOIN Post ON Post.authorId = User.id LIMIT 1;";
      // #endregion limit-sql

    assert.equal(sql, expectedSQL);
  });

  test("limit - should be chainable", () => {
    const query =
// #region limit
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1);
    // #endregion limit

    const expectedSQL =
      // #region limit-sql
      "FROM User JOIN Post ON Post.authorId = User.id LIMIT 1;";
      // #endregion limit-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("offset - should generate correct SQL", () => {
    const sql =
// #region offset
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1)
      .offset(1)
      // #endregion offset
.getSQL();

    const expectedSQL =
      // #region offset-sql
      "FROM User JOIN Post ON Post.authorId = User.id LIMIT 1 OFFSET 1;";
      // #endregion offset-sql

    assert.equal(sql, expectedSQL);
  });

  test("offset - should run successfully", async () => {
    // #region offset
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("*")
      .limit(1)
      .offset(1)
      // #endregion offset
.run();

    assert.ok(Array.isArray(result));
  });
});
