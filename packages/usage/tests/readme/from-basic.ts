import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .$from basic", () => {
  test("should create basic from query", () => {
            const query = 
// #region example
prisma.$from("User");
    // #endregion

    // Verify query can be chained
    const expectedSQL =
      // #region example-from
      "FROM User;";
      // #endregion example-from

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("should generate correct SQL", () => {
    const sql = 
// #region example
prisma.$from("User")
      .select("*")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region example-sql
      "SELECT * FROM User;";
      // #endregion example-sql

    assert.strictEqual(sql, expectedSQL);
  });
});
