import assert from "node:assert/strict"
import { describe, it } from "node:test"
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
    });
});
