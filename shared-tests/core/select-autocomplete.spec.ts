import {describe, test} from "node:test";
import { prisma } from '#client';

describe("Select autocomplete validation (issue #120)", () => {

    describe("Valid selections - should compile", () => {
        test("qualified Table.field", () => {
            prisma.$from("User").select("User.id");
            prisma.$from("User").select("User.email");
            prisma.$from("User").select("User.name");
        });

        test("wildcard patterns", () => {
            prisma.$from("User").select("*");
            prisma.$from("User").select("User.*");
        });

        test("unqualified unambiguous column (single table)", () => {
            prisma.$from("User").select("id");
            prisma.$from("User").select("email");
        });

        test("qualified columns in multi-table join", () => {
            const q = prisma.$from("User").join("Post", "authorId", "User.id");
            q.select("User.id");
            q.select("Post.title");
            q.select("Post.*");
        });

        test("unambiguous unqualified in join", () => {
            const q = prisma.$from("User").join("Post", "authorId", "User.id");
            q.select("email");  // only User has email
            q.select("title");  // only Post has title
        });

        test("with alias", () => {
            prisma.$from("User").select("User.id", "userId");
            prisma.$from("User").select("*", "all");
        });
    });

    describe("Invalid selections - type errors (compile-time only)", () => {
        test("invalid table/field/column are rejected", () => {
            // Dead branch — never executes at runtime but tsc still type-checks it
            if (false as boolean) {
                // @ts-expect-error - InvalidTable does not exist
                prisma.$from("User").select("InvalidTable.id");
                // @ts-expect-error - User has no 'nonExistent' field
                prisma.$from("User").select("User.nonExistent");
                // @ts-expect-error - no table has 'fakeColumn'
                prisma.$from("User").select("fakeColumn");
                // @ts-expect-error - 'id' exists in both User and Post
                prisma.$from("User").join("Post", "authorId", "User.id").select("id");
                // @ts-expect-error - User has no 'fake' field
                prisma.$from("User").select("User.fake", "alias");
            }
        });
    });
});
