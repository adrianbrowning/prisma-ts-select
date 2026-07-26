import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expectSQL } from "../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

const q = (col: string, isAlias = false) => dialect.quote(col, isAlias);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);

describe("$colRaw - column references in conditions", () => {

    describe("equality - basic $colRaw in where()", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { $colRaw: "Post.authorId" } })
                .select("User.id");
        }

        it("should generate column = column SQL", () => {
            expectSQL(createQuery().getSQL(), [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} = ${qq("Post.authorId")};`,
            ].join(" "));
        });

        it("should run without error", async () => {
            const result = await createQuery().run();
            assert.ok(Array.isArray(result));
        });
    });

    describe("comparison operators (>, <, >=, <=, !=)", () => {
        it("op: > with $colRaw", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: ">", value: { $colRaw: "Post.authorId" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} > ${qq("Post.authorId")};`,
            ].join(" "));
        });

        it("op: != with $colRaw", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "!=", value: { $colRaw: "Post.id" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} != ${qq("Post.id")};`,
            ].join(" "));
        });
    });

    describe("IN / NOT IN with mixed values", () => {
        it("IN with literal and $colRaw mixed", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "IN", values: [1, { $colRaw: "Post.authorId" }, 3] } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} IN (1, ${qq("Post.authorId")}, 3);`,
            ].join(" "));
        });

        it("NOT IN with $colRaw values", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "NOT IN", values: [{ $colRaw: "Post.id" }, { $colRaw: "Post.authorId" }] } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} NOT IN (${qq("Post.id")}, ${qq("Post.authorId")});`,
            ].join(" "));
        });
    });

    describe("BETWEEN with mixed literal and $colRaw", () => {
        it("should support one $colRaw and one literal", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "BETWEEN", values: [{ $colRaw: "Post.authorId" }, 100] } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} BETWEEN ${qq("Post.authorId")} AND 100;`,
            ].join(" "));
        });
    });

    describe("LIKE / NOT LIKE with $colRaw", () => {
        it("LIKE with $colRaw value", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.email": { op: "LIKE", value: { $colRaw: "Post.title" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.email")} LIKE ${qq("Post.title")};`,
            ].join(" "));
        });
    });

    describe("join.where with $colRaw", () => {
        it("should place $colRaw condition in ON clause", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id", { where: { "Post.authorId": { $colRaw: "User.id" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `AND ${qq("Post.authorId")} = ${qq("User.id")};`,
            ].join(" "));
        });
    });

    describe("having() with $colRaw", () => {
        it("should support $colRaw in having function overload", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .having(({ count }) => [[count("Post.id"), { op: ">", value: { $colRaw: "User.id" } }]])
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `GROUP BY ${qq("User.id")}`,
                `HAVING COUNT(${qq("Post.id")}) > ${qq("User.id")};`,
            ].join(" "));
        });
    });

    describe("runtime validation", () => {
        it("should throw if $colRaw has no dot (missing alias)", () => {
            assert.throws(
                () => prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .where({ "User.id": { $colRaw: "noDotHere" } as any })
                    .select("User.id")
                    .getSQL(),
                /\$colRaw.*must.*alias\.field|must contain a dot/i
            );
        });
    });

    describe("type-level: invalid column rejected", () => {
        it("rejects non-existent column in $colRaw", () => {
            prisma.$from("User")
                .join("Post", "authorId", "User.id")
                // @ts-expect-error "Nonexistent.field" is not a valid column
                .where({ "User.id": { $colRaw: "Nonexistent.field" } });
        });
    });
});
