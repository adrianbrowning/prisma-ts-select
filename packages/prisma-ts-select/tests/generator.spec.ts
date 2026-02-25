import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Generator dialect replacement", () => {
  function readDialectsIndex(pkg: string) {
    return fs.readFileSync(
      path.join(__dirname, `../../${pkg}/generated/prisma-ts-select/dialects/index.js`),
      "utf-8"
    );
  }

  test("should export postgresqlDialect for PostgreSQL", () => {
    const content = readDialectsIndex("usage-pg-v7");
    assert.strictEqual(content.includes("sqliteDialect"), false, "PG dialects/index.js should not export sqliteDialect");
    assert.strictEqual(content.includes("postgresqlDialect"), true, "PG dialects/index.js should export postgresqlDialect");
  });

  test("should export mysqlDialect for MySQL", () => {
    const content = readDialectsIndex("usage-mysql-v7");
    assert.strictEqual(content.includes("sqliteDialect"), false, "MySQL dialects/index.js should not export sqliteDialect");
    assert.strictEqual(content.includes("mysqlDialect"), true, "MySQL dialects/index.js should export mysqlDialect");
  });

  test("should export sqliteDialect for SQLite", () => {
    const content = readDialectsIndex("usage-sqlite-v7");
    assert.strictEqual(content.includes("sqliteDialect"), true, "SQLite dialects/index.js should export sqliteDialect");
  });
});
