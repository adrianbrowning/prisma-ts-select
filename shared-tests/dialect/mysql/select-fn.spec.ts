import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Decimal } from "@prisma/client/runtime/client"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("MySQL dialect fns", () => {
    describe("groupConcat(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id", "User.name"])
                .select(({ groupConcat }) => groupConcat("User.name"), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")};`);
        });

        it("should run and return grouped names", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.every(r => typeof r.names === "string" || r.names === null));
        });
    });

    describe("groupConcat(col, sep)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id", "User.name"])
                .select(({ groupConcat }) => groupConcat("User.name", " | "), "names");
        }

        it("should match SQL with SEPARATOR", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")} SEPARATOR ' | ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")};`);
        });
    });

    describe("bitAnd(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ bitAnd }) => bitAnd("User.age"), "bits");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BIT_AND(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("bits", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("bitOr(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ bitOr }) => bitOr("User.age"), "bits");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT BIT_OR(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("bits", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("stddev(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ stddev }) => stddev("User.age"), "sd");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT STDDEV(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("sd", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("variance(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ variance }) => variance("User.age"), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT VARIANCE(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("stddevSamp(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ stddevSamp }) => stddevSamp("User.age"), "sd");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT STDDEV_SAMP(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("sd", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("varSamp(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ varSamp }) => varSamp("User.age"), "v");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT VAR_SAMP(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")};`);
        });
    });

    describe("jsonArrayAgg(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ jsonArrayAgg }) => jsonArrayAgg("User.name"), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_ARRAYAGG(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("jsonObjectAgg(key, val)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ jsonObjectAgg }) => jsonObjectAgg("User.id", "User.name"), "obj");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT JSON_OBJECTAGG(${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("obj", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("sum(col) — type", () => {
        it("type: Decimal", async () => {
            const result = await prisma.$from("User").select(({ sum }) => sum("User.age"), "total").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ total: Decimal }>>>);
        });
    });

    describe("avg(col) — type", () => {
        it("type: Decimal", async () => {
            const result = await prisma.$from("User").select(({ avg }) => avg("User.age"), "average").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ average: Decimal }>>>);
        });
    });

    describe("column type safety — numeric fns", () => {
        it("avg() rejects string col", () => {
            // @ts-expect-error title is string, not number
            prisma.$from("Post").select(({ avg }) => avg("title"), "a");
        });

        it("avg() rejects DateTime col", () => {
            // @ts-expect-error createdAt is DateTime, not number
            prisma.$from("Post").select(({ avg }) => avg("Post.createdAt"), "a");
        });

        it("avg() rejects SQLExpr<string> from lit", () => {
            // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<number>
            prisma.$from("User").select(({ avg, lit }) => avg(lit("x")), "a");
        });

        it("sum() rejects string col", () => {
            // @ts-expect-error title is string, not number
            prisma.$from("Post").select(({ sum }) => sum("title"), "s");
        });

        it("accepts number col in avg()", () => {
            prisma.$from("User").select(({ avg }) => avg("User.age"), "a");
        });
    });

    describe("column type safety — MySQL datetime fns", () => {
        it("dateAdd() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ dateAdd }) => dateAdd("title", 1, 'DAY'), "d");
        });

        it("dateFormat() rejects number col", () => {
            // @ts-expect-error User.age is number, not DateTime
            prisma.$from("User").select(({ dateFormat }) => dateFormat("User.age", '%Y'), "f");
        });

        it("dateDiff() rejects string lit as first arg", () => {
            // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<Date>
            prisma.$from("Post").select(({ dateDiff, lit }) => dateDiff(lit("x"), "Post.createdAt"), "d");
        });

        it("quarter() rejects string col", () => {
            // @ts-expect-error title is string, not DateTime
            prisma.$from("Post").select(({ quarter }) => quarter("title"), "q");
        });

        it("dayName() rejects number lit", () => {
            // @ts-expect-error lit(42) is SQLExpr<number>, not SQLExpr<Date>
            prisma.$from("Post").select(({ dayName, lit }) => dayName(lit(42)), "dn");
        });
    });

    describe("column type safety — MySQL string fns", () => {
        it("substring() rejects DateTime col", () => {
            // @ts-expect-error createdAt is DateTime, not string
            prisma.$from("Post").select(({ substring }) => substring("Post.createdAt", 1), "s");
        });

        it("left() rejects number col", () => {
            // @ts-expect-error User.age is number, not string
            prisma.$from("User").select(({ left }) => left("User.age", 3), "l");
        });

        it("reverse() rejects SQLExpr<number> from lit", () => {
            // @ts-expect-error lit(0) is SQLExpr<number>, not SQLExpr<string>
            prisma.$from("Post").select(({ reverse, lit }) => reverse(lit(0)), "r");
        });
    });
});
