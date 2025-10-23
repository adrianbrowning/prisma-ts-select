import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select column alias", () => {
  test("basic alias - should generate correct SQL", () => {
    const sql = 
// #region basic
prisma.$from("User")
      .select("User.name", "username")
      // #endregion
.getSQL(); basic

    const expectedSQL =
      // #region basic-sql
      "SELECT User.name AS `username` FROM User;";
      // #endregion basic-sql

    assert.strictEqual(sql, expectedSQL);
  });

  test("basic alias - should return aliased column", async () => {
    // #region basic
    const result = await prisma.$from("User")
      .select("User.name", "username")
      // #endregion
.run(); basic

    assert.deepEqual(result,[
        {
          username: 'John Doe'
      },
      {
        username: 'John Smith'
      },
      {
        username: null
      }
    ]);

  });

  test("multiple aliases - should generate correct SQL", () => {
    const sql = 
// #region multiple
prisma.$from("User")
      .select("User.id", "userId")
      .select("User.email", "emailAddress")
      // #endregion
.getSQL(); multiple

    const expectedSQL =
      // #region multiple-sql
      "SELECT User.id AS `userId`, User.email AS `emailAddress` FROM User;";
      // #endregion multiple-sql

    assert.strictEqual(sql, expectedSQL);
  });

  test("mixed aliased and non-aliased", () => {
    const sql = 
// #region mixed
prisma.$from("User")
      .select("User.id")
      .select("User.name", "username")
      .select("User.email")
      // #endregion
.getSQL(); mixed

    const expectedSQL =
      // #region mixed-sql
      "SELECT id, User.name AS `username`, email FROM User;";
      // #endregion mixed-sql

    // Single table queries don't add table prefix
    assert.strictEqual(sql, expectedSQL);
  });
});
