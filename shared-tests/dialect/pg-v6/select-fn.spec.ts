/**
 * PostgreSQL Prisma v6 — runtime type deviations from v7.
 * node-postgres in Prisma v6 returns bigint for SQL INTEGER results (COUNT*).
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { prisma } from '#client'

describe("PostgreSQL v6 dialect — count return types", () => {
    describe("countAll()", () => {
        it("type: bigint", async () => {
            const result = await prisma.$from("User").select(({ countAll }) => countAll(), "n").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ n: bigint }>>>);
            assert.equal(result[0]!.n, 3n);
        });
    });

    describe("count(col)", () => {
        it("type: bigint", async () => {
            const result = await prisma.$from("User").select(({ count }) => count("User.id"), "n").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ n: bigint }>>>);
            assert.equal(result[0]!.n, 3n);
        });
    });

    describe("countDistinct(col)", () => {
        it("type: bigint", async () => {
            const result = await prisma.$from("User").select(({ countDistinct }) => countDistinct("User.id"), "n").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ n: bigint }>>>);
            assert.equal(result[0]!.n, 3n);
        });
    });
});
