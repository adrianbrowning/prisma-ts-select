import { describe, test } from "node:test"
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// MySQL does not support FULL JOIN.
// These tests verify fullJoin methods are NOT available on the type level.
// rightJoin IS supported on MySQL.

describe("MySQL join dialect enforcement", () => {

    test("fullJoin is not available on MySQL", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoin is not supported on MySQL
            .fullJoin("Post", "authorId", "User.id");
    });

    test("fullJoinUnsafeTypeEnforced is not available on MySQL", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoinUnsafeTypeEnforced is not supported on MySQL
            .fullJoinUnsafeTypeEnforced("Post", "id", "User.id");
    });

    test("fullJoinUnsafeIgnoreType is not available on MySQL", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoinUnsafeIgnoreType is not supported on MySQL
            .fullJoinUnsafeIgnoreType("Post", "id", "User.email");
    });

    test("rightJoin IS available on MySQL", () => {
        const sql = prisma.$from("User")
            .rightJoin("Post", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("rightJoinUnsafeTypeEnforced IS available on MySQL", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeTypeEnforced("Post", "id", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("rightJoinUnsafeIgnoreType IS available on MySQL", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeIgnoreType("Post", "id", "User.email")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
    });
});

describe("rightJoin with where option (MySQL)", () => {

    test("rightJoin with where - positional", () => {
        const sql = prisma.$from("User")
            .rightJoin("Post", "authorId", "User.id", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("rightJoin with where - object syntax", () => {
        const sql = prisma.$from("User")
            .rightJoin({ table: "Post", src: "authorId", on: "User.id", where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("rightJoinUnsafeTypeEnforced with where - positional", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeTypeEnforced("Post", "id", "User.id", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("rightJoinUnsafeIgnoreType with where - positional", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeIgnoreType("Post", "id", "User.email", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });
});
