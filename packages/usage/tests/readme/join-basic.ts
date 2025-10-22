import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .join basic", () => {
  test("should create type-safe join", () => {
    // #region example
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id");
    // #endregion

    // Verify query can be chained
    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id;");
  });

  test("should generate correct SQL", () => {
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("*")
      .getSQL();

    assert.strictEqual(sql, "SELECT * FROM User JOIN Post ON Post.authorId = User.id;");
  });
});
