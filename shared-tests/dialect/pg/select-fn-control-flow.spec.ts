import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("PostgreSQL control flow dialect fns", () => {

    describe("greatest(...args)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ greatest, lit }) => greatest("User.age", lit(30)), "maxAge");
        }

        it("should emit GREATEST() SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GREATEST(${dialect.quoteQualifiedColumn("User.age")}, 30) AS ${dialect.quote("maxAge", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return max values", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => (r.maxAge) >= 30));
        });
    });

    describe("least(...args)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ least, lit }) => least("User.age", lit(30)), "minAge");
        }

        it("should emit LEAST() SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT LEAST(${dialect.quoteQualifiedColumn("User.age")}, 30) AS ${dialect.quote("minAge", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return min values", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => (r.minAge) <= 30));
        });
    });

    describe("zero-arg type safety", () => {
        it("concat() rejects zero args", () => {
            assert.throws(() =>
                // @ts-expect-error: requires at least one argument
                prisma.$from("User").select(({ concat }) => concat(), "x")
            );
        });

        it("greatest() rejects zero args", () => {
            assert.throws(() =>
                // @ts-expect-error: requires at least one argument
                prisma.$from("User").select(({ greatest }) => greatest(), "x")
            );
        });

        it("least() rejects zero args", () => {
            assert.throws(() =>
                // @ts-expect-error: requires at least one argument
                prisma.$from("User").select(({ least }) => least(), "x")
            );
        });
    });

});
