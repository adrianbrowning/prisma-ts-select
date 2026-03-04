import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("MySQL JSON scalar fns", () => {
    describe("jsonExtract(col, path)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonExtract }) => jsonExtract("Post.metadata", "$.name"), "result");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_EXTRACT(${dialect.quoteQualifiedColumn("Post.metadata")}, '$.name') AS ${dialect.quote("result", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            // metadata is null in seed data; JSON_EXTRACT returns null for null input
            assert.strictEqual(rows[0]?.result, null);
        });
    });

    describe("jsonArray(...args)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonArray }) => jsonArray("Post.id", "Post.title"), "arr");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_ARRAY(${dialect.quoteQualifiedColumn("Post.id")}, ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("arr", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            // MySQL returns JSON array as a parsed JS array via Prisma's json deserialization
            assert.ok(Array.isArray(rows[0]?.arr));
            assert.strictEqual(typeof rows[0]?.arr[0], 'number');
        });
    });

    describe("jsonObject(pairs)", () => {
        function createQuery() {
            return prisma.$from("Post")
                .select(({ jsonObject }) => jsonObject([["id", "Post.id"], ["title", "Post.title"]]), "obj");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_OBJECT('id', ${dialect.quoteQualifiedColumn("Post.id")}, 'title', ${dialect.quoteQualifiedColumn("Post.title")}) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("Post")};`);
        });

        it("should run and return rows", async () => {
            const rows = await createQuery().run();
            assert.ok(Array.isArray(rows));
            assert.deepStrictEqual(Object.keys(rows[0]?.obj ?? {}).sort(), ['id', 'title']);
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
