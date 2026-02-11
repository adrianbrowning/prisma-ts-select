import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { expectSQL } from "../test-utils.ts";
import { prisma } from "../client.ts";

describe("README Example: .$from with table alias", () => {
  // Note: This example in README uses non-existent syntax
  // The actual API only supports inline syntax: prisma.$from("User u")
  // This test verifies the inline syntax works
  test("should create query with inline alias instead", () => {
    const query = prisma.$from("User u");

    const expectedSQL =
      // #region inline-alias-from-sql
      "FROM User AS `u`;";
      // #endregion inline-alias-from-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("should generate correct SQL with inline alias", () => {
    const sql = prisma.$from("User u")
      .select("name")
      .getSQL();

    const expectedSQL =
      // #region inline-alias-select-sql
      "SELECT name FROM User AS `u`;";
      // #endregion inline-alias-select-sql

    expectSQL(sql, expectedSQL);
  });
});
