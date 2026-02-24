import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("select() fn context — control flow", () => {

    describe("cond() — simple equality", () => {
        it("should emit condition SQL", () => {
            const sql = prisma.$from("User")
                .select(({ caseWhen, lit }) => caseWhen([
                    { when: { age: { op: ">=", value: 18 } }, then: lit("adult") }
                ], lit("minor")), "status")
                .getSQL();
            expectSQL(sql,
                `SELECT CASE WHEN ${dialect.quoteQualifiedColumn("age")} >= 18 THEN 'adult' ELSE 'minor' END AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("coalesce()", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ coalesce, lit }) => coalesce("User.email", lit("unknown")), "contact");
        }

        it("should emit COALESCE SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COALESCE(${dialect.quoteQualifiedColumn("User.email")}, 'unknown') AS ${dialect.quote("contact", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ contact: string }>>>);
        });

        it("should run and return non-null email", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => r.contact !== null && r.contact !== undefined));
        });

        it("rejects string col with number fallback", () => {
            // @ts-expect-error User.email is string, not number
            prisma.$from("User").select(({ coalesce, lit }) => coalesce("User.email", lit(0)), "x");
        });

        it("rejects number col with string fallback", () => {
            // @ts-expect-error User.age is number, not string
            prisma.$from("User").select(({ coalesce, lit }) => coalesce("User.age", lit("n/a")), "x");
        });
    });

    describe("nullif()", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ nullif, lit }) => nullif(lit(0), lit(0)), "val");
        }

        it("should emit NULLIF SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT NULLIF(0, 0) AS ${dialect.quote("val", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ val: number | null }>>>);
        });

        it("should run and return null when values equal", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => r.val === null));
        });

        it("should run and return value when values differ", async () => {
            const result = await prisma.$from("User")
                .select(({ nullif, lit }) => nullif(lit(1), lit(0)), "val")
                .run();
            assert.ok(result.length > 0);
            // val is non-null when args differ (DB may return integer as BigInt)
            assert.ok(result.every(r => r.val !== null));
        });
    });

    describe("caseWhen() — single branch no else", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ caseWhen, lit }) => caseWhen([
                    { when: { age: { op: ">=", value: 18 } }, then: lit("adult") }
                ]), "bucket");
        }

        it("should emit CASE WHEN ... END (no ELSE)", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CASE WHEN ${dialect.quoteQualifiedColumn("age")} >= 18 THEN 'adult' END AS ${dialect.quote("bucket", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ bucket: string | null }>>>);
        });
    });

    describe("caseWhen() — with else", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ caseWhen, lit }) => caseWhen([
                    { when: { age: { op: ">=", value: 18 } }, then: lit("adult") }
                ], lit("minor")), "status");
        }

        it("should emit CASE WHEN ... ELSE ... END", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CASE WHEN ${dialect.quoteQualifiedColumn("age")} >= 18 THEN 'adult' ELSE 'minor' END AS ${dialect.quote("status", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string (else eliminates null)", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ status: string }>>>);
        });

        it("should run and categorize users", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
            assert.ok(result.every(r => r.status === "adult" || r.status === "minor"));
        });
    });

    describe("caseWhen() — multiple branches", () => {
        function createQuery() {
            return prisma.$from("User")
                .select(({ caseWhen, lit }) => caseWhen([
                    { when: { age: { op: "<", value: 18 } }, then: lit("minor") },
                    { when: { age: { op: "<", value: 65 } }, then: lit("adult") },
                ], lit("senior")), "ageGroup");
        }

        it("should emit multiple WHEN branches", () => {
            const sql = createQuery().getSQL();
            assert.ok(sql.includes("WHEN") && sql.includes("ELSE"));
        });

        it("should run and return values", async () => {
            const result = await createQuery().run();
            assert.ok(result.length > 0);
        });
    });

    describe("zero-arg type safety", () => {
        it("coalesce() rejects zero args", () => {
            assert.throws(() =>
                // @ts-expect-error: requires at least one argument
                prisma.$from("User").select(({ coalesce }) => coalesce(), "x")
            );
        });

        it("caseWhen([]) rejects empty cases array", () => {
            assert.throws(() =>
                // @ts-expect-error: cases must have at least one WHEN clause
                prisma.$from("User").select(({ caseWhen, lit }) => caseWhen([], lit("x")), "x")
            );
        });
    });

    describe("cond() — converts WhereCriteria to SQLExpr<boolean>", () => {
        it("cond emits correct SQL fragment", () => {
            const sql = prisma.$from("User")
                .select(({ cond }) => cond({ age: { op: ">", value: 0 } }), "flag")
                .getSQL();
            expectSQL(sql,
                `SELECT ${dialect.quoteQualifiedColumn("age")} > 0 AS ${dialect.quote("flag", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: boolean", async () => {
            const result = await prisma.$from("User")
                .select(({ cond }) => cond({ age: { op: ">", value: 0 } }), "flag")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ flag: boolean }>>>);
        });
    });

});
