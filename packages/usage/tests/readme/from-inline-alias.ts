import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .$from inline alias syntax", () => {
  test("should create query with inline alias", () => {
    // #region example
    const query = prisma.$from("User u");
    // #endregion

    // Verify query can be chained
    assert.equal(query.getSQL(), "FROM User AS `u`;");
  });

  test("should generate correct SQL with inline alias", () => {
    // #region example
    const sql = prisma.$from("User u")
      .select("*")
      .getSQL();
    // #endregion

    assert.strictEqual(sql, "SELECT * FROM User AS `u`;");
  });
});
