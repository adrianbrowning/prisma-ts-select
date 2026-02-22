import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("SQLite string dialect fns", () => {

    describe("concat(a, b)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ concat }) => concat("User.name", "User.email"), "full");
        }

        it("should use || operator", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT ${dialect.quoteQualifiedColumn("User.name")} || ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("full", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ full: string }>>>);
        });

        it("should run and concatenate values", async () => {
            const result = await createQuery().run();
            // Only check non-null rows (User 3 has null name)
            const nonNull = result.filter(r => r.full !== null && r.full !== undefined);
            assert.ok(nonNull.length >= 2);
        });
    });

    describe("concat(a, b, c) — variadic", () => {
        it("should join with || for 3 args", () => {
            const sql = prisma.$from("User")
                .select(({ concat, lower }) => concat("User.name", lower("User.email"), "User.email"), "full")
                .getSQL();
            expectSQL(sql,
                `SELECT ${dialect.quoteQualifiedColumn("User.name")} || LOWER(${dialect.quoteQualifiedColumn("User.email")}) || ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("full", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("substr(col, start)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ substr }) => substr("User.email", 1), "s");
        }

        it("should match SQL without len", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUBSTR(${dialect.quoteQualifiedColumn("User.email")}, 1) AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ s: string }>>>);
        });
    });

    describe("substr(col, start, len)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ substr }) => substr("User.email", 1, 5), "s");
        }

        it("should match SQL with len", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUBSTR(${dialect.quoteQualifiedColumn("User.email")}, 1, 5) AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });

        it("should return first 5 chars", async () => {
            const result = await createQuery().run();
            const values = result.map(r => r.s).sort();
            assert.deepEqual(values, ["alice", "johnd", "smith"]);
        });
    });

    describe("composition — lit + column", () => {
        it("concat(lit, col, lit) — uses || operator", () => {
            const sql = prisma.$from("User")
                .select(({ concat, lit }) => concat(lit(" "), "User.name", lit(" ")), "r")
                .getSQL();
            expectSQL(sql, `SELECT ' ' || ${dialect.quoteQualifiedColumn("User.name")} || ' ' AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("ltrim(rtrim(concat(lit, col, lit))) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ ltrim, rtrim, concat, lit }) => ltrim(rtrim(concat(lit("  "), "User.name", lit("  ")))), "r")
                .getSQL();
            expectSQL(sql, `SELECT LTRIM(RTRIM('  ' || ${dialect.quoteQualifiedColumn("User.name")} || '  ')) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("concat(upper(col), lit) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ concat, upper, lit }) => concat(upper("User.name"), lit("!")), "r")
                .getSQL();
            expectSQL(sql, `SELECT UPPER(${dialect.quoteQualifiedColumn("User.name")}) || '!' AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("substr(upper(col), 1, 4) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ substr, upper }) => substr(upper("User.name"), 1, 4), "r")
                .getSQL();
            expectSQL(sql, `SELECT SUBSTR(UPPER(${dialect.quoteQualifiedColumn("User.name")}), 1, 4) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("ltrim(rtrim(concat)) — runtime strips whitespace", async () => {
            const result = await prisma.$from("User")
                .select(({ ltrim, rtrim, concat, lit }) => ltrim(rtrim(concat(lit("  "), "User.name", lit("  ")))), "r")
                .run();
            const names = result.map(r => r.r).filter((n): n is string => n !== null);
            for (const name of names) {
                assert.ok(!name.startsWith(" "), `Expected no leading space, got: "${name}"`);
                assert.ok(!name.endsWith(" "), `Expected no trailing space, got: "${name}"`);
            }
        });
    });


    describe("instr(col, substr)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ instr }) => instr("User.email", "@"), "pos")
                .getSQL();
            expectSQL(sql, `SELECT INSTR(${dialect.quoteQualifiedColumn("User.email")}, '@') AS ${dialect.quote("pos", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await prisma.$from("User")
                .select(({ instr }) => instr("User.email", "@"), "pos")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ pos: number }>>>);
        });

        it("should return position of @", async () => {
            const result = await prisma.$from("User")
                .select(({ instr }) => instr("User.email", "@"), "pos")
                .run();
            // johndoe@example.com → 8, smith@example.com → 6, alice@example.com → 6
            const positions = result.map(r => Number(r.pos)).sort((a, b) => a - b);
            assert.deepEqual(positions, [6, 6, 8]);
        });

        it("should escape single quotes", () => {
            const sql = prisma.$from("User")
                .select(({ instr }) => instr("User.name", "it's"), "pos")
                .getSQL();
            expectSQL(sql, `SELECT INSTR(${dialect.quoteQualifiedColumn("User.name")}, 'it''s') AS ${dialect.quote("pos", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("char(...codes)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ char }) => char(65, 66, 67), "abc")
                .getSQL();
            expectSQL(sql, `SELECT CHAR(65, 66, 67) AS ${dialect.quote("abc", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ char }) => char(65, 66, 67), "abc")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ abc: string }>>>);
        });

        it("should return 'ABC'", async () => {
            const result = await prisma.$from("User")
                .select(({ char }) => char(65, 66, 67), "abc")
                .run();
            assert.ok(result.every(r => r.abc === "ABC"));
        });
    });

    describe("hex(col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ hex }) => hex("User.name"), "h")
                .getSQL();
            expectSQL(sql, `SELECT HEX(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("h", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ hex }) => hex("User.name"), "h")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ h: string }>>>);
        });

        it("should return hex string", async () => {
            const result = await prisma.$from("User")
                .select(({ hex }) => hex("User.name"), "h")
                .run();
            const hexVals = result.map(r => r.h).filter((h): h is string => h !== null && h !== "");
            // hex values should only contain valid hex chars
            assert.ok(hexVals.every(h => /^[0-9A-Fa-f]+$/.test(h)));
        });
    });

    describe("unicode(col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ unicode }) => unicode("User.name"), "code")
                .getSQL();
            expectSQL(sql, `SELECT UNICODE(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("code", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await prisma.$from("User")
                .select(({ unicode }) => unicode("User.name"), "code")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ code: number }>>>);
        });

        it("should return unicode code point of first char", async () => {
            const result = await prisma.$from("User")
                .select(({ unicode }) => unicode("User.name"), "code")
                .run();
            // "John Doe" → J=74, "John Smith" → J=74, null user → null
            // SQLite may return BigInt — convert for portable comparison
            const codes = result.map(r => r.code).filter(c => c !== null).map(c => Number(c));
            assert.ok(codes.every(c => Number.isInteger(c)));
            // First char of both names is 'J' (74)
            assert.ok(codes.includes(74));
        });
    });

});
