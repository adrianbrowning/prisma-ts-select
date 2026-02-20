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

        it("type: key is literal alias, value is string", () => {
            const q = createQuery();
            type Result = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<Result, Array<{ greeting: string }>>>);
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

        it("type: key is literal alias, value is number", () => {
            const q = createQuery();
            type Result = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<Result, Array<{ answer: number }>>>);
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

        it("type: key is string (widened)", () => {
            const q = createQuery();
            type Result = Awaited<ReturnType<typeof q.run>>;
            typeCheck({} as Expect<Equal<Result, Array<Record<string, string>>>>);
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
});
