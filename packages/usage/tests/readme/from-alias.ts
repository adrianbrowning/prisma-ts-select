import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: .$from with table alias", () => {
  // Note: This example in README uses non-existent syntax
  // The actual API only supports inline syntax: prisma.$from("User u")
  // This test verifies the inline syntax works
  test("should create query with inline alias instead", () => {
    const query = prisma.$from("User u");

    assert.equal(query.getSQL(), "FROM User AS `u`;");
  });

  test("should generate correct SQL with inline alias", () => {
    const sql = prisma.$from("User u")
      .select("name")
      .getSQL();

    assert.strictEqual(sql, "SELECT name FROM User AS `u`;");
  });
});
