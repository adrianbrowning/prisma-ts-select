import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { prisma } from "#client";
import { expectSQL } from "../test-utils.ts";

describe("README Example: select chained", () => {
  test("should generate correct SQL", () => {
    const $sql =
    // #region example
      prisma.$from("User")
        .select("name")
        .select("email");
      // #endregion
    const sql = $sql.getSQL();

    const expectedSQL =
      // #region example-sql
      "SELECT name, email FROM User;";
      // #endregion example-sql

    expectSQL(sql, expectedSQL);
  });

  test("should run and return selected columns", async () => {
    // #region example-run
    const result = await prisma.$from("User")
      .select("name")
      .select("email")
      // #endregion
      .run();

    assert.deepEqual(result, [
      {
        email: "johndoe@example.com",
        name: "John Doe",
      },
      {
        email: "smith@example.com",
        name: "John Smith",
      },
      {
        email: "alice@example.com",
        name: null,
      },
    ]);

  });
});
