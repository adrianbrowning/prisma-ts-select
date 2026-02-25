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

describe("SQLite datetime dialect fns", () => {

    describe("now() override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ now }) => now(), "ts");
        }

        it("should use datetime('now')", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT datetime('now') AS ${dialect.quote("ts", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: Date", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ ts: Date }>>>);
        });

        it("should return non-null result", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result[0]!.ts !== null && result[0]!.ts !== undefined);
        });
    });

    describe("curDate() override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ curDate }) => curDate(), "d");
        }

        it("should use date('now')", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT date('now') AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
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

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%Y', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ y: string }>>>);
        });

        it("should return correct years", async () => {
            const result = await createQuery().run();
            const years = result.map(r => r.y).sort((a, b) => a.localeCompare(b));
            assert.deepEqual(years, ["2020", "2020", "2021"]);
        });
    });

    describe("month(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ month }) => month("Post.createdAt"), "m");
        }

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%m', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("m", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ m: string }>>>);
        });

        it("should return correct months", async () => {
            const result = await createQuery().run();
            const months = result.map(r => r.m).sort((a, b) => a.localeCompare(b));
            assert.deepEqual(months, ["01", "06", "12"]);
        });
    });

    describe("day(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ day }) => day("Post.createdAt"), "d");
        }

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%d', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ d: string }>>>);
        });

        it("should return correct days", async () => {
            const result = await createQuery().run();
            const days = result.map(r => (r.d)).sort((a, b) => a.localeCompare(b));
            assert.deepEqual(days, ["15", "20", "25"]);
        });
    });

    describe("hour(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ hour }) => hour("Post.createdAt"), "h");
        }

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%H', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("h", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ h: string }>>>);
        });

        it("should return correct hours", async () => {
            const result = await createQuery().run();
            const hours = result.map(r => r.h).sort((a, b) => a.localeCompare(b));
            assert.deepEqual(hours, ["08", "10", "14"]);
        });
    });

    describe("minute(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ minute }) => minute("Post.createdAt"), "min");
        }

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%M', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("min", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ min: string }>>>);
        });
    });

    describe("second(col) override", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ second }) => second("Post.createdAt"), "sec");
        }

        it("should use strftime cast", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%S', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("sec", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ sec: string }>>>);
        });
    });

    describe("chaining: year(now())", () => {
        it("should accept SQLExpr<Date> as input", () => {
            const sql = prisma.$from("Post")
                .select(({ year, now }) => year(now()), "y")
                .getSQL();
            expectSQL(sql,
                `SELECT strftime('%Y', datetime('now')) AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("strftime(fmt, col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ strftime }) => strftime('%Y-%m', "Post.createdAt"), "ym");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT strftime('%Y-%m', ${dateExpr("Post.createdAt")}) AS ${dialect.quote("ym", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ ym: string }>>>);
        });

        it("should return year-month strings", async () => {
            const result = await createQuery().run();
            const ym = result.map(r => r.ym).sort();
            assert.deepEqual(ym, ['2020-01', '2020-06', '2021-12']);
        });
    });

    describe("julianday(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ julianday }) => julianday("Post.createdAt"), "jd");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT julianday(${dateExpr("Post.createdAt")}) AS ${dialect.quote("jd", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ jd: number }>>>);
        });

        it("should return positive julian day numbers", async () => {
            const result = await createQuery().run();
            assert.ok(result.every(r => typeof r.jd === 'number' && r.jd > 0));
        });
    });

    describe("date(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ date }) => date("Post.createdAt"), "d");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT date(${dateExpr("Post.createdAt")}) AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ d: string }>>>);
        });

        it("should return date strings", async () => {
            const result = await createQuery().run();
            const dates = result.map(r => r.d).sort();
            assert.deepEqual(dates, ['2020-01-15', '2020-06-20', '2021-12-25']);
        });
    });

    describe("datetime(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ datetime }) => datetime("Post.createdAt"), "dt");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT datetime(${dateExpr("Post.createdAt")}) AS ${dialect.quote("dt", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ dt: string }>>>);
        });

        it("should return datetime strings", async () => {
            const result = await createQuery().run();
            const dts = result.map(r => r.dt).sort();
            assert.deepEqual(dts, ['2020-01-15 10:30:00', '2020-06-20 14:45:00', '2021-12-25 08:00:00']);
        });
    });

    describe("column type safety", () => {
        it("year() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ year }) => year("title"), "y");
        });

        it("month() rejects number col", () => {
            // @ts-expect-error User.age is number, not DateTime
            prisma.$from("User").select(({ month }) => month("User.age"), "m");
        });

        it("strftime() rejects string lit", () => {
            // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<Date>
            prisma.$from("Post").select(({ strftime, lit }) => strftime('%Y', lit("x")), "s");
        });

        it("julianday() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ julianday }) => julianday("title"), "j");
        });

        it("date() rejects number lit", () => {
            // @ts-expect-error lit(42) is SQLExpr<number>, not SQLExpr<Date>
            prisma.$from("Post").select(({ date, lit }) => date(lit(42)), "d");
        });

        it("accepts DateTime col in year()", () => {
            prisma.$from("Post").select(({ year }) => year("Post.createdAt"), "y");
        });

        it("accepts now() in strftime()", () => {
            prisma.$from("Post").select(({ strftime, now }) => strftime('%Y-%m', now()), "s");
        });
    });

});
