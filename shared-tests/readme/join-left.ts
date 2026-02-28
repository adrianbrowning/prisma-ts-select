import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: .leftJoin", () => {
  test("leftJoin - SQL", () => {
    const sql =
// #region example
prisma.$from("User")
      .leftJoin("Post", "authorId", "User.id")
      // #endregion example
      .getSQL();

    const expectedSQL =
      // #region sql
      "FROM User LEFT JOIN Post ON Post.authorId = User.id;";
      // #endregion sql

    assert.equal(sql, expectedSQL);
  });

  test("leftJoinUnsafeTypeEnforced - SQL", () => {
    const sql =
// #region type-enforced
prisma.$from("User")
      .leftJoinUnsafeTypeEnforced("Post", "title", "User.name")
      // #endregion type-enforced
      .getSQL();

    const expectedSQL =
      // #region type-enforced-sql
      "FROM User LEFT JOIN Post ON Post.title = User.name;";
      // #endregion type-enforced-sql

    assert.equal(sql, expectedSQL);
  });

  test("leftJoinUnsafeIgnoreType - SQL", () => {
    const sql =
// #region ignore-type
prisma.$from("User")
      .leftJoinUnsafeIgnoreType("Post", "id", "User.name")
      // #endregion ignore-type
      .getSQL();

    const expectedSQL =
      // #region ignore-type-sql
      "FROM User LEFT JOIN Post ON Post.id = User.name;";
      // #endregion ignore-type-sql

    assert.equal(sql, expectedSQL);
  });
});
