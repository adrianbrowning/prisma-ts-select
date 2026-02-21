import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("README Example: select functions", () => {

  // ── lit() ───────────────────────────────────────────────────────────────

  test("lit() — string literal", () => {
    const sql =
// #region lit-string
prisma.$from("User")
      .select(({ lit }) => lit("hello"), "greeting")
      // #endregion lit-string
.getSQL();

    const expectedSQL =
      // #region lit-string-sql
      `SELECT 'hello' AS ${dialect.quote("greeting", true)} FROM ${dialect.quote("User")};`;
      // #endregion lit-string-sql

    assert.equal(sql, expectedSQL);
  });

  test("lit() — number literal", () => {
    const sql =
// #region lit-number
prisma.$from("User")
      .select(({ lit }) => lit(42), "answer")
      // #endregion lit-number
.getSQL();

    expectSQL(sql, `SELECT 42 AS \`answer\` FROM User;`);
  });

  test("lit() — null literal", () => {
    const sql =
// #region lit-null
prisma.$from("User")
      .select(({ lit }) => lit(null), "empty")
      // #endregion lit-null
.getSQL();

    expectSQL(sql, `SELECT NULL AS \`empty\` FROM User;`);
  });

  // ── countAll() ──────────────────────────────────────────────────────────

  test("countAll()", () => {
    const sql =
// #region count-all
prisma.$from("User")
      .select(({ countAll }) => countAll(), "total")
      // #endregion count-all
.getSQL();

    const expectedSQL =
      // #region count-all-sql
      `SELECT COUNT(*) AS \`total\` FROM User;`;
      // #endregion count-all-sql

    expectSQL(sql, expectedSQL);
  });

  // ── count() ─────────────────────────────────────────────────────────────

  test("count(col)", () => {
    const sql =
// #region count-col
prisma.$from("User")
      .select(({ count }) => count("User.id"), "cnt")
      // #endregion count-col
.getSQL();

    expectSQL(sql, `SELECT COUNT(User.id) AS \`cnt\` FROM User;`);
  });

  // ── countDistinct() ─────────────────────────────────────────────────────

  test("countDistinct(col)", () => {
    const sql =
// #region count-distinct
prisma.$from("User")
      .select(({ countDistinct }) => countDistinct("User.id"), "cnt")
      // #endregion count-distinct
.getSQL();

    expectSQL(sql, `SELECT COUNT(DISTINCT User.id) AS \`cnt\` FROM User;`);
  });

  // ── sum() ───────────────────────────────────────────────────────────────

  test("sum(col)", () => {
    const sql =
// #region sum
prisma.$from("User")
      .select(({ sum }) => sum("User.age"), "total")
      // #endregion sum
.getSQL();

    expectSQL(sql, `SELECT SUM(User.age) AS \`total\` FROM User;`);
  });

  // ── avg() ───────────────────────────────────────────────────────────────

  test("avg(col)", () => {
    const sql =
// #region avg
prisma.$from("User")
      .select(({ avg }) => avg("User.age"), "average")
      // #endregion avg
.getSQL();

    expectSQL(sql, `SELECT AVG(User.age) AS \`average\` FROM User;`);
  });

  // ── min() ───────────────────────────────────────────────────────────────

  test("min(col)", () => {
    const sql =
// #region min
prisma.$from("User")
      .select(({ min }) => min("User.age"), "youngest")
      // #endregion min
.getSQL();

    expectSQL(sql, `SELECT MIN(User.age) AS \`youngest\` FROM User;`);
  });

  // ── max() ───────────────────────────────────────────────────────────────

  test("max(col)", () => {
    const sql =
// #region max
prisma.$from("User")
      .select(({ max }) => max("User.age"), "oldest")
      // #endregion max
.getSQL();

    expectSQL(sql, `SELECT MAX(User.age) AS \`oldest\` FROM User;`);
  });

  // ── mixed: count + group ─────────────────────────────────────────────────

  test("countAll + groupBy", () => {
    const sql =
// #region count-groupby
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .groupBy(["User.name"])
      .select("User.name")
      .select(({ countAll }) => countAll(), "postCount")
      // #endregion count-groupby
.getSQL();

    // SQLite omits table prefix when unambiguous; MySQL/pg keep it
    assert.ok(sql.includes("COUNT(*)") && sql.includes("postCount") && sql.includes("GROUP BY"));
  });

});
