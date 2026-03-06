import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Equal, Expect } from "../../utils.ts"
import { typeCheck } from "../../utils.ts"
import { expectSQL } from "../../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

describe("MySQL distinct() helper", () => {
    describe("avg(distinct(col))", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ avg, distinct }) => avg(distinct("User.age")), "avgAge");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT AVG(DISTINCT \`User\`.\`age\`) AS ${dialect.quote("avgAge", true)} FROM ${dialect.quote("User")} GROUP BY \`User\`.\`id\`;`);
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("sum(distinct(col))", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ sum, distinct }) => sum(distinct("User.age")), "sumAge");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUM(DISTINCT \`User\`.\`age\`) AS ${dialect.quote("sumAge", true)} FROM ${dialect.quote("User")} GROUP BY \`User\`.\`id\`;`);
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("groupConcat(distinct(col))", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("User.name")), "names");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(DISTINCT \`User\`.\`name\`) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY \`User\`.\`id\`;`);
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("groupConcat(distinct(col), sep)", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ groupConcat, distinct }) => groupConcat(distinct("User.name"), " | "), "names");
        }

        it("should match SQL with SEPARATOR", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GROUP_CONCAT(DISTINCT \`User\`.\`name\` SEPARATOR ' | ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY \`User\`.\`id\`;`);
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("count(distinct(col))", () => {
        function createQuery() {
            return prisma.$from("User")
                .groupBy(["User.id"])
                .select(({ count, distinct }) => count(distinct("User.name")), "cnt");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COUNT(DISTINCT \`User\`.\`name\`) AS ${dialect.quote("cnt", true)} FROM ${dialect.quote("User")} GROUP BY \`User\`.\`id\`;`);
        });

        it("type: bigint", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ cnt: bigint }>>>);
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("type boundary", () => {
        it("avg(distinct(string col)) should be a type error", () => {
            // @ts-expect-error - User.name is string, avg expects number col
            prisma.$from("User").select(({ avg, distinct }) => avg(distinct("User.name")), "v");
        });
    });
});
