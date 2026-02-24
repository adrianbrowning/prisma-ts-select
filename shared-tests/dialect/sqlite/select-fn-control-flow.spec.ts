import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("SQLite control flow dialect fns", () => {

    describe("iif(cond, true, false)", () => {
        describe("with criteria condition", () => {
            function createQuery() {
                return prisma.$from("User")
                    .select(({ iif, lit }) => iif(
                        { age: { op: ">=", value: 18 } },
                        lit("adult"),
                        lit("minor")
                    ), "status");
            }

            it("should emit IIF() SQL", () => {
                expectSQL(createQuery().getSQL(),
                    `SELECT IIF(${dialect.quoteQualifiedColumn("age")} >= 18, 'adult', 'minor') AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
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
            it("should work with cond()", () => {
                const sql = prisma.$from("User")
                    .select(({ iif, cond, lit }) => iif(
                        cond({ age: { op: ">=", value: 18 } }),
                        lit("adult"),
                        lit("minor")
                    ), "status")
                    .getSQL();
                expectSQL(sql,
                    `SELECT IIF(${dialect.quoteQualifiedColumn("age")} >= 18, 'adult', 'minor') AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
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

    describe("zero-arg type safety", () => {
        it("concat() rejects zero args", () => {
            assert.throws(() =>
                // @ts-expect-error: requires at least one argument
                prisma.$from("User").select(({ concat }) => concat(), "x")
            );
        });
    });

});
