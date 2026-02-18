import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Generator dialect replacement", () => {
  test("should replace sqliteDialect with postgresqlDialect in generated extend.js", () => {
    // Read generated extend.js for PostgreSQL
    const extendPath = path.join(__dirname, "../../usage-pg-v7/generated/prisma-ts-select/extend.js");
    const content = fs.readFileSync(extendPath, "utf-8");

    // Should NOT contain sqliteDialect
    assert.strictEqual(content.includes("sqliteDialect"), false, "Generated extend.js should not contain sqliteDialect references");

    // Should contain postgresqlDialect
    assert.strictEqual(content.includes("postgresqlDialect"), true, "Generated extend.js should contain postgresqlDialect");
  });

  test("should replace sqliteDialect with mysqlDialect in generated extend.js", () => {
    const extendPath = path.join(__dirname, "../../usage-mysql-v7/generated/prisma-ts-select/extend.js");
    const content = fs.readFileSync(extendPath, "utf-8");

    assert.strictEqual(content.includes("sqliteDialect"), false, "MySQL extend.js should not contain sqliteDialect");
    assert.strictEqual(content.includes("mysqlDialect"), true, "MySQL extend.js should contain mysqlDialect");
  });

  test("should keep sqliteDialect for SQLite in generated extend.js", () => {
    const extendPath = path.join(__dirname, "../../usage-sqlite-v7/generated/prisma-ts-select/extend.js");
    const content = fs.readFileSync(extendPath, "utf-8");

    assert.strictEqual(content.includes("sqliteDialect"), true, "SQLite extend.js should contain sqliteDialect");
  });
});
