import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("SQLite dialect fns", () => {
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

        it("should match SQL with separator", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}, ' | ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")};`);
        });
    });

    describe("total(col)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ total }) => total("User.age"), "t");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT TOTAL(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("t", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return sum or 0.0 for empty sets", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
            assert.ok(result.length === 1 && typeof result[0]!.t === "number");
        });
    });

    describe("sum(col) — type", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ sum }) => sum("User.age"), "total").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ total: number }>>>);
        });
    });

    describe("avg(col) — type", () => {
        it("type: number", async () => {
            const result = await prisma.$from("User").select(({ avg }) => avg("User.age"), "average").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ average: number }>>>);
        });
    });
});
