import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';
// Note: assert/typeCheck/Equal/Expect used by random() tests below

// SQL assertions only — runtime value/type assertions are in sqlite-v7/select-fn-math.spec.ts
// because Prisma v6 bundles SQLite without the math extension (SQRT, EXP, CEIL, FLOOR, etc).

describe("SQLite math dialect fns", () => {

    describe("random()", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ random }) => random(), "v").getSQL();
            expectSQL(sql, `SELECT RANDOM() AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
        it("type: bigint", async () => {
            const result = await prisma.$from("User").select(({ random }) => random(), "v").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ v: bigint }>>>);
        });
        it("should return a bigint", async () => {
            const result = await prisma.$from("User").select(({ random }) => random(), "v").run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => typeof r.v === 'bigint'));
        });
    });

    describe("log(x) — natural log", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log, lit }) => log(lit(1)), "v").getSQL();
            expectSQL(sql, `SELECT LOG(1) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("log2(x)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log2, lit }) => log2(lit(8)), "v").getSQL();
            expectSQL(sql, `SELECT LOG2(8) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("log10(x)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User").select(({ log10, lit }) => log10(lit(100)), "v").getSQL();
            expectSQL(sql, `SELECT LOG10(100) AS ${dialect.quote("v", true)} FROM ${dialect.quote("User")};`);
        });
    });

});
