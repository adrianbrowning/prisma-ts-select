import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import { typeCheck } from "../../utils.ts";
import type { Equal, Expect } from "../../utils.ts";

describe("SQLite JSON scalar fns", () => {
  describe("jsonExtract(col, path)", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.name"), "result");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT json_extract(${dialect.quoteQualifiedColumn("Post.metadata")}, '$.name') AS ${dialect.quote("result", true)} FROM ${dialect.quote("Post")};`);
    });

    it("should run and return rows", async () => {
      const rows = await createQuery().run();
      assert.ok(Array.isArray(rows));
      // post id=1 has metadata.name seeded; verify extraction returns the actual value
      assert.ok(rows.some(r => r.result === "Blog Post 1"), "expected json_extract to return seeded name value");
      // posts 2 & 3 have null metadata — verify null is also returned
      assert.ok(rows.some(r => r.result === null), "expected json_extract to return null for null metadata");
    });
  });

  describe("jsonArray(...args)", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select(({ jsonArray }) => jsonArray("Post.id", "Post.title"), "arr");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT json_array(${dialect.quoteQualifiedColumn("Post.id")}, ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("arr", true)} FROM ${dialect.quote("Post")};`);
    });

    it("should run and return rows", async () => {
      const rows = await createQuery().run();
      assert.ok(Array.isArray(rows));
      assert.ok(rows.length > 0, "expected rows from Post table");
      // SQLite returns json_array() as a JSON string — parse it
      const raw = rows[0]?.arr;
      const arr: Array<unknown> = typeof raw === "string" ? JSON.parse(raw) : raw as Array<unknown>;
      assert.ok(Array.isArray(arr));
      assert.strictEqual(typeof arr[0], "number");
    });
  });

  describe("jsonObject(pairs)", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select(({ jsonObject }) => jsonObject([[ "id", "Post.id" ], [ "title", "Post.title" ]]), "obj");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT json_object('id', ${dialect.quoteQualifiedColumn("Post.id")}, 'title', ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("Post")};`);
    });

    it("should run and return rows", async () => {
      const rows = await createQuery().run();
      assert.ok(Array.isArray(rows));
      assert.ok(rows.length > 0, "expected rows from Post table");
      // SQLite returns json_object() as a JSON string — parse it
      const raw = rows[0]?.obj;
      const obj: Record<string, unknown> = typeof raw === "string" ? JSON.parse(raw) : raw as Record<string, unknown>;
      assert.deepStrictEqual(Object.keys(obj).sort((a, b) => a.localeCompare(b)), [ "id", "title" ]);
    });
  });

  describe("jsonExtract — array path $.tags[0]", () => {
    function createQuery() {
      return prisma.$from("Post")
        .select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.tags[0]"), "firstTag");
    }

    it("should run and return first tag for post with metadata", async () => {
      const rows = await createQuery().run();
      assert.ok(Array.isArray(rows));
      assert.ok(rows.length > 0, "expected rows from Post table");
      // Post id=1 has metadata.tags = ['prisma', 'ts'] — $.tags[0] = 'prisma'
      assert.ok(rows.some(r => r.firstTag === "prisma"), "expected $.tags[0] to return first tag");
      // Posts 2 & 3 have null metadata — expect null
      assert.ok(rows.some(r => r.firstTag === null), "expected null for posts with null metadata");
    });
  });

  // SQLite json_extract returns SQL values, not decoded JSON: objects/arrays as JSON text,
  // integers (and JSON booleans) as INTEGER → bigint, reals as number, JSON null / missing path as NULL.
  describe("jsonExtract — SQLite result types", () => {
    it("returns an array value as JSON text", async () => {
      const rows = await prisma.$from("Post")
        .where({ id: 1 })
        .select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.tags"), "tags")
        .run();
      typeCheck({} as Expect<Equal<typeof rows, Array<{ tags: string | number | bigint | null; }>>>);
      assert.deepStrictEqual(rows, [{ tags: "[\"prisma\",\"ts\"]" }]);
    });

    const doc = JSON.stringify({ obj: { k: 1 }, int: 7, real: 1.5, yes: true, no: false, nil: null });
    const cases: Array<[path: string, expected: string | number | bigint | null]> = [
      [ "$.obj", "{\"k\":1}" ],
      [ "$.int", 7n ],
      [ "$.real", 1.5 ],
      [ "$.yes", 1n ],
      [ "$.no", 0n ],
      [ "$.nil", null ],
      [ "$.missing", null ],
    ];
    for (const [ path, expected ] of cases) {
      it(`returns ${path} as ${typeof expected === "bigint" ? `${expected}n` : JSON.stringify(expected)}`, async () => {
        const rows = await prisma.$from("Post")
          .where({ id: 1 })
          .select(({ jsonExtract, lit }) => jsonExtract(lit(doc), path), "v")
          .run();
        assert.deepStrictEqual(rows, [{ v: expected }]);
      });
    }

    it("extracts from the JSON text of an inner jsonExtract", async () => {
      const rows = await prisma.$from("Post")
        .where({ id: 1 })
        .select(({ jsonExtract }) => jsonExtract(jsonExtract("Post.metadata", "$.tags"), "$[0]"), "firstTag")
        .run();
      assert.deepStrictEqual(rows, [{ firstTag: "prisma" }]);
    });
  });

  describe("jsonExtract — type safety", () => {
    it("rejects string col", () => {
      // @ts-expect-error title is string, not JSONValue
      prisma.$from("Post").select(({ jsonExtract }) => jsonExtract("Post.title", "$.x"), "r");
    });

    it("rejects number col", () => {
      // @ts-expect-error id is number, not JSONValue
      prisma.$from("Post").select(({ jsonExtract }) => jsonExtract("Post.id", "$.x"), "r");
    });

    it("rejects boolean col", () => {
      // @ts-expect-error published is boolean, not JSONValue
      prisma.$from("Post").select(({ jsonExtract }) => jsonExtract("Post.published", "$.x"), "r");
    });

    it("rejects Date col", () => {
      // @ts-expect-error createdAt is Date, not JSONValue
      prisma.$from("Post").select(({ jsonExtract }) => jsonExtract("Post.createdAt", "$.x"), "r");
    });

    it("accepts JSON col", () => {
      prisma.$from("Post").select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.x"), "r");
    });
  });

  describe("jsonArray / jsonObject — type design", () => {
    // jsonArray and jsonObject intentionally accept any ColName (no type constraint).
    // They are SQL constructors — the DB serialises the value at runtime.
    // Type-narrowing at call site is the caller's responsibility.
    it("jsonArray accepts any col type by design", () => {
      prisma.$from("Post").select(({ jsonArray }) => jsonArray("Post.id", "Post.title", "Post.published"), "arr");
    });
  });
});
