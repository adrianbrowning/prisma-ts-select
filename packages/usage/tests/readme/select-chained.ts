import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { expectSQL } from "../test-utils.ts";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select chained", () => {
  test("should generate correct SQL", () => {
    const sql = 
// #region example
prisma.$from("User")
      .select("name")
      .select("email")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region example-sql
      "SELECT name, email FROM User;";
      // #endregion example-sql

    expectSQL(sql, expectedSQL);
  });

  test("should run and return selected columns", async () => {
    // #region example
    const result = await prisma.$from("User")
      .select("name")
      .select("email")
      // #endregion
.run();

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
