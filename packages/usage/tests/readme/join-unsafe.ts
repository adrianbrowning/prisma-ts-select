import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: unsafe joins", () => {
  test("joinUnsafeTypeEnforced - should generate correct SQL", () => {
    // #region type-enforced
    const sql = prisma.$from("User")
      .joinUnsafeTypeEnforced("Post", "title", "User.name")
      .getSQL();
    // #endregion type-enforced

    assert.equal(sql,"FROM User JOIN Post ON Post.title = User.name;");
  });

  test("joinUnsafeTypeEnforced - should be chainable", () => {
    // #region type-enforced
    const query = prisma.$from("User")
      .joinUnsafeTypeEnforced("Post", "title", "User.name");
    // #endregion type-enforced

    assert.equal(query.getSQL(), 'FROM User JOIN Post ON Post.title = User.name;');
  });

  test("joinUnsafeIgnoreType - should generate correct SQL", () => {
    // #region ignore-type
    const sql = prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .getSQL();
    // #endregion ignore-type

    assert.equal(sql,"FROM User JOIN Post ON Post.id = User.name;");
  });

  test("joinUnsafeIgnoreType - should be chainable", () => {
    // #region ignore-type
    const query = prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name");
    // #endregion ignore-type

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name;");
  });
});
