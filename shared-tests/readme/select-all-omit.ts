import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("README Example: selectAllOmit", () => {

  test("single table — omit one column", () => {
    const sql =
// #region single-omit
prisma.$from("User")
      .selectAllOmit(["User.email"])
      // #endregion single-omit
.getSQL();

    const expectedSQL =
      // #region single-omit-sql
      `SELECT ${dialect.quote("id")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")};`;
      // #endregion single-omit-sql

    assert.equal(sql, expectedSQL);
  });

  test("single table — omit multiple columns", () => {
    const sql =
// #region multi-omit
prisma.$from("User")
      .selectAllOmit(["User.email", "User.age"])
      // #endregion multi-omit
.getSQL();

    expectSQL(sql, `SELECT ${dialect.quote("id")}, ${dialect.quote("name")} FROM ${dialect.quote("User")};`);
  });

  test("with join — omit from both tables", () => {
    const sql =
// #region join-omit
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .selectAllOmit(["User.email", "Post.content"])
      // #endregion join-omit
.getSQL();

    assert.ok(sql.includes("FROM") && !sql.includes("email") && !sql.includes("content"));
  });

});
