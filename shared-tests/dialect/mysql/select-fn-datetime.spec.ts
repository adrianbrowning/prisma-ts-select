import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("MySQL datetime dialect fns", () => {

    describe("now()", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ now }) => now(), "ts");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT NOW() AS ${dialect.quote("ts", true)} FROM ${dialect.quote("Post")};`);
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

    describe("curDate()", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ curDate }) => curDate(), "d");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CURDATE() AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
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

    describe("year(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ year }) => year("Post.createdAt"), "y");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT YEAR(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
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

    describe("month(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ month }) => month("Post.createdAt"), "m");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT MONTH(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("m", true)} FROM ${dialect.quote("Post")};`);
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

    describe("day(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ day }) => day("Post.createdAt"), "d");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT DAY(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("d", true)} FROM ${dialect.quote("Post")};`);
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

    describe("hour(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ hour }) => hour("Post.createdAt"), "h");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT HOUR(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("h", true)} FROM ${dialect.quote("Post")};`);
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

    describe("minute(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ minute }) => minute("Post.createdAt"), "min");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT MINUTE(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("min", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ min: number }>>>);
        });
    });

    describe("second(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ second }) => second("Post.createdAt"), "sec");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SECOND(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("sec", true)} FROM ${dialect.quote("Post")};`);
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
                `SELECT YEAR(NOW()) AS ${dialect.quote("y", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("dateAdd(col, n, unit)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ dateAdd }) => dateAdd("Post.createdAt", 1, 'YEAR'), "added");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT DATE_ADD(${dialect.quoteQualifiedColumn("Post.createdAt")}, INTERVAL 1 YEAR) AS ${dialect.quote("added", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: Date", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ added: Date }>>>);
        });
    });

    describe("dateSub(col, n, unit)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("Post")
                .select(({ dateSub }) => dateSub("Post.createdAt", 30, 'DAY'), "subbed")
                .getSQL();
            expectSQL(sql,
                `SELECT DATE_SUB(${dialect.quoteQualifiedColumn("Post.createdAt")}, INTERVAL 30 DAY) AS ${dialect.quote("subbed", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("dateFormat(col, fmt)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ dateFormat }) => dateFormat("Post.createdAt", '%Y-%m'), "fmt");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT DATE_FORMAT(${dialect.quoteQualifiedColumn("Post.createdAt")}, '%Y-%m') AS ${dialect.quote("fmt", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ fmt: string }>>>);
        });

        it("should format dates", async () => {
            const result = await createQuery().run();
            const fmts = result.map(r => r.fmt).sort();
            assert.deepEqual(fmts, ['2020-01', '2020-06', '2021-12']);
        });
    });

    describe("dateDiff(d1, d2)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("Post")
                .select(({ dateDiff, now }) => dateDiff(now(), "Post.createdAt"), "diff")
                .getSQL();
            expectSQL(sql,
                `SELECT DATEDIFF(NOW(), ${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("diff", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("quarter(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ quarter }) => quarter("Post.createdAt"), "q");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT QUARTER(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("q", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ q: number }>>>);
        });

        it("should return correct quarters", async () => {
            const result = await createQuery().run();
            const quarters = result.map(r => Number(r.q)).sort((a, b) => a - b);
            // Jan=Q1, Jun=Q2, Dec=Q4
            assert.deepEqual(quarters, [1, 2, 4]);
        });
    });

    describe("weekOfYear(col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("Post")
                .select(({ weekOfYear }) => weekOfYear("Post.createdAt"), "wk")
                .getSQL();
            expectSQL(sql,
                `SELECT WEEKOFYEAR(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("wk", true)} FROM ${dialect.quote("Post")};`);
        });
    });

    describe("dayName(col)", () => {
        function createQuery() {
            return prisma.$from("Post").select(({ dayName }) => dayName("Post.createdAt"), "dn");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT DAYNAME(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("dn", true)} FROM ${dialect.quote("Post")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ dn: string }>>>);
        });

        it("should return day names", async () => {
            const result = await createQuery().run();
            const names = result.map(r => r.dn).sort();
            // 2020-01-15 = Wednesday, 2020-06-20 = Saturday, 2021-12-25 = Saturday
            assert.deepEqual(names, ['Saturday', 'Saturday', 'Wednesday']);
        });
    });

    describe("lastDay(col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("Post")
                .select(({ lastDay }) => lastDay("Post.createdAt"), "ld")
                .getSQL();
            expectSQL(sql,
                `SELECT LAST_DAY(${dialect.quoteQualifiedColumn("Post.createdAt")}) AS ${dialect.quote("ld", true)} FROM ${dialect.quote("Post")};`);
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

        it("dateAdd() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ dateAdd }) => dateAdd("title", 1, 'DAY'), "d");
        });

        it("dateAdd() rejects number lit", () => {
            // @ts-expect-error lit(42) is SQLExpr<number>, not SQLExpr<Date>
            prisma.$from("Post").select(({ dateAdd, lit }) => dateAdd(lit(42), 1, 'DAY'), "d");
        });

        it("dateFormat() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ dateFormat }) => dateFormat("title", '%Y'), "f");
        });

        it("dateDiff() rejects string lit as second arg", () => {
            // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<Date>
            prisma.$from("Post").select(({ dateDiff, now, lit }) => dateDiff(now(), lit("x")), "d");
        });

        it("weekOfYear() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ weekOfYear }) => weekOfYear("title"), "w");
        });

        it("accepts DateTime col in dateAdd()", () => {
            prisma.$from("Post").select(({ dateAdd }) => dateAdd("Post.createdAt", 7, 'DAY'), "d");
        });

        it("accepts now() in dateFormat()", () => {
            prisma.$from("Post").select(({ dateFormat, now }) => dateFormat(now(), '%Y-%m-%d'), "f");
        });
    });

});
