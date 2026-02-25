import { describe, it } from "node:test";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// SQL assertions only — return types are dialect-specific.
// Type + value assertions live in dialect-specific test files.

describe("select() math fn context", () => {

    describe("abs(lit(-5))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").getSQL(),
                `SELECT ABS(-5) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("abs(col) — nullable column", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ abs }) => abs("User.age"), "v").getSQL();
            expectSQL(sql,
                `SELECT ABS(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("ceil(lit(4.2))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").getSQL(),
                `SELECT CEIL(4.2) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("floor(lit(4.8))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").getSQL(),
                `SELECT FLOOR(4.8) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("round(lit(4.567), 2)", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ round, lit }) => round(lit(4.567), 2), "v").getSQL(),
                `SELECT ROUND(4.567, 2) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("round(lit(4.5)) — no decimals", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ round, lit }) => round(lit(4.5)), "v").getSQL(),
                `SELECT ROUND(4.5) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("power(lit(2), 3)", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ power, lit }) => power(lit(2), 3), "v").getSQL(),
                `SELECT POWER(2, 3) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("sqrt(lit(16))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ sqrt, lit }) => sqrt(lit(16)), "v").getSQL(),
                `SELECT SQRT(16) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("mod(lit(10), 3)", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").getSQL(),
                `SELECT MOD(10, 3) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("sign(lit(-7))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").getSQL(),
                `SELECT SIGN(-7) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("exp(lit(0))", () => {
        it("should match SQL", () => {
            expectSQL(prisma.$from("User").select(({ exp, lit }) => exp(lit(0)), "v").getSQL(),
                `SELECT EXP(0) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("composition — sqrt(power(lit(3), lit(2)))", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ sqrt, power, lit }) => sqrt(power(lit(3), lit(2))), "v")
                .getSQL();
            expectSQL(sql,
                `SELECT SQRT(POWER(3, 2)) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("column type safety", () => {
        it("abs() rejects string col", () => {
            // @ts-expect-error User.name is string, not number
            prisma.$from("User").select(({ abs }) => abs("User.name"), "v");
        });

        it("abs() rejects SQLExpr<string> from lit", () => {
            // @ts-expect-error lit('x') is SQLExpr<string>, not SQLExpr<number>
            prisma.$from("User").select(({ abs, lit }) => abs(lit("x")), "v");
        });

        it("abs() accepts number col", () => {
            prisma.$from("User").select(({ abs }) => abs("User.age"), "v");
        });

        it("abs() accepts SQLExpr<number> from lit", () => {
            prisma.$from("User").select(({ abs, lit }) => abs(lit(5)), "v");
        });

        it("sqrt() rejects string col", () => {
            // @ts-expect-error User.email is string, not number
            prisma.$from("User").select(({ sqrt }) => sqrt("User.email"), "v");
        });

        it("ceil() accepts number col", () => {
            prisma.$from("User").select(({ ceil }) => ceil("User.age"), "v");
        });
    });

});
