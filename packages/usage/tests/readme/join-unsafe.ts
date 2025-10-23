import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: unsafe joins", () => {
  test("joinUnsafeTypeEnforced - should generate correct SQL", () => {
    const sql =
// #region type-enforced
prisma.$from("User")
      .joinUnsafeTypeEnforced("Post", "title", "User.name")
      // #endregion type-enforced
.getSQL();

    const expectedSQL =
      // #region type-enforced-sql
      "FROM User JOIN Post ON Post.title = User.name;";
      // #endregion type-enforced-sql

    assert.equal(sql, expectedSQL);
  });

  test("joinUnsafeTypeEnforced - should be chainable", () => {
    const query =
// #region type-enforced
prisma.$from("User")
      .joinUnsafeTypeEnforced("Post", "title", "User.name");
    // #endregion type-enforced

    const expectedSQL =
      // #region type-enforced-sql
      "FROM User JOIN Post ON Post.title = User.name;";
      // #endregion type-enforced-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("joinUnsafeIgnoreType - should generate correct SQL", () => {
    const sql =
// #region ignore-type
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      // #endregion ignore-type
.getSQL();

    const expectedSQL =
      // #region ignore-type-sql
      "FROM User JOIN Post ON Post.id = User.name;";
      // #endregion ignore-type-sql

    assert.equal(sql, expectedSQL);
  });

  test("joinUnsafeIgnoreType - should be chainable", () => {
    const query =
// #region ignore-type
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name");
    // #endregion ignore-type

    const expectedSQL =
      // #region ignore-type-sql
      "FROM User JOIN Post ON Post.id = User.name;";
      // #endregion ignore-type-sql

    assert.equal(query.getSQL(), expectedSQL);
  });
});
