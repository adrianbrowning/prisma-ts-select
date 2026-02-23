import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("PostgreSQL datetime dialect fns", () => {

    describe("now()", () => {
        it("should use NOW()", () => {
            const sql = prisma.$from("Post")
                .select(({ now }) => now(), "ts")
                .getSQL();
            expectSQL(sql, `SELECT NOW() AS ${dialect.quote("ts", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("curDate() override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ curDate }) => curDate(), "d");
        }

        it("should use CURRENT_DATE", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CURRENT_DATE AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: Date", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ d: Date }>>>);
        });

        it("should return non-null result", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result[0]!.d !== null && result[0]!.d !== undefined);
        });
    });

    describe("year(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ year }) => year("Post.createdAt"), "y");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(YEAR FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ y: number }>>>);
        });

        it("should return correct years", async () => {
            const result = await createQuery().run();
            const years = result.map(r => Number(r.y)).sort((a, b) => a - b);
            assert.deepEqual(years, [2020, 2020, 2021]);
        });
    });

    describe("month(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ month }) => month("Post.createdAt"), "m");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(MONTH FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("m", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ m: number }>>>);
        });

        it("should return correct months", async () => {
            const result = await createQuery().run();
            const months = result.map(r => Number(r.m)).sort((a, b) => a - b);
            assert.deepEqual(months, [1, 6, 12]);
        });
    });

    describe("day(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ day }) => day("Post.createdAt"), "d");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(DAY FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ d: number }>>>);
        });

        it("should return correct days", async () => {
            const result = await createQuery().run();
            const days = result.map(r => Number(r.d)).sort((a, b) => a - b);
            assert.deepEqual(days, [15, 20, 25]);
        });
    });

    describe("hour(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ hour }) => hour("Post.createdAt"), "h");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(HOUR FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("h", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ h: number }>>>);
        });

        it("should return correct hours", async () => {
            const result = await createQuery().run();
            const hours = result.map(r => Number(r.h)).sort((a, b) => a - b);
            assert.deepEqual(hours, [8, 10, 14]);
        });
    });

    describe("minute(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ minute }) => minute("Post.createdAt"), "min");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(MINUTE FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("min", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ min: number }>>>);
        });
    });

    describe("second(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ second }) => second("Post.createdAt"), "sec");
        }

        it("should use EXTRACT", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(SECOND FROM ${dialect.quoteQualifiedColumn("Post.createdAt")})::integer AS ${dialect.quote("sec", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ sec: number }>>>);
        });
    });

    describe("chaining: year(now())", () => {
        it("should accept SQLExpr<Date> as input", () => {
            const sql = prisma.$from("Post")
                .select(({ year, now }) => year(now()), "y")
                .getSQL();
            expectSQL(sql,
                `SELECT EXTRACT(YEAR FROM NOW())::integer AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("extract(field, col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ extract }) => extract('DOW', "Post.createdAt"), "dow");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT EXTRACT(DOW FROM ${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("dow", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ dow: number }>>>);
        });
    });

    describe("dateTrunc(unit, col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ dateTrunc }) => dateTrunc('month', "Post.createdAt"), "trunc");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT DATE_TRUNC('month', ${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("trunc", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: Date", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ trunc: Date }>>>);
        });
    });

    describe("age(ts1)", () => {
        it("should match SQL — single arg", () => {
            const sql = prisma.$from("Post")
                .select(({ age }) => age("Post.createdAt"), "a")
                .getSQL();
            expectSQL(sql,
                `SELECT AGE(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("a", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("age(ts1, ts2)", () => {
        it("should match SQL — two args", () => {
            const sql = prisma.$from("Post")
                .select(({ age, now }) => age("Post.createdAt", now()), "a")
                .getSQL();
            expectSQL(sql,
                `SELECT AGE(${dialect.quoteQualifiedColumn("Post.createdAt")}, NOW()) AS ${dialect.quote("a", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("toDate(text, fmt)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("Post")
                .select(({ toDate }) => toDate("Post.title", 'YYYY-MM-DD'), "parsed")
                .getSQL();
            expectSQL(sql,
                `SELECT TO_DATE(${dialect.quoteQualifiedColumn("Post.title")}, 'YYYY-MM-DD') AS ${dialect.quote("parsed", true)} FROM ${dialect.quote("Post")};`);
        });
    });

});
