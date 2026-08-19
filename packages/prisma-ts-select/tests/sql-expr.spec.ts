import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sqlExpr, sqlDistinct, isDistinct, lit, resolveArg, DISTINCT_BRAND } from "../src/sql-expr.ts";

void describe("sqlExpr", () => {
  void test("creates object with sql property", () => {
    const expr = sqlExpr<number>("COUNT(*)");
    assert.equal(expr.sql, "COUNT(*)");
  });

  void test("toString returns sql", () => {
    const expr = sqlExpr<string>("'hello'");
    assert.equal(expr.toString(), "'hello'");
    assert.equal(`${expr}`, "'hello'");
  });
});

void describe("sqlDistinct", () => {
  void test("creates object with sql and DISTINCT_BRAND", () => {
    const expr = sqlDistinct<number>("DISTINCT id");
    assert.equal(expr.sql, "DISTINCT id");
    assert.equal(expr[DISTINCT_BRAND], true);
  });

  void test("toString returns sql", () => {
    const expr = sqlDistinct<number>("DISTINCT name");
    assert.equal(expr.toString(), "DISTINCT name");
  });
});

void describe("isDistinct", () => {
  void test("returns true for sqlDistinct values", () => {
    assert.equal(isDistinct(sqlDistinct<number>("x")), true);
  });

  void test("returns false for plain sqlExpr values", () => {
    assert.equal(isDistinct(sqlExpr<number>("x")), false);
  });

  void test("returns false for string values", () => {
    assert.equal(isDistinct("x"), false);
  });
});

void describe("lit", () => {
  void test("null produces NULL", () => {
    assert.equal(lit(null).sql, "NULL");
  });

  void test("true produces 1", () => {
    assert.equal(lit(true).sql, "1");
  });

  void test("false produces 0", () => {
    assert.equal(lit(false).sql, "0");
  });

  void test("number produces numeric literal", () => {
    assert.equal(lit(42).sql, "42");
    assert.equal(lit(3.14).sql, "3.14");
    assert.equal(lit(-1).sql, "-1");
  });

  void test("string produces escaped quoted string", () => {
    assert.equal(lit("hello").sql, "'hello'");
  });

  void test("string with single quotes escapes them", () => {
    assert.equal(lit("it's").sql, "'it''s'");
  });
});

void describe("resolveArg", () => {
  const quoteFn = (ref: string) => `\`${ref}\``;

  void test("SQLExpr returns .sql verbatim", () => {
    const expr = sqlExpr<number>("COUNT(*)");
    assert.equal(resolveArg(expr, quoteFn), "COUNT(*)");
  });

  void test("string calls quoteFn", () => {
    assert.equal(resolveArg("name", quoteFn), "`name`");
  });
});
