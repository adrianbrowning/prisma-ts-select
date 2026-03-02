import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

const q = (col: string) => dialect.quote(col);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);

describe("where() fn overload", () => {

    describe("upper(col) scalar equality", () => {
        function createQuery() {
            return prisma.$from("User")
                .where(({ upper }) => [[upper('User.name'), 'JOHN DOE']])
                .select("User.name");
        }

        it("should generate WHERE UPPER(col) = '...'", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `WHERE UPPER(${qq("User.name")}) = 'JOHN DOE';`,
            ].join(" "));
        });

        it("runtime: only John Doe returned", async () => {
            const result = await createQuery().run();
            assert.deepStrictEqual(result, [{ name: 'John Doe' }]);
        });
    });

    describe("upper(col) LIKE condition", () => {
        it("should generate WHERE UPPER(col) LIKE '...'", () => {
            const sql = prisma.$from("User")
                .where(({ upper }) => [[upper('User.name'), { op: 'LIKE', value: 'JOHN%' }]])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `WHERE UPPER(${qq("User.name")}) LIKE 'JOHN%';`,
            ].join(" "));
        });
    });

    describe("multiple pairs in one fn call", () => {
        it("should join multiple pairs with AND", () => {
            const sql = prisma.$from("User")
                .where(({ upper, lower }) => [
                    [upper('User.name'), { op: 'LIKE', value: 'JOHN%' }],
                    [lower('User.email'), { op: 'LIKE', value: '%@example.com' }],
                ])
                .select("User.name")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("name")}`,
                `FROM ${q("User")}`,
                `WHERE UPPER(${qq("User.name")}) LIKE 'JOHN%' AND LOWER(${qq("User.email")}) LIKE '%@example.com';`,
            ].join(" "));
        });
    });

    describe("where() fn with scalar equality", () => {
        it("should generate WHERE expr = value for non-string quoting", () => {
            const sql = prisma.$from("User")
                .where(({ upper }) => [[upper('User.name'), 'JOHN DOE']])
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${q("id")}`,
                `FROM ${q("User")}`,
                `WHERE UPPER(${qq("User.name")}) = 'JOHN DOE';`,
            ].join(" "));
        });
    });

});
