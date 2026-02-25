import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("MySQL math dialect fns", () => {

    describe("abs(lit(-5))", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });
        it("abs(-5) = 5", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 5n);
        });
    });

    describe("ceil(lit(4.2))", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });
        it("ceil(4.2) = 5", async () => {
            const result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 5n);
        });
    });

    describe("floor(lit(4.8))", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });
        it("floor(4.8) = 4", async () => {
            const result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 4n);
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
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });
        it("mod(10, 3) = 1", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 1n);
        });
    });

    describe("sign(lit(-7))", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });
        it("sign(-7) = -1", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, -1n);
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

    // ── MySQL-specific fns ────────────────────────────────────────────────────

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
            assert.ok(result.every(r => Math.abs((r.v) - Math.PI) < 0.0001));
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
            assert.ok(result.every(r => Math.abs((r.v)) < 0.0001));
        });
    });

    describe("log(x) — natural log (MySQL)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log, lit }) => log(lit(1)), "v").getSQL();
            expectSQL(sql, `SELECT LOG(1) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("log(1) = 0", async () => {
            const result = await prisma.$from("User").select(({ log, lit }) => log(lit(1)), "v").run();
            assert.ok(result.every(r => Math.abs((r.v)) < 0.0001));
        });
    });

    describe("log2(x)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log2, lit }) => log2(lit(8)), "v").getSQL();
            expectSQL(sql, `SELECT LOG2(8) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("log2(8) = 3", async () => {
            const result = await prisma.$from("User").select(({ log2, lit }) => log2(lit(8)), "v").run();
            assert.ok(result.every(r => Math.abs((r.v) - 3) < 0.0001));
        });
    });

    describe("log10(x)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log10, lit }) => log10(lit(100)), "v").getSQL();
            expectSQL(sql, `SELECT LOG10(100) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("log10(100) = 2", async () => {
            const result = await prisma.$from("User").select(({ log10, lit }) => log10(lit(100)), "v").run();
            assert.ok(result.every(r => Math.abs((r.v) - 2) < 0.0001));
        });
    });

    describe("truncate(x, n)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ truncate, lit }) => truncate(lit(4.567), 2), "v").getSQL();
            expectSQL(sql, `SELECT TRUNCATE(4.567, 2) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ truncate, lit }) => truncate(lit(4.567), 2), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("truncate(4.567, 2) = 4.56", async () => {
            const result = await prisma.$from("User").select(({ truncate, lit }) => truncate(lit(4.567), 2), "v").run();
            assert.ok(result.every(r => Math.abs((r.v) - 4.56) < 0.001));
        });
    });

    describe("rand()", () => {
        it("should match SQL (no seed)", () => {
            const sql = prisma.$from("User").select(({ rand }) => rand(), "v").getSQL();
            expectSQL(sql, `SELECT RAND() AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("should match SQL (with seed)", () => {
            const sql = prisma.$from("User").select(({ rand }) => rand(42), "v").getSQL();
            expectSQL(sql, `SELECT RAND(42) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ rand }) => rand(), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });
        it("should return between 0 and 1", async () => {
            const result = await prisma.$from("User").select(({ rand }) => rand(), "v").run();
            assert.ok(result.every(r => (r.v) >= 0 && (r.v) < 1));
        });
    });

});
