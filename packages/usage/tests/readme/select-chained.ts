import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select chained", () => {
  test("should generate correct SQL", () => {
    // #region example
    const sql = prisma.$from("User")
      .select("name")
      .select("email")
      .getSQL();
    // #endregion

    assert.strictEqual(sql, "SELECT name, email FROM User;");
  });

  test("should run and return selected columns", async () => {
    // #region example
    const result = await prisma.$from("User")
      .select("name")
      .select("email")
      .run();
    // #endregion

    assert.deepEqual(result, [
        {
          email: 'johndoe@example.com',
            name: 'John Doe'
      },
      {
        email: 'smith@example.com',
            name: 'John Smith'
      },
      {
        email: 'alice@example.com',
            name: null
      }
    ]);

  });
});
