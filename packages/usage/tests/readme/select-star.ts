import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select *", () => {
  test("should generate correct SQL", () => {
    // #region example
    const sql = prisma.$from("User")
      .select("*")
      .getSQL();
    // #endregion

    assert.strictEqual(sql, "SELECT * FROM User;");
  });

  test("should run and return data", async () => {
    // #region example
    const result = await prisma.$from("User")
      .select("*")
      .run();
    // #endregion

    assert.deepEqual(result,  [
        {
          email: 'johndoe@example.com',
            id: 1,
            name: 'John Doe'
      },
      {
        email: 'smith@example.com',
            id: 2,
            name: 'John Smith'
      },
      {
        email: 'alice@example.com',
            id: 3,
            name: null
      }
    ]);

  });
});
