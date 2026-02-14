import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { expectSQL } from "../test-utils.ts";


import { prisma } from '#client';

describe("README Example: .join basic", () => {
  test("should create type-safe join", () => {
    const query =
// #region example
prisma.$from("User")
      .join("Post", "authorId", "User.id");
    // #endregion

    // Verify query can be chained
    const expectedSQL =
      // #region join-basic-sql
      "FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion join-basic-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("should generate correct SQL", () => {
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("*")
      .getSQL();

    const expectedSQL =
      // #region join-with-select-sql
      "SELECT * FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion join-with-select-sql

    expectSQL(sql, expectedSQL);
  });
});
