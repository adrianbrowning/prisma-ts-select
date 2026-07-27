import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expectSQL } from "../test-utils.ts"
import { prisma } from '#client'
import { dialect } from '#dialect'

const q = (col: string, isAlias = false) => dialect.quote(col, isAlias);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);

describe("$col - type-safe column references", () => {

    describe("equality - same type (number = number)", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { $col: "Post.authorId" } })
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

    describe("equality - same type (string = string)", () => {
        it("should allow string column ref on string field", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.name": { $col: "Post.title" } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.name")} = ${qq("Post.title")};`,
            ].join(" "));
        });
    });

    describe("comparison operators with $col", () => {
        it("op: > with $col (number)", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: ">", value: { $col: "Post.authorId" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} > ${qq("Post.authorId")};`,
            ].join(" "));
        });

        it("op: != with $col (string)", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.name": { op: "!=", value: { $col: "Post.title" } } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.name")} != ${qq("Post.title")};`,
            ].join(" "));
        });
    });

    describe("IN / NOT IN with $col", () => {
        it("IN with mixed literal and $col", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "IN", values: [1, { $col: "Post.authorId" }, 3] } })
                .select("User.id")
                .getSQL();
            expectSQL(sql, [
                `SELECT ${qq("User.id")} AS ${q("User.id", true)}`,
                `FROM ${q("User")}`,
                `JOIN ${q("Post")} ON ${qq("Post.authorId")} = ${qq("User.id")}`,
                `WHERE ${qq("User.id")} IN (1, ${qq("Post.authorId")}, 3);`,
            ].join(" "));
        });
    });

    describe("BETWEEN with $col", () => {
        it("should support $col and literal", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({ "User.id": { op: "BETWEEN", values: [{ $col: "Post.authorId" }, 100] } })
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

    describe("join.where with $col", () => {
        it("should place $col condition in ON clause", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id", { where: { "Post.authorId": { $col: "User.id" } } })
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

    describe("having() with $col", () => {
        it("should support $col in having function overload", () => {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.id"])
                .having(({ count }) => [[count("Post.id"), { op: ">", value: { $col: "User.id" } }]])
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

    describe("type-level: cross-type rejection", () => {
        it("rejects number field referencing string column", () => {
            prisma.$from("User")
                .join("Post", "authorId", "User.id")
                // @ts-expect-error "Post.title" is string, but "User.id" is number
                .where({ "User.id": { $col: "Post.title" } });
        });

        it("rejects string field referencing number column", () => {
            prisma.$from("User")
                .join("Post", "authorId", "User.id")
                // @ts-expect-error "Post.authorId" is number, but "User.name" is string
                .where({ "User.name": { $col: "Post.authorId" } });
        });

        it("rejects $col in operator with wrong type", () => {
            prisma.$from("User")
                .join("Post", "authorId", "User.id")
                // @ts-expect-error "Post.title" is string, can't use in numeric >
                .where({ "User.id": { op: ">", value: { $col: "Post.title" } } });
        });
    });

    describe("runtime validation", () => {
        it("should throw if $col has no dot (missing alias)", () => {
            assert.throws(
                () => prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .where({ "User.id": { $col: "noDotHere" } as any })
                    .select("User.id")
                    .getSQL(),
                /\$col.*must.*alias\.field|must contain a dot/i
            );
        });
    });
});
