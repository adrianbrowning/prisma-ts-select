import { describe, test } from "node:test"
import { prisma } from '#client';

// SQLite does not support RIGHT JOIN or FULL JOIN.
// These tests verify that those methods are NOT available on the type level.

describe("SQLite join dialect enforcement", () => {

    test("rightJoin is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error rightJoin is not supported on SQLite
            .rightJoin("Post", "authorId", "User.id");
    });

    test("rightJoinUnsafeTypeEnforced is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error rightJoinUnsafeTypeEnforced is not supported on SQLite
            .rightJoinUnsafeTypeEnforced("Post", "id", "User.id");
    });

    test("rightJoinUnsafeIgnoreType is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error rightJoinUnsafeIgnoreType is not supported on SQLite
            .rightJoinUnsafeIgnoreType("Post", "id", "User.email");
    });

    test("fullJoin is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoin is not supported on SQLite
            .fullJoin("Post", "authorId", "User.id");
    });

    test("fullJoinUnsafeTypeEnforced is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoinUnsafeTypeEnforced is not supported on SQLite
            .fullJoinUnsafeTypeEnforced("Post", "id", "User.id");
    });

    test("fullJoinUnsafeIgnoreType is not available on SQLite", () => {
        prisma.$from("User")
            //@ts-expect-error fullJoinUnsafeIgnoreType is not supported on SQLite
            .fullJoinUnsafeIgnoreType("Post", "id", "User.email");
    });

    test("rightJoin not available after another join on SQLite", () => {
        prisma.$from("User")
            .innerJoin("Post", "authorId", "User.id")
            //@ts-expect-error rightJoin is not supported on SQLite
            .rightJoin("LikedPosts", "authorId", "User.id");
    });
});
