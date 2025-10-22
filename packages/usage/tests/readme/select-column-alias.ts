import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select column alias", () => {
  test("basic alias - should generate correct SQL", () => {
    // #region basic
    const sql = prisma.$from("User")
      .select("User.name", "username")
      .getSQL();
    // #endregion basic

    assert.strictEqual(sql, "SELECT User.name AS `username` FROM User;");
  });

  test("basic alias - should return aliased column", async () => {
    // #region basic
    const result = await prisma.$from("User")
      .select("User.name", "username")
      .run();
    // #endregion basic

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
    // if (result.length > 0 && result[0]) {
    //   assert.ok("username" in result[0]);
    //   assert.strictEqual("name" in result[0], false);
    // }
  });

  test("multiple aliases - should generate correct SQL", () => {
    // #region multiple
    const sql = prisma.$from("User")
      .select("User.id", "userId")
      .select("User.email", "emailAddress")
      .getSQL();
    // #endregion multiple

    assert.strictEqual(
      sql,
      "SELECT User.id AS `userId`, User.email AS `emailAddress` FROM User;"
    );
  });

  test("mixed aliased and non-aliased", () => {
    // #region mixed
    const sql = prisma.$from("User")
      .select("User.id")
      .select("User.name", "username")
      .select("User.email")
      .getSQL();
    // #endregion mixed

    // Single table queries don't add table prefix
    assert.strictEqual(
      sql,
      "SELECT id, User.name AS `username`, email FROM User;"
    );
  });
});
