import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("PostgreSQL JSON scalar fns", () => {
    describe("jsonExtract(col, path)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.name"), "result");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT jsonb_path_query_first(${dialect.quoteQualifiedColumn("Post.metadata")}, '$.name') AS ${dialect.quote("result", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            // post id=1 has metadata.name seeded; verify extraction returns the actual value
            assert.ok(rows.some(r => r.result === 'Blog Post 1'), 'expected jsonb_path_query_first to return seeded name value');
            // posts 2 & 3 have null metadata — verify null is also returned
            assert.ok(rows.some(r => r.result === null), 'expected jsonb_path_query_first to return null for null metadata');
        });
    });

    describe("jsonArray(...args)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonArray }) => jsonArray("Post.id", "Post.title"), "arr");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT jsonb_build_array(${dialect.quoteQualifiedColumn("Post.id")}, ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("arr", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            assert.ok(rows.length > 0, 'expected rows from Post table');
            // PG driver may return JSONB as string or parsed object — handle both
            const raw = rows[0]?.arr;
            const arr: unknown[] = typeof raw === 'string' ? JSON.parse(raw) : raw as unknown[];
            assert.ok(Array.isArray(arr));
            assert.strictEqual(typeof arr[0], 'number');
        });
    });

    describe("jsonObject(pairs)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonObject }) => jsonObject([["id", "Post.id"], ["title", "Post.title"]]), "obj");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT jsonb_build_object('id', ${dialect.quoteQualifiedColumn("Post.id")}, 'title', ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            assert.ok(rows.length > 0, 'expected rows from Post table');
            assert.deepStrictEqual(Object.keys(rows[0]?.obj ?? {}).sort(), ['id', 'title']);
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
            assert.ok(rows.length > 0, 'expected rows from Post table');
            // Post id=1 has metadata.tags = ['prisma', 'ts'] — $.tags[0] = 'prisma'
            // PG JSONPath $.tags[0] returns the first element
            assert.ok(rows.some(r => r.firstTag === 'prisma'), 'expected $.tags[0] to return first tag');
            // Posts 2 & 3 have null metadata — expect null
            assert.ok(rows.some(r => r.firstTag === null), 'expected null for posts with null metadata');
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
