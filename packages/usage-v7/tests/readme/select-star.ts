import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { expectSQL } from "../test-utils.ts";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select *", () => {
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

    expectSQL(sql, expectedSQL);
  });

  test("should run and return data", async () => {
    // #region example
    const result = await prisma.$from("User")
      .select("*")
      // #endregion
.run();

    assert.deepEqual(result,  [
        {
          email: 'johndoe@example.com',
            id: 1,
            name: 'John Doe',
            age: 25
      },
      {
        email: 'smith@example.com',
            id: 2,
            name: 'John Smith',
          age: 30
      },
      {
        email: 'alice@example.com',
            id: 3,
            name: null,
          age: null
      }
    ]);

  });
});
