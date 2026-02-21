import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("select() fn context", () => {

    describe("lit() — string with alias", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit("hello"), "greeting");
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 'hello' AS ${dialect.quote("greeting", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: key is literal alias, value is string", async () => {
            const result = await prisma.$from("User").select(({lit}) => lit("hello"), "greeting").run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ greeting: string }>>>);
        });
    });

    describe("lit() — number with alias", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit(42), "answer");
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 42 AS ${dialect.quote("answer", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: key is literal alias, value is number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ answer: number }>>>);
        });
    });

    describe("lit() — null with alias", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit(null), "empty");
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT NULL AS ${dialect.quote("empty", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("lit() — no alias", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit("x"));
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 'x' FROM ${dialect.quote("User")};`);
        });

        it("type: key is string (widened)", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<Record<string, string>>>>);
        });
    });

    describe("mixed: regular select + fn select", () => {
        function createQuery() {
            return prisma.$from("User").select("name").select(({lit}) => lit(1), "n");
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quote("name")}, 1 AS ${dialect.quote("n", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("lit() — boolean true (dialect-aware)", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit(true), "flag");
        }

        it("should match SQL with 1", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 1 AS ${dialect.quote("flag", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("lit() — boolean false (dialect-aware)", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit(false), "flag");
        }

        it("should match SQL with 0", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 0 AS ${dialect.quote("flag", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("lit() — string escaping", () => {
        function createQuery() {
            return prisma.$from("User").select(({lit}) => lit("it's"), "s");
        }

        it("should escape single quotes", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT 'it''s' AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });
    });

    // ── Aggregate functions ──────────────────────────────────────────────

    describe("countAll()", () => {
        function createQuery() {
            return prisma.$from("User").select(({countAll}) => countAll(), "total");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COUNT(*) AS ${dialect.quote("total", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ total: number }>>>);
        });

        it("should run and return correct count", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ total: Number(r.total) })), [{ total: 3 }]);
        });
    });

    describe("count(*)", () => {
        function createQuery() {
            const sql =  prisma.$from("User")
                .select(({count}) => count("*"), "total");
            console.log(sql.getSQL());
            return sql;
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COUNT(*) AS ${dialect.quote("total", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ total: number }>>>);
        });

        it("should run and return correct count", async () => {
            const result = await createQuery().run();
            // SQLite raw queries return integers as BigInt; coerce for portable assertion
            assert.deepEqual(result.map(r => ({ total: Number(r.total) })), [{ total: 3 }]);
        });
    });

    describe("count(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({count}) => count("User.id"), "cnt");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COUNT(${dialect.quoteQualifiedColumn("User.id")}) AS ${dialect.quote("cnt", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return count", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ cnt: Number(r.cnt) })), [{ cnt: 3 }]);
        });
    });

    describe("countDistinct(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({countDistinct}) => countDistinct("User.id"), "cnt");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT COUNT(DISTINCT ${dialect.quoteQualifiedColumn("User.id")}) AS ${dialect.quote("cnt", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return count", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ cnt: Number(r.cnt) })), [{ cnt: 3 }]);
        });
    });

    describe("sum(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({sum}) => sum("User.age"), "total");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUM(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("total", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return sum", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ total: Number(r.total) })), [{ total: 55 }]);
        });
    });

    describe("avg(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({avg}) => avg("User.age"), "average");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT AVG(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("average", true)} FROM ${dialect.quote("User")};`);
        });

        it("should run and return avg", async () => {
            const result = await createQuery().run();
            const row = result[0];
            assert.ok(row, "Expected a row");
            const avg = Number(row.average);
            assert.ok(avg > 27 && avg < 28, `Expected ~27.5, got ${row.average}`);
        });
    });

    describe("min(col) — numeric column", () => {
        function createQuery() {
            return prisma.$from("User").select(({min}) => min("User.age"), "youngest");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT MIN(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("youngest", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ youngest: number | null }>>>);
        });

        it("should run and return min", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ youngest: r.youngest === null ? null : Number(r.youngest) })), [{ youngest: 25 }]);
        });
    });

    describe("min(col) — string column", () => {
        function createQuery() {
            return prisma.$from("User").select(({min}) => min("User.name"), "first_name");
        }

        it("type: string | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ first_name: string | null }>>>);
        });
    });

    describe("max(col) — numeric column", () => {
        function createQuery() {
            return prisma.$from("User").select(({max}) => max("User.age"), "oldest");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT MAX(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("oldest", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number | null", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ oldest: number | null }>>>);
        });

        it("should run and return max", async () => {
            const result = await createQuery().run();
            assert.deepEqual(result.map(r => ({ oldest: r.oldest === null ? null : Number(r.oldest) })), [{ oldest: 30 }]);
        });
    });

});
