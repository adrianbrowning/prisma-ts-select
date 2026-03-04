import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// Helpers for building expected SQL fragments
const q = (col: string) => dialect.quote(col);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);

describe("having() with aggregate functions", () => {

    describe("type safety", () => {
        it("rejects string value (tuple syntax)", () => {
            function check() {
                // @ts-expect-error — string not assignable to NumericCondValue
                prisma.$from("User").groupBy(["User.id"]).having(({ countAll }) => [[countAll(), "wrong"]]);
            }
            void check;
        });
    });

    describe("countAll() with op (>)", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ countAll }) => [[countAll(), { op: '>', value: 1 }]])
                .select("User.name");
        }

        it("should generate HAVING COUNT(*) > 1", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING COUNT(*) > 1;`,
            ].join(" "));
        });

        it("runtime: only users with >1 post returned", async (t) => {
            const result = await createQuery().run();
            t.assert.snapshot(result);
        });
    });

    describe("count(col) with bigint value (>=)", () => {
        it("should generate HAVING COUNT(col) >= 2", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ count }) => [[count('User.id'), { op: '>=', value: 2n }]])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING COUNT(${qq("User.id")}) >= 2;`,
            ].join(" "));
        });
    });

    describe("countAll() scalar shorthand (=)", () => {
        it("should generate HAVING COUNT(*) = 2", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ countAll }) => [[countAll(), 2]])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING COUNT(*) = 2;`,
            ].join(" "));
        });
    });

    describe("avg(col) with BETWEEN", () => {
        it("should generate HAVING AVG(col) BETWEEN 20 AND 35", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ avg }) => [[avg('User.age'), { op: 'BETWEEN', values: [20, 35] }]])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING AVG(${qq("User.age")}) BETWEEN 20 AND 35;`,
            ].join(" "));
        });
    });

    describe("countAll() with IN", () => {
        it("should generate HAVING COUNT(*) IN (1, 2)", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ countAll }) => [[countAll(), { op: 'IN', values: [1, 2] }]])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING COUNT(*) IN (1, 2);`,
            ].join(" "));
        });
    });

    describe("multiple conditions in one .having() call", () => {
        it("should join multiple pairs with AND", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ count, avg }) => [
                    [count('User.id'), { op: '>=', value: 2n }],
                    [avg('User.age'), { op: 'BETWEEN', values: [20, 35] }],
                ])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING COUNT(${qq("User.id")}) >= 2 AND AVG(${qq("User.age")}) BETWEEN 20 AND 35;`,
            ].join(" "));
        });
    });

    describe("chained .having(criteria).having(tuple fn)", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having({ "User.name": { op: "LIKE", value: "John%" } })
                .having(({ countAll }) => [[countAll(), { op: '>', value: 1 }]])
                .select("User.name");
        }

        it("should include both HAVING clauses", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING ${qq("User.name")} LIKE 'John%' AND COUNT(*) > 1;`,
            ].join(" "));
        });

        it("runtime: chained having filters correctly", async (t) => {
            const result = await createQuery().run();
            t.assert.snapshot(result);
        });
    });

    describe("string expr in HAVING — upper() LIKE", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having(({ upper }) => [[upper('User.name'), { op: 'LIKE', value: 'JOHN D%' }]])
                .select("User.name");
        }

        it("should generate HAVING UPPER(col) LIKE '...'", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.name")}`,
                `HAVING UPPER(${qq("User.name")}) LIKE 'JOHN D%';`,
            ].join(" "));
        });

        it("runtime: only John Doe matches LIKE 'JOHN D%'", async (t) => {
            const result = await createQuery().run();
            t.assert.snapshot(result);
        });
    });

});
