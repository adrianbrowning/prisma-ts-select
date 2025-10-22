import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .$from basic", () => {
  test("should create basic from query", () => {
    // #region example
    const query = prisma.$from("User");
    // #endregion

    // Verify query can be chained
    assert.equal(query.getSQL(), "FROM User;");
  });

  test("should generate correct SQL", () => {
    // #region example
    const sql = prisma.$from("User")
      .select("*")
      .getSQL();
    // #endregion

    assert.strictEqual(sql, "SELECT * FROM User;");
  });
});
