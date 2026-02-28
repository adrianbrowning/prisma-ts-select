import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: .crossJoin", () => {
  test("crossJoin - SQL", () => {
    const sql =
// #region example
prisma.$from("User")
      .crossJoin("Post")
      // #endregion example
      .getSQL();

    const expectedSQL =
      // #region sql
      "FROM User CROSS JOIN Post;";
      // #endregion sql

    assert.equal(sql, expectedSQL);
  });

  test("crossJoinUnsafeTypeEnforced - SQL", () => {
    const sql =
// #region type-enforced
prisma.$from("User")
      .crossJoinUnsafeTypeEnforced("Post")
      // #endregion type-enforced
      .getSQL();

    const expectedSQL =
      // #region type-enforced-sql
      "FROM User CROSS JOIN Post;";
      // #endregion type-enforced-sql

    assert.equal(sql, expectedSQL);
  });

  test("crossJoinUnsafeIgnoreType - SQL", () => {
    const sql =
// #region ignore-type
prisma.$from("User")
      .crossJoinUnsafeIgnoreType("Post")
      // #endregion ignore-type
      .getSQL();

    const expectedSQL =
      // #region ignore-type-sql
      "FROM User CROSS JOIN Post;";
      // #endregion ignore-type-sql

    assert.equal(sql, expectedSQL);
  });
});
