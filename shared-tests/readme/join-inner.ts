import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: .innerJoin", () => {
  test("innerJoin - SQL", () => {
    const sql =
// #region example
prisma.$from("User")
      .innerJoin("Post", "authorId", "User.id")
      // #endregion example
      .getSQL();

    const expectedSQL =
      // #region sql
      "FROM User INNER JOIN Post ON Post.authorId = User.id;";
      // #endregion sql

    assert.equal(sql, expectedSQL);
  });

  test("innerJoinUnsafeTypeEnforced - SQL", () => {
    const sql =
// #region type-enforced
prisma.$from("User")
      .innerJoinUnsafeTypeEnforced("Post", "title", "User.name")
      // #endregion type-enforced
      .getSQL();

    const expectedSQL =
      // #region type-enforced-sql
      "FROM User INNER JOIN Post ON Post.title = User.name;";
      // #endregion type-enforced-sql

    assert.equal(sql, expectedSQL);
  });

  test("innerJoinUnsafeIgnoreType - SQL", () => {
    const sql =
// #region ignore-type
prisma.$from("User")
      .innerJoinUnsafeIgnoreType("Post", "id", "User.name")
      // #endregion ignore-type
      .getSQL();

    const expectedSQL =
      // #region ignore-type-sql
      "FROM User INNER JOIN Post ON Post.id = User.name;";
      // #endregion ignore-type-sql

    assert.equal(sql, expectedSQL);
  });
});
