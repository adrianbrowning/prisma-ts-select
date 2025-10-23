import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .$from inline alias syntax", () => {
  test("should create query with inline alias", () => {
        const query = 
// #region example
prisma.$from("User u");
    // #endregion

    // Verify query can be chained
    const expectedSQL =
      // #region inline-alias-sql
      "FROM User AS `u`;";
      // #endregion inline-alias-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("should generate correct SQL with inline alias", () => {
        const sql = 
// #region example
prisma.$from("User u")
      .select("*")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region inline-alias-select-sql
      "SELECT * FROM User AS `u`;";
      // #endregion inline-alias-select-sql

    assert.strictEqual(sql, expectedSQL);
  });
});
