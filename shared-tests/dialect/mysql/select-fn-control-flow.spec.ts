import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("MySQL control flow dialect fns", () => {

    describe("$if(cond, true, false)", () => {
        describe("with criteria condition", () => {
            function createQuery() {
                return prisma.$from("User")
                    .select(({ $if, lit }) => $if(
                        { age: { op: ">=", value: 18 } },
                        lit("adult"),
                        lit("minor")
                    ), "status");
            }

            it("should emit IF() SQL", () => {
                expectSQL(createQuery().getSQL(),
                    `SELECT IF(${dialect.quoteQualifiedColumn("age")} >= 18, 'adult', 'minor') AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
            });

            it("type: string", async () => {
                const result = await createQuery().run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ status: string }>>>);
            });

            it("should run and categorize", async () => {
                const result = await createQuery().run();
                assert.ok(result.every(r => r.status === "adult" || r.status === "minor"));
            });
        });

        describe("with SQLExpr condition (via cond())", () => {
            it("should work with cond() bridge", () => {
                const sql = prisma.$from("User")
                    .select(({ $if, cond, lit }) => $if(
                        cond({ age: { op: ">=", value: 18 } }),
                        lit("adult"),
                        lit("minor")
                    ), "status")
                    .getSQL();
                expectSQL(sql,
                    `SELECT IF(${dialect.quoteQualifiedColumn("age")} >= 18, 'adult', 'minor') AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
            });
        });
    });

    describe("ifNull(col, fallback)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ ifNull, lit }) => ifNull("User.email", lit("n/a")), "contact");
        }

        it("should emit IFNULL() SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT IFNULL(${dialect.quoteQualifiedColumn("User.email")}, 'n/a') AS ${dialect.quote("contact", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ contact: string }>>>);
        });

        it("should run and return non-null contact", async () => {
            const result = await createQuery().run();
            assert.ok(result.every(r => r.contact !== null));
        });
    });

    describe("greatest(...args)", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ greatest, lit }) => greatest("User.age", lit(30)), "maxAge");
        }

        it("should emit GREATEST() SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT GREATEST(${dialect.quoteQualifiedColumn("User.age")}, 30) AS ${dialect.quote("maxAge", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ maxAge: number | null }>>>);
        });

        it("should run and return max (NULL when age is NULL)", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            // MySQL GREATEST is NULL-poisoned: returns NULL if any arg is NULL (user 3 has null age)
            assert.ok(result.every(r => r.maxAge === null || r.maxAge >= 30));
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

        it("type: number | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ minAge: number | null }>>>);
        });

        it("should run and return min (NULL when age is NULL)", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            // MySQL LEAST is NULL-poisoned: returns NULL if any arg is NULL (user 3 has null age)
            assert.ok(result.every(r => r.minAge === null || r.minAge <= 30));
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
