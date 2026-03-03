import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// Prisma v6 stores DateTime as integer ms, v7 as ISO text — the dialect normalises both.
const dateExpr = (col: string) => {
    const q = dialect.quoteQualifiedColumn(col);
    return `CASE WHEN typeof(${q}) = 'integer' THEN datetime(${q}/1000, 'unixepoch') ELSE ${q} END`;
};

describe("SQLite cast() fn", () => {

    describe("cast(year(col), 'INTEGER') — motivating use case", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ cast, year }) => cast(year("Post.createdAt"), "INTEGER"), "y");
        }

        it("should emit CAST(... AS INTEGER)", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CAST(strftime('%Y', ${dateExpr("Post.createdAt")}) AS INTEGER) AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ y: number }>>>);
        });

        it("returns numeric year values", async () => {
            const result = await createQuery().run();
            const years = result.map(r => r.y).sort((a, b) => a - b);
            assert.deepEqual(years, [2020, 2020, 2021]);
        });
    });

    describe("cast(col, 'TEXT')", () => {
        function createQuery() {
            return prisma.$from("User").select(({ cast }) => cast("User.id", "TEXT"), "a");
        }

        it("should emit CAST(... AS TEXT)", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS TEXT) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ a: string }>>>);
        });

        it("returns string values", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => r.a).sort(), ["1", "2", "3"]);
        });
    });

    describe("cast(col, 'REAL')", () => {
        function createQuery() {
            return prisma.$from("User").select(({ cast }) => cast("User.id", "REAL"), "a");
        }

        it("should emit CAST(... AS REAL)", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CAST(${dialect.quoteQualifiedColumn("User.id")} AS REAL) AS ${dialect.quote("a", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ a: number }>>>);
        });

        it("returns float values", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => r.a).sort((a, b) => a - b), [1.0, 2.0, 3.0]);
        });
    });

    describe("type safety", () => {
        it("rejects unknown cast type", () => {
            // @ts-expect-error NOPE is not a valid SQLite cast type — TS-only check; runtime guard also throws
            try { prisma.$from("User").select(({ cast }) => cast("User.age", "NOPE"), "a"); } catch {}
        });

        it("throws on invalid cast type", () => {
            assert.throws(
                () => prisma.$from("Post").select(({ cast }) => cast("Post.id", "INJECTED;DROP TABLE--" as any), "x"),
                /invalid cast type/i
            );
        });

        it("accepts DateTime col in cast()", () => {
            prisma.$from("Post").select(({ cast }) => cast("Post.createdAt", "TEXT"), "t");
        });

        it("accepts SQLExpr from year() in cast()", () => {
            prisma.$from("Post").select(({ cast, year }) => cast(year("Post.createdAt"), "INTEGER"), "y");
        });
    });

});
