/**
 * SQLite Prisma v7 — math extension runtime tests.
 * Prisma v7 uses libsql which includes the SQLite math extension
 * (SQRT, EXP, CEIL, FLOOR, POWER, MOD, LOG, etc).
 * Prisma v6 bundles SQLite without this extension — these tests are v7-only.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { prisma } from '#client'

describe("SQLite v7 math fns — runtime (math extension required)", () => {

    describe("abs(lit(-5)) — integer input", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("abs(-5) = 5", async () => {
            const result = await prisma.$from("User").select(({ abs, lit }) => abs(lit(-5)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 5);
        });
    });

    describe("ceil(lit(4.2)) — float input", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("ceil(4.2) = 5", async () => {
            const result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 5);
        });
    });

    describe("floor(lit(4.8)) — float input", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("floor(4.8) = 4", async () => {
            const result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 4);
        });
    });

    describe("round(lit(4.567), 2)", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ round, lit }) => round(lit(4.567), 2), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("round(4.567, 2) = 4.57", async () => {
            const result = await prisma.$from("User").select(({ round, lit }) => round(lit(4.567), 2), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 4.57);
        });
    });

    describe("power(lit(2), 3) — always REAL", () => {
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

    describe("sqrt(lit(16)) — always REAL", () => {
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

    describe("mod(lit(10), 3) — integer input", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("mod(10, 3) = 1", async () => {
            const result = await prisma.$from("User").select(({ mod, lit }) => mod(lit(10), 3), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), 1);
        });
    });

    describe("sign(lit(-7)) — integer input", () => {
        it("type: bigint | number", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint | number }>>>);
        });

        it("sign(-7) = -1", async () => {
            const result = await prisma.$from("User").select(({ sign, lit }) => sign(lit(-7)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(Number(result[0]!.v), -1);
        });
    });

    describe("exp(lit(0)) — always REAL", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ exp, lit }) => exp(lit(0)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });

        it("exp(0) = 1", async () => {
            const result = await prisma.$from("User").select(({ exp, lit }) => exp(lit(0)), "v").run();
            assert.ok(result.length > 0);
            assert.equal(result[0]!.v, 1);
        });
    });

    describe("log(x) — natural log", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ log, lit }) => log(lit(1)), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: number }>>>);
        });

        it("log(1) = 0", async () => {
            const result = await prisma.$from("User").select(({ log, lit }) => log(lit(1)), "v").run();
            assert.ok(result.every(r => Math.abs(Number(r.v)) < 0.0001));
        });
    });

    describe("log2(x)", () => {
        it("log2(8) = 3", async () => {
            const result = await prisma.$from("User").select(({ log2, lit }) => log2(lit(8)), "v").run();
            assert.ok(result.every(r => Math.abs(Number(r.v) - 3) < 0.0001));
        });
    });

    describe("log10(x)", () => {
        it("log10(100) = 2", async () => {
            const result = await prisma.$from("User").select(({ log10, lit }) => log10(lit(100)), "v").run();
            assert.ok(result.every(r => Math.abs(Number(r.v) - 2) < 0.0001));
        });
    });

});
