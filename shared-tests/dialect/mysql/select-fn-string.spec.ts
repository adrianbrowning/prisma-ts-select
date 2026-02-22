import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("MySQL string dialect fns", () => {

    describe("concat(a, b)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ concat }) => concat("User.name", "User.email"), "full");
        }

        it("should use CONCAT()", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT CONCAT(${dialect.quoteQualifiedColumn("User.name")}, ${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("full", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ full: string }>>>);
        });

        it("should run and concatenate values", async () => {
            const result = await createQuery().run();
            const nonNull = result.filter(r => r.full !== null && r.full !== undefined);
            assert.ok(nonNull.length >= 2);
        });
    });

    describe("concat(a, b, c) — variadic", () => {
        it("should join with CONCAT for 3 args", () => {
            const sql = prisma.$from("User")
                .select(({ concat, lower }) => concat("User.name", lower("User.email"), "User.email"), "full")
                .getSQL();
            expectSQL(sql,
                `SELECT CONCAT(${dialect.quoteQualifiedColumn("User.name")}, LOWER(${dialect.quoteQualifiedColumn("User.email")}), ${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("full", true)} FROM ${dialect.quote("User")};`);
        });
    });

    describe("substring(col, start)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ substring }) => substring("User.email", 1), "s");
        }

        it("should match SQL without len", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUBSTRING(${dialect.quoteQualifiedColumn("User.email")}, 1) AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await createQuery().run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ s: string }>>>);
        });
    });

    describe("substring(col, start, len)", () => {
        function createQuery() {
            return prisma.$from("User").select(({ substring }) => substring("User.email", 1, 5), "s");
        }

        it("should match SQL with len", () => {
            expectSQL(createQuery().getSQL(),
                `SELECT SUBSTRING(${dialect.quoteQualifiedColumn("User.email")}, 1, 5) AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });

        it("should return first 5 chars", async () => {
            const result = await createQuery().run();
            const values = result.map(r => r.s).sort();
            assert.deepEqual(values, ["alice", "johnd", "smith"]);
        });
    });

    describe("composition — lit + column", () => {
        it("concat(lit, col, lit) — uses CONCAT()", () => {
            const sql = prisma.$from("User")
                .select(({ concat, lit }) => concat(lit(" "), "User.name", lit(" ")), "r")
                .getSQL();
            expectSQL(sql, `SELECT CONCAT(' ', ${dialect.quoteQualifiedColumn("User.name")}, ' ') AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("ltrim(rtrim(concat(lit, col, lit))) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ ltrim, rtrim, concat, lit }) => ltrim(rtrim(concat(lit("  "), "User.name", lit("  ")))), "r")
                .getSQL();
            expectSQL(sql, `SELECT LTRIM(RTRIM(CONCAT('  ', ${dialect.quoteQualifiedColumn("User.name")}, '  '))) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("concat(upper(col), lit) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ concat, upper, lit }) => concat(upper("User.name"), lit("!")), "r")
                .getSQL();
            expectSQL(sql, `SELECT CONCAT(UPPER(${dialect.quoteQualifiedColumn("User.name")}), '!') AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });

        it("substring(upper(col), 1, 4) — SQL", () => {
            const sql = prisma.$from("User")
                .select(({ substring, upper }) => substring(upper("User.name"), 1, 4), "r")
                .getSQL();
            expectSQL(sql, `SELECT SUBSTRING(UPPER(${dialect.quoteQualifiedColumn("User.name")}), 1, 4) AS ${dialect.quote("r", true)} FROM ${dialect.quote("User")};`);
        });
    });


    describe("left(col, n)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ left }) => left("User.email", 5), "prefix")
                .getSQL();
            expectSQL(sql, `SELECT LEFT(${dialect.quoteQualifiedColumn("User.email")}, 5) AS ${dialect.quote("prefix", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ left }) => left("User.email", 5), "prefix")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ prefix: string }>>>);
        });

        it("should return first 5 chars", async () => {
            const result = await prisma.$from("User")
                .select(({ left }) => left("User.email", 5), "prefix")
                .run();
            const vals = result.map(r => r.prefix).sort();
            assert.deepEqual(vals, ["alice", "johnd", "smith"]);
        });
    });

    describe("right(col, n)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ right }) => right("User.email", 11), "domain")
                .getSQL();
            expectSQL(sql, `SELECT RIGHT(${dialect.quoteQualifiedColumn("User.email")}, 11) AS ${dialect.quote("domain", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ right }) => right("User.email", 11), "domain")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ domain: string }>>>);
        });

        it("should return last 11 chars (example.com)", async () => {
            const result = await prisma.$from("User")
                .select(({ right }) => right("User.email", 11), "domain")
                .run();
            assert.ok(result.every(r => r.domain === "example.com"));
        });
    });

    describe("repeat(col, n)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ repeat }) => repeat("User.name", 2), "doubled")
                .getSQL();
            expectSQL(sql, `SELECT REPEAT(${dialect.quoteQualifiedColumn("User.name")}, 2) AS ${dialect.quote("doubled", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ repeat }) => repeat("User.name", 2), "doubled")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ doubled: string }>>>);
        });
    });

    describe("reverse(col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ reverse }) => reverse("User.name"), "rev")
                .getSQL();
            expectSQL(sql, `SELECT REVERSE(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("rev", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ reverse }) => reverse("User.name"), "rev")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ rev: string }>>>);
        });
    });

    describe("lpad(col, len, pad)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ lpad }) => lpad("User.name", 10, "*"), "padded")
                .getSQL();
            expectSQL(sql, `SELECT LPAD(${dialect.quoteQualifiedColumn("User.name")}, 10, '*') AS ${dialect.quote("padded", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ lpad }) => lpad("User.name", 10, "*"), "padded")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ padded: string }>>>);
        });
    });

    describe("rpad(col, len, pad)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ rpad }) => rpad("User.name", 10, "-"), "padded")
                .getSQL();
            expectSQL(sql, `SELECT RPAD(${dialect.quoteQualifiedColumn("User.name")}, 10, '-') AS ${dialect.quote("padded", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ rpad }) => rpad("User.name", 10, "-"), "padded")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ padded: string }>>>);
        });
    });

    describe("locate(substr, col)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ locate }) => locate("@", "User.email"), "pos")
                .getSQL();
            expectSQL(sql, `SELECT LOCATE('@', ${dialect.quoteQualifiedColumn("User.email")}) AS ${dialect.quote("pos", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: number", async () => {
            const result = await prisma.$from("User")
                .select(({ locate }) => locate("@", "User.email"), "pos")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ pos: number }>>>);
        });

        it("should return position of @", async () => {
            const result = await prisma.$from("User")
                .select(({ locate }) => locate("@", "User.email"), "pos")
                .run();
            const positions = result.map(r => Number(r.pos)).sort((a, b) => a - b);
            assert.deepEqual(positions, [6, 6, 8]);
        });
    });

    describe("space(n)", () => {
        it("should match SQL", () => {
            const sql = prisma.$from("User")
                .select(({ space }) => space(3), "s")
                .getSQL();
            expectSQL(sql, `SELECT SPACE(3) AS ${dialect.quote("s", true)} FROM ${dialect.quote("User")};`);
        });

        it("type: string", async () => {
            const result = await prisma.$from("User")
                .select(({ space }) => space(3), "s")
                .run();
            typeCheck({} as Expect<Equal<typeof result, Array<{ s: string }>>>);
        });

        it("should return 3 spaces", async () => {
            const result = await prisma.$from("User")
                .select(({ space }) => space(3), "s")
                .run();
            assert.ok(result.every(r => r.s === "   "));
        });
    });

});
