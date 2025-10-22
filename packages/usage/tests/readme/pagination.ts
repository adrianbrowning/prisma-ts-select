import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: pagination", () => {
  test("limit - should generate correct SQL", () => {
    // #region limit
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1)
      .getSQL();
    // #endregion limit

    assert.equal(sql,"FROM User JOIN Post ON Post.authorId = User.id LIMIT 1;");
  });

  test("limit - should be chainable", () => {
    // #region limit
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1);
    // #endregion limit

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id LIMIT 1;");
  });

  test("offset - should generate correct SQL", () => {
    // #region offset
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .limit(1)
      .offset(1)
      .getSQL();
    // #endregion offset

    assert.equal(sql,"FROM User JOIN Post ON Post.authorId = User.id LIMIT 1 OFFSET 1;");
  });

  test("offset - should run successfully", async () => {
    // #region offset
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("*")
      .limit(1)
      .offset(1)
      .run();
    // #endregion offset

    assert.ok(Array.isArray(result));
  });
});
