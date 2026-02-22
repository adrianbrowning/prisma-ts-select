import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("select() string fn context", () => {

    describe("upper(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ upper }) => upper("User.name"), "uname");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT UPPER(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("uname", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ uname: string }>>>);
        });

        it("should return uppercase names", async () => {
            const result = await createQuery().run();
            const names = result.map(r => r.uname).filter(n => n !== null).sort();
            assert.deepEqual(names, ["JOHN DOE", "JOHN SMITH", null].filter(n => n !== null).sort());
        });
    });

    describe("lower(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ lower }) => lower("User.name"), "lname");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT LOWER(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("lname", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ lname: string }>>>);
        });

        it("should return lowercase names", async () => {
            const result = await createQuery().run();
            const names = result.map(r => r.lname).filter((n): n is string => n !== null).sort();
            assert.deepEqual(names, ["john doe", "john smith"]);
        });
    });

    describe("length(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ length }) => length("User.email"), "elen");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT LENGTH(${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("elen", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ elen: number }>>>);
        });

        it("should return correct lengths", async () => {
            const result = await createQuery().run();
            const lengths = result.map(r => Number(r.elen)).sort((a, b) => a - b);
            // johndoe@example.com = 19, smith@example.com = 17, alice@example.com = 17
            assert.deepEqual(lengths, [17, 17, 19]);
        });
    });

    describe("trim(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ trim }) => trim("User.email"), "email");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT TRIM(${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("email", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ email: string }>>>);
        });
    });

    describe("ltrim(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ ltrim }) => ltrim("User.email"), "email");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT LTRIM(${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("email", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ email: string }>>>);
        });
    });

    describe("rtrim(col)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ rtrim }) => rtrim("User.email"), "email");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT RTRIM(${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("email", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ email: string }>>>);
        });
    });

    describe("replace(col, from, to)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ replace }) => replace("User.email", "@example.com", ""), "handle");
        }

        it("should match SQL", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT REPLACE(${dialect.quoteQualifiedColumn("User.email")}, '@example.com', '') AS ${dialect.quote("handle", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ handle: string }>>>);
        });

        it("should replace substring", async () => {
            const result = await createQuery().run();
            const handles = result.map(r => r.handle).sort();
            assert.deepEqual(handles, ["alice", "johndoe", "smith"]);
        });

        it("should escape single quotes in from/to", () => {
            const sql = prisma.$from("User")
                .select(({ replace }) => replace("User.name", "it's", "its"), "fixed")
                .getSQL();
            expectSQL(sql,
                `SELECT REPLACE(${dialect.quoteQualifiedColumn("User.name")}, 'it''s', 'its') AS ${dialect.quote("fixed", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("chaining: upper(lower(col))", () => {
        it("should accept SQLExpr as input", () => {
            const sql = prisma.$from("User")
                .select(({ upper, lower }) => upper(lower("User.name")), "result")
                .getSQL();
            expectSQL(sql,
                `SELECT UPPER(LOWER(${dialect.quoteQualifiedColumn("User.name")})) AS ${dialect.quote("result", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("composition — lit + column", () => {
        it("upper(lit) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ upper, lit }) => upper(lit("hello")), "r")
                .getSQL();
            expectSQL(sql, `SELECT UPPER('hello') AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("trim(lit) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ trim, lit }) => trim(lit("  hello  ")), "r")
                .getSQL();
            expectSQL(sql, `SELECT TRIM('  hello  ') AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("length(lit) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ length, lit }) => length(lit("hello")), "r")
                .getSQL();
            expectSQL(sql, `SELECT LENGTH('hello') AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("length(upper(col)) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ length, upper }) => length(upper("User.name")), "r")
                .getSQL();
            expectSQL(sql, `SELECT LENGTH(UPPER(${dialect.quoteQualifiedColumn("User.name")})) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("ltrim(rtrim(col)) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ ltrim, rtrim }) => ltrim(rtrim("User.name")), "r")
                .getSQL();
            expectSQL(sql, `SELECT LTRIM(RTRIM(${dialect.quoteQualifiedColumn("User.name")})) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("trim(replace(col)) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ trim, replace }) => trim(replace("User.email", "johndoe@", "  johndoe@  ")), "r")
                .getSQL();
            expectSQL(sql, `SELECT TRIM(REPLACE(${dialect.quoteQualifiedColumn("User.email")}, 'johndoe@', '  johndoe@  ')) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("length(upper(replace(col))) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ length, upper, replace }) => length(upper(replace("User.name", "John", "Jon"))), "r")
                .getSQL();
            expectSQL(sql, `SELECT LENGTH(UPPER(REPLACE(${dialect.quoteQualifiedColumn("User.name")}, 'John', 'Jon'))) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });
    });

});
