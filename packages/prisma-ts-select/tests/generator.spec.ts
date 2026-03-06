import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Generator package.json output", () => {
  function readPkgJson(pkg: string) {
    return JSON.parse(
      fs.readFileSync(
        path.join(__dirname, `../../${pkg}/generated/prisma-ts-select/package.json`),
        "utf-8"
      )
    );
  }

  test("exists", () => {
    const p = path.join(__dirname, "../../usage-sqlite-v7/generated/prisma-ts-select/package.json");
    assert.ok(fs.existsSync(p));
  });

  test("name format", () => {
    const pkg = readPkgJson("usage-sqlite-v7");
    assert.match(pkg.name, /^prisma-ts-select-[a-f0-9]{8}$/);
  });

  test("name stable", () => {
    const outputPath = path.resolve(path.join(__dirname, "../../usage-sqlite-v7/generated/prisma-ts-select"));
    const expected = "prisma-ts-select-" + createHash("sha256").update(outputPath).digest("hex").slice(0, 8);
    assert.strictEqual(readPkgJson("usage-sqlite-v7").name, expected);
  });

  test("version", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").version, "0.0.0");
  });

  test("type", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").type, "module");
  });

  test("sideEffects", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").sideEffects, false);
  });

  test("exports keys", () => {
    const { exports } = readPkgJson("usage-sqlite-v7");
    assert.deepEqual(Object.keys(exports), [".", "./extend-v6", "./extend-v7", "./dialects", "./dialects/*"]);
  });

  test("exports shape", () => {
    const { exports } = readPkgJson("usage-sqlite-v7");
    for (const entry of Object.values(exports) as Array<{ types: string; import: string }>) {
      assert.strictEqual(typeof entry.types, "string");
      assert.strictEqual(typeof entry.import, "string");
    }
  });

  test("packageName override", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v6").name, "test-pkg-override");
  });
});

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
