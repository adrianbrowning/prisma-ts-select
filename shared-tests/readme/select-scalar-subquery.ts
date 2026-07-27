import { describe, test } from "node:test";

import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';

describe("README Example: scalar subquery in select", () => {

  test("builder as scalar subquery", () => {
    const sql =
// #region scalar-subquery
prisma.$from("User")
      .select("name")
      .select(
        prisma.$from("Post")
              .where({ authorId: 1 })
              .select(({ countAll }) => countAll(), "cnt"),
        "postCount"
      )
      // #endregion scalar-subquery
.getSQL();

    const expectedSQL =
      // #region scalar-subquery-sql
      "SELECT name, (SELECT COUNT(*) AS `cnt` FROM Post WHERE authorId = 1) AS `postCount` FROM User;";
      // #endregion scalar-subquery-sql

    expectSQL(sql, expectedSQL);
  });

  test("scalar subquery with where condition", () => {
    const sql =
// #region scalar-subquery-where
prisma.$from("User")
      .select("name")
      .select(
        prisma.$from("Post")
              .where({ published: true })
              .select(({ countAll }) => countAll(), "cnt"),
        "publishedCount"
      )
      // #endregion scalar-subquery-where
.getSQL();

    const expectedSQL =
      // #region scalar-subquery-where-sql
      "SELECT name, (SELECT COUNT(*) AS `cnt` FROM Post WHERE published = true) AS `publishedCount` FROM User;";
      // #endregion scalar-subquery-where-sql

    expectSQL(sql, expectedSQL);
  });

  test("subquery in coalesce", () => {
    const sql =
// #region scalar-subquery-coalesce
prisma.$from("User")
      .select(({ coalesce }) => coalesce(
        prisma.$from("Post")
              .where({ authorId: 1 })
              .select("title"),
        "User.name"
      ), "label")
      // #endregion scalar-subquery-coalesce
.getSQL();

    const expectedSQL =
      // #region scalar-subquery-coalesce-sql
      "SELECT COALESCE((SELECT title FROM Post WHERE authorId = 1), User.name) AS `label` FROM User;";
      // #endregion scalar-subquery-coalesce-sql

    expectSQL(sql, expectedSQL);
  });

});
