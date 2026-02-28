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
