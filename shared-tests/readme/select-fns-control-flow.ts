import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("README Example: control flow select functions", () => {

  // ── coalesce() ──────────────────────────────────────────────────────────

  test("coalesce() — first non-null", () => {
    const sql =
// #region coalesce
prisma.$from("User")
      .select(({ coalesce, lit }) => coalesce("User.email", lit("unknown")), "contact")
      // #endregion coalesce
.getSQL();

    expectSQL(sql,
      `SELECT COALESCE(User.email, 'unknown') AS \`contact\` FROM User;`
    );
  });

  // ── nullif() ────────────────────────────────────────────────────────────

  test("nullif() — return null when equal", () => {
    const sql =
// #region nullif
prisma.$from("User")
      .select(({ nullif, lit }) => nullif(lit(0), lit(0)), "val")
      // #endregion nullif
.getSQL();

    expectSQL(sql, `SELECT NULLIF(0, 0) AS \`val\` FROM User;`);
  });

  // ── caseWhen() ──────────────────────────────────────────────────────────

  test("caseWhen() — with else", () => {
    const sql =
// #region case-when
prisma.$from("User")
      .select(({ caseWhen, lit }) => caseWhen([
        { when: { age: { op: ">=", value: 18 } }, then: lit("adult") },
      ], lit("minor")), "status")
      // #endregion case-when
.getSQL();

    assert.ok(sql.includes("CASE WHEN") && sql.includes("THEN 'adult'") && sql.includes("ELSE 'minor'"));
  });

  test("caseWhen() — multiple branches", () => {
    const sql =
// #region case-when-multi
prisma.$from("User")
      .select(({ caseWhen, lit }) => caseWhen([
        { when: { age: { op: "<", value: 18 } }, then: lit("minor") },
        { when: { age: { op: "<", value: 65 } }, then: lit("adult") },
      ], lit("senior")), "ageGroup")
      // #endregion case-when-multi
.getSQL();

    assert.ok(sql.includes("CASE WHEN") && sql.includes("ELSE 'senior'"));
  });

  // ── cond() ──────────────────────────────────────────────────────────────

  test("cond() — convert WhereCriteria to SQL condition", () => {
    // cond() is used with dialect-specific $if()/iif() as a condition bridge
    const sql =
// #region cond
prisma.$from("User")
      .select(({ cond }) => cond({ age: { op: ">", value: 0 } }), "flag")
      // #endregion cond
.getSQL();

    expectSQL(sql,
      `SELECT ${dialect.quoteQualifiedColumn("age")} > 0 AS ${dialect.quote("flag", true)} FROM ${dialect.quote("User")};`);
  });

});
