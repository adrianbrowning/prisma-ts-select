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
      .select("email")
      .getSQL();

    const expectedSQL =
      // #region join-with-select-sql
      "SELECT email FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion join-with-select-sql

    expectSQL(sql, expectedSQL);
  });

  test("select(*) on join produces qualified columns", () => {
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("*")
      .getSQL();

    // select("*") on a multi-table query expands to qualified columns to avoid ambiguity
    assert.ok(sql.includes("User.id"), `expected qualified "User.id" in: ${sql}`);
    assert.ok(sql.includes("Post.title"), `expected qualified "Post.title" in: ${sql}`);
  });
});
