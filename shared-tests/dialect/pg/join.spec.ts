import { describe, test } from "node:test"
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";
import { expectSQL } from "../../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

// PostgreSQL supports all join types.

describe("PostgreSQL join dialect support", () => {

    test("rightJoin IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .rightJoin("Post", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("fullJoin IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .fullJoin("Post", "authorId", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("rightJoinUnsafeTypeEnforced IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeTypeEnforced("Post", "id", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("fullJoinUnsafeTypeEnforced IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .fullJoinUnsafeTypeEnforced("Post", "id", "User.id")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")};`);
    });

    test("rightJoinUnsafeIgnoreType IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .rightJoinUnsafeIgnoreType("Post", "id", "User.email")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} RIGHT JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
    });

    test("fullJoinUnsafeIgnoreType IS available on PostgreSQL", () => {
        const sql = prisma.$from("User")
            .fullJoinUnsafeIgnoreType("Post", "id", "User.email")
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")};`);
    });
});

describe("rightJoin/fullJoin with where option (PostgreSQL only)", () => {

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

    test("fullJoin with where - positional", () => {
        const sql = prisma.$from("User")
            .fullJoin("Post", "authorId", "User.id", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("fullJoin with where - object syntax", () => {
        const sql = prisma.$from("User")
            .fullJoin({ table: "Post", src: "authorId", on: "User.id", where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
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

    test("fullJoinUnsafeTypeEnforced with where - positional", () => {
        const sql = prisma.$from("User")
            .fullJoinUnsafeTypeEnforced("Post", "id", "User.id", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.id")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });

    test("fullJoinUnsafeIgnoreType with where - positional", () => {
        const sql = prisma.$from("User")
            .fullJoinUnsafeIgnoreType("Post", "id", "User.email", { where: { "Post.published": false } })
            .getSQL();
        expectSQL(sql, `FROM ${dialect.quote("User")} FULL JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.id")} = ${dialect.quoteQualifiedColumn("User.email")} AND ${dialect.quoteQualifiedColumn("Post.published")} = false;`);
    });
});

describe("rightJoin/fullJoin nullability types (PostgreSQL only)", () => {

    test("rightJoin makes existing table fields nullable", () => {
        const q = prisma.$from("User").rightJoin("Post", "authorId", "User.id").select("User.name");
        type NameType = Awaited<ReturnType<typeof q.run>>[0]["name"];
        typeCheck({} as Expect<Equal<NameType, string | null>>);
    });

    test("fullJoin makes both existing and new table fields nullable", () => {
        const q = prisma.$from("User").fullJoin("Post", "authorId", "User.id").select("Post.title");
        type TitleType = Awaited<ReturnType<typeof q.run>>[0]["title"];
        typeCheck({} as Expect<Equal<TitleType, string | null>>);
    });

    test("fullJoin makes User fields nullable too", () => {
        const q = prisma.$from("User").fullJoin("Post", "authorId", "User.id").select("User.name");
        type NameType = Awaited<ReturnType<typeof q.run>>[0]["name"];
        typeCheck({} as Expect<Equal<NameType, string | null>>);
    });
});
