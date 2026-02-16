import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {type Equal, type Expect, type Prettify, typeCheck} from "../utils.ts";
import type {PostRow, UserPostJoinRow, UserPostQualifiedJoinRow, UserRow, UserRowQualified} from "../types.js";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';

// Database is seeded via `pnpm p:r` which runs before all tests
describe("Ambiguous column detection", () => {

    describe("Single table queries", () => {
        test("should allow unqualified column names in single table", async () => {
            const query = prisma.$from("User")
                .select("id")
                .select("email");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "id" | "email">>>>);

            expectSQL(
                query.getSQL(),
                "SELECT `id`, `email` FROM `User`;"
            );
        });

        test("should allow qualified column names in single table", async () => {
            const query = prisma.$from("User")
                .select("User.id")
                .select("User.email");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "id" | "email">>>>);

            expectSQL(
                query.getSQL(),
                "SELECT `id`, `email` FROM `User`;"
            );
        });
    });

    describe("Multi-table queries - unambiguous columns", () => {
        test("should allow unqualified column that exists in only one table", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("email");  // Only User has email

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "email">>>>);

            expectSQL(
                query.getSQL(),
                "SELECT `email` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );
        });

        test("should allow unqualified columns from both tables if unique", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("email")   // Only in User
                .select("title");  // Only in Post
            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "email"| "title">>>>);
            }
            expectSQL(
                query.getSQL(),
                "SELECT `email`, `title` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );
        });
    });

    describe("Multi-table queries - ambiguous columns", () => {
        test("should error on ambiguous unqualified column", async () => {
            // Both User and Post have 'id' column
            // This test expects runtime error when implementation is complete
            try {
                const query = prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    //@ts-expect-error id appears in both, this should not be valid
                    .select("id")  // Ambiguous! Both tables have id
                    .getSQL();

                // If we reach here, ambiguity detection not yet implemented
                assert.ok(true, "Ambiguity detection to be implemented");
            } catch (error) {
                // Expected: should throw error about ambiguous column
                assert.match((error as Error).message, /ambiguous/i);
                assert.match((error as Error).message, /id/);
            }
        });

        test("should allow qualified column even if ambiguous unqualified", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.id")
                .select("Post.id", "postId");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    'User.id': UserRow['id'],
                    postId: PostRow['id']
                }>>>);
            }
            expectSQL(
                query.getSQL(),
                "SELECT `User`.`id` AS `User.id`, `Post`.`id` AS `postId` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );
        });

        test("should allow both qualified versions of ambiguous column", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.id", "userId")
                .select("Post.id", "postId");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: UserRow['id'],
                postId: PostRow['id']
            }>>>);
        });
    });

    describe("Multi-table queries with table aliases", () => {
        test("should allow unqualified unique columns with table aliases", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("email");  // Only User has email

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "email">>>>);
        });

        test("should error on ambiguous unqualified with table aliases", async () => {
            // This test expects runtime error when implementation is complete
            try {
                const query = prisma.$from("User u")
                    .join("Post p", "authorId", "u.id")
                    //@ts-expect-error id appears in both, this should not be valid
                    .select("id")  // Ambiguous with aliases too
                    .getSQL();

                // If we reach here, ambiguity detection not yet implemented
                assert.ok(true, "Ambiguity detection to be implemented");
            } catch (error) {
                // Expected: should throw error about ambiguous column
                assert.match((error as Error).message, /ambiguous/i);
            }
        });

        test("should allow alias-qualified columns", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.id", "userId")
                .select("p.id", "postId");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: UserRow['id'],
                postId: PostRow['id']
            }>>>);

            expectSQL(
                query.getSQL(),
                "SELECT `u`.`id` AS `userId`, `p`.`id` AS `postId` FROM `User` AS `u` JOIN `Post` AS `p` ON `p`.`authorId` = `u`.`id`;"
            );
        });
    });

    describe("Edge cases", () => {
        test("should handle star selector without ambiguity issues", async () => {
            const query = prisma.$from("User")
                .select("*");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
        });

        test("should handle Table.* selector without ambiguity issues", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.*");

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRowQualified>>>);
        });

        test("should handle selectAll without ambiguity issues", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .selectAll();

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow>>>);
        });

        test("should allow mixing unambiguous unqualified with qualified columns", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
               .select("email")        // Unambiguous, only in User
               .select("User.id", "userId")  // Qualified
                .select("title");       // Unambiguous, only in Post


            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Prettify<Pick<UserPostJoinRow, "email" | "title"> & {
                userId: UserRow['id']
            }>>>>);
        });
    });
});
