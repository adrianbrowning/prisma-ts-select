import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { generateM2MMapDeclaration } from "../src/utils/m2m-map.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

void describe("Generator package.json output", () => {
  function readPkgJson(pkg: string) {
    return JSON.parse(
      fs.readFileSync(
        path.join(__dirname, `../../${pkg}/generated/prisma-ts-select/package.json`),
        "utf-8"
      )
    );
  }

  void test("exists", () => {
    const p = path.join(__dirname, "../../usage-sqlite-v7/generated/prisma-ts-select/package.json");
    assert.ok(fs.existsSync(p));
  });

  void test("name format", () => {
    const pkg = readPkgJson("usage-sqlite-v7");
    assert.match(pkg.name, /^prisma-ts-select-[a-f0-9]{8}$/);
  });

  void test("name stable", () => {
    const outputPath = path.resolve(path.join(__dirname, "../../usage-sqlite-v7/generated/prisma-ts-select"));
    const expected = "prisma-ts-select-" + createHash("sha256").update(outputPath)
      .digest("hex")
      .slice(0, 8);
    assert.strictEqual(readPkgJson("usage-sqlite-v7").name, expected);
  });

  void test("version", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").version, "0.0.0");
  });

  void test("type", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").type, "module");
  });

  void test("sideEffects", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v7").sideEffects, false);
  });

  void test("exports keys", () => {
    const { exports } = readPkgJson("usage-sqlite-v7");
    assert.deepEqual(Object.keys(exports), [ ".", "./db", "./extend-v6", "./extend-v7", "./dialects", "./dialects/*" ]);
  });

  void test("exports shape", () => {
    const { exports } = readPkgJson("usage-sqlite-v7");
    for (const entry of Object.values(exports)) {
      assert.strictEqual(typeof entry.types, "string");
      assert.strictEqual(typeof entry.import, "string");
    }
  });

  void test("packageName override", () => {
    assert.strictEqual(readPkgJson("usage-sqlite-v6").name, "test-pkg-override");
  });
});

void describe("Generator dialect replacement", () => {
  function readDialectsIndex(pkg: string) {
    return fs.readFileSync(
      path.join(__dirname, `../../${pkg}/generated/prisma-ts-select/dialects/index.js`),
      "utf-8"
    );
  }

  void test("should export postgresqlDialect for PostgreSQL", () => {
    const content = readDialectsIndex("usage-pg-v7");
    assert.strictEqual(content.includes("sqliteDialect"), false, "PG dialects/index.js should not export sqliteDialect");
    assert.strictEqual(content.includes("postgresqlDialect"), true, "PG dialects/index.js should export postgresqlDialect");
  });

  void test("should export mysqlDialect for MySQL", () => {
    const content = readDialectsIndex("usage-mysql-v7");
    assert.strictEqual(content.includes("sqliteDialect"), false, "MySQL dialects/index.js should not export sqliteDialect");
    assert.strictEqual(content.includes("mysqlDialect"), true, "MySQL dialects/index.js should export mysqlDialect");
  });

  void test("should export sqliteDialect for SQLite", () => {
    const content = readDialectsIndex("usage-sqlite-v7");
    assert.strictEqual(content.includes("sqliteDialect"), true, "SQLite dialects/index.js should export sqliteDialect");
  });
});

void describe("Generator M2MMap output", () => {
  function readExtendDts(pkg: string) {
    return fs.readFileSync(
      path.join(__dirname, `../../${pkg}/generated/prisma-ts-select/extend.d.ts`),
      "utf-8"
    );
  }

  // Use sqlite-v7 (no versioned models) as canonical test target
  const PKG = "usage-sqlite-v7";

  void test("M2MMap type is present in generated extend.d.ts", () => {
    const dts = readExtendDts(PKG);
    assert.ok(dts.includes("type M2MMap"), "extend.d.ts must contain 'type M2MMap'");
  });

  void test("M2MBug_Post maps to M2MBug_CatA (single junction)", () => {
    const dts = readExtendDts(PKG);
    assert.ok(
      dts.includes("\"M2MBug_CatA\": \"_M2MBug_CatAToM2MBug_Post\""),
      "M2MBug_Post → M2MBug_CatA junction must be in M2MMap"
    );
  });

  void test("M2MBug_Post maps to M2MBug_CatB (second junction, different target)", () => {
    const dts = readExtendDts(PKG);
    assert.ok(
      dts.includes("\"M2MBug_CatB\": \"_M2MBug_CatBToM2MBug_Post\""),
      "M2MBug_Post → M2MBug_CatB junction must be in M2MMap"
    );
  });

  void test("reciprocal: M2MBug_CatA maps back to M2MBug_Post", () => {
    const dts = readExtendDts(PKG);
    // Find the M2MBug_CatA *source* block (starts with `"M2MBug_CatA": {`)
    const m2mMapIdx = dts.indexOf("type M2MMap");
    const sourcePattern = "\"M2MBug_CatA\": {";
    const catASection = dts.indexOf(sourcePattern, m2mMapIdx);
    assert.ok(catASection !== -1, "M2MBug_CatA source block must exist in M2MMap");
    const blockEnd = dts.indexOf("};", catASection);
    const snippet = dts.slice(catASection, blockEnd + 2);
    assert.ok(
      snippet.includes("\"M2MBug_Post\": \"_M2MBug_CatAToM2MBug_Post\""),
      "M2MBug_CatA must have reciprocal M2MBug_Post entry"
    );
  });

  void test("ambiguous M2M: MMM_Post → MMM_Category is a union of junction tables", () => {
    const dts = readExtendDts(PKG);
    // Both _M2M_NC_M1 and _M2M_NC_M2 must appear as a union for MMM_Category
    assert.ok(
      dts.includes("\"_M2M_NC_M1\" | \"_M2M_NC_M2\"") || dts.includes("\"_M2M_NC_M2\" | \"_M2M_NC_M1\""),
      "Ambiguous MMM_Post → MMM_Category should produce a union of junction tables in M2MMap"
    );
  });

  void test("simple M2M: M2M_Post → M2M_Category", () => {
    const dts = readExtendDts(PKG);
    assert.ok(
      dts.includes("\"M2M_Category\": \"_M2M_CategoryToM2M_Post\""),
      "M2M_Post → M2M_Category junction must be in M2MMap"
    );
  });
});

void describe("generateM2MMapDeclaration unit tests", () => {
  void test("empty map produces type M2MMap = {}", () => {
    assert.strictEqual(generateM2MMapDeclaration({}), "type M2MMap = {};");
  });

  void test("single source+target produces correct literal", () => {
    const result = generateM2MMapDeclaration({ Post: { CatA: new Set([ "_CatAToPost" ]) } });
    assert.strictEqual(
      result,
      "type M2MMap = {\n  readonly \"Post\": {\n    readonly \"CatA\": \"_CatAToPost\";\n  };\n};"
    );
  });

  void test("multiple junctions produce union literal", () => {
    const result = generateM2MMapDeclaration({ Post: { Cat: new Set([ "_M1", "_M2" ]) } });
    assert.ok(
      result.includes("\"_M1\" | \"_M2\"") || result.includes("\"_M2\" | \"_M1\""),
      "multiple junctions must produce a union"
    );
  });
});
