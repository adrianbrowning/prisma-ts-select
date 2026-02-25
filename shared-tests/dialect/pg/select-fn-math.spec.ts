import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("PostgreSQL math dialect fns", () => {

    // ── Shared math fns (type+value assertions — PG always returns number) ──

    describe("abs(lit(-5))", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("abs(-5) = 5", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 5);
        });
    });

    // ceil/floor return types differ by Prisma version — see dialect/pg-v6/ and dialect/pg-v7/

    describe("ceil(lit(4.2))", () => {
        it("ceil(4.2) = 5", async () => {
            const result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 5);
        });
    });

    describe("floor(lit(4.8))", () => {
        it("floor(4.8) = 4", async () => {
            const result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 4);
        });
    });

    describe("round(lit(4.567), 2)", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ round, lit }) => round(lit(4.567), 2), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("round(4.567, 2) ≈ 4.57", async () => {
            const result = await prisma.$from("User").select(({ round, lit }) => round(lit(4.567), 2), "v").run();
            assert.ok(result.length > 0);
            assert.ok(Math.abs(result[0]!.v - 4.57) < 0.001);
        });
    });

    describe("power(lit(2), 3)", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ power, lit }) => power(lit(2), 3), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("power(2, 3) = 8", async () => {
            const result = await prisma.$from("User").select(({ power, lit }) => power(lit(2), 3), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 8);
        });
    });

    describe("sqrt(lit(16))", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ sqrt, lit }) => sqrt(lit(16)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("sqrt(16) = 4", async () => {
            const result = await prisma.$from("User").select(({ sqrt, lit }) => sqrt(lit(16)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 4);
        });
    });

    describe("mod(lit(10), 3)", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("mod(10, 3) = 1", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 1);
        });
    });

    describe("sign(lit(-7))", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("sign(-7) = -1", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, -1);
        });
    });

    describe("exp(lit(0))", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ exp, lit }) => exp(lit(0)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("exp(0) ≈ 1", async () => {
            const result = await prisma.$from("User").select(({ exp, lit }) => exp(lit(0)), "v").run();
            assert.ok(result.length > 0);
            assert.ok(Math.abs(result[0]!.v - 1) < 0.0001);
        });
    });

    // ── PostgreSQL-specific fns ───────────────────────────────────────────────

    describe("pi()", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ pi }) => pi(), "v").getSQL();
            expectSQL(sql, `SELECT PI() AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ pi }) => pi(), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("should return ~3.14159", async () => {
            const result = await prisma.$from("User").select(({ pi }) => pi(), "v").run();
            assert.ok(result.every(r => Math.abs(r.v - Math.PI) < 0.0001));
        });
    });

    describe("ln(x) — natural log", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ ln, lit }) => ln(lit(1)), "v").getSQL();
            expectSQL(sql, `SELECT LN(1) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ ln, lit }) => ln(lit(1)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("ln(1) = 0", async () => {
            const result = await prisma.$from("User").select(({ ln, lit }) => ln(lit(1)), "v").run();
            assert.ok(result.every(r => Math.abs(r.v) < 0.0001));
        });
    });

    describe("log(x) — log base 10", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log, lit }) => log(lit(100)), "v").getSQL();
            expectSQL(sql, `SELECT LOG(100) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("log(100) = 2", async () => {
            const result = await prisma.$from("User").select(({ log, lit }) => log(lit(100)), "v").run();
            assert.ok(result.every(r => Math.abs(r.v - 2) < 0.0001));
        });
    });

    describe("logBase(b, x)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ logBase, lit }) => logBase(2, lit(8)), "v").getSQL();
            expectSQL(sql, `SELECT LOG(2, 8) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("logBase(2, 8) = 3", async () => {
            const result = await prisma.$from("User").select(({ logBase, lit }) => logBase(2, lit(8)), "v").run();
            assert.ok(result.every(r => Math.abs((r.v) - 3) < 0.0001));
        });
    });

    describe("trunc(x)", () => {
        it("should match SQL without n", () => {
            const sql = prisma.$from("User").select(({ trunc, lit }) => trunc(lit(4.9)), "v").getSQL();
            expectSQL(sql, `SELECT TRUNC(4.9) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("should match SQL with n", () => {
            const sql = prisma.$from("User").select(({ trunc, lit }) => trunc(lit(4.567), 2), "v").getSQL();
            expectSQL(sql, `SELECT TRUNC(4.567, 2) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("trunc(4.9) = 4", async () => {
            const result = await prisma.$from("User").select(({ trunc, lit }) => trunc(lit(4.9)), "v").run();
            assert.ok(result.every(r => Number(r.v) === 4));
        });
    });

    describe("div(x, y) — integer division", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ div, lit }) => div(lit(10), 3), "v").getSQL();
            expectSQL(sql, `SELECT DIV(10, 3) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("div(10, 3) = 3", async () => {
            const result = await prisma.$from("User").select(({ div, lit }) => div(lit(10), 3), "v").run();
            assert.ok(result.every(r => Number(r.v) === 3));
        });
    });

    describe("random()", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ random }) => random(), "v").getSQL();
            expectSQL(sql, `SELECT RANDOM() AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ random }) => random(), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("should return between 0 and 1", async () => {
            const result = await prisma.$from("User").select(({ random }) => random(), "v").run();
            assert.ok(result.every(r => (r.v) >= 0 && (r.v) < 1));
        });
    });

});
