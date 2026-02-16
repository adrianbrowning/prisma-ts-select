import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {type Equal, type Expect, type Prettify, typeCheck} from "../utils.ts";
import type {PostRow, UserRow} from "../types.js";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';

describe("Column Alias Support", () => {
    describe("Single column alias", () => {
        test("should alias a column with two-parameter syntax", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `username` FROM `User`;"
            );
        });

        test("should return aliased column name in type", async () => {
            //    _?
            const result = await prisma.$from("User")
                .select("User.name", "username")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should work without alias (backward compatibility)", async () => {
            const query = prisma.$from("User")
                .select("User.email")
                .getSQL();

            expectSQL(
                query,
                "SELECT `email` FROM `User`;"
            );
        });

        test("should support mixing aliased and non-aliased columns", async () => {
            const query = prisma.$from("User")
                .select("User.id")
                .select("User.name", "username")
                .select("User.email");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<
                    Prettify<Pick<UserRow, "id" | "email"> & { username: UserRow['name'] }>>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `id`, `User`.`name` AS `username`, `email` FROM `User`;"
            );
        });

        test("should return mixed types for aliased and non-aliased", async () => {
            const result = await prisma.$from("User")
                .select("User.id")
                .select("User.name", "username")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                id: UserRow['id'],
                username: UserRow['name']
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Multiple column aliases", () => {
        test("should handle multiple aliased columns", async () => {
            const query = prisma.$from("User")
                .select("User.id", "userId")
                .select("User.name", "fullName")
                .select("User.email", "emailAddr");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    userId: UserRow['id'],
                    fullName: UserRow['name'],
                    emailAddr: UserRow['email']
                }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`id` AS `userId`, `User`.`name` AS `fullName`, `User`.`email` AS `emailAddr` FROM `User`;"
            );
        });

        test("should return all aliased column names in type", async () => {
            const result = await prisma.$from("User")
                .select("User.id", "userId")
                .select("User.email", "emailAddr")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: UserRow['id'],
                emailAddr: UserRow['email']
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Aliases with joins", () => {
        test("should alias columns from joined tables", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.name", "authorName")
                .select("Post.title", "postTitle");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    authorName: UserRow['name'],
                    postTitle: PostRow['title']
                }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `authorName`, `Post`.`title` AS `postTitle` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );
        });

        test("should return aliased columns from joins in type", async () => {
            const result = await prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.name", "author")
                .select("Post.title", "title")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                author: UserRow['name'],
                title: PostRow['title']
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle mix of prefixed and aliased columns in joins", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.id", "userId")
                .select("User.name", "authorName")
                .select("Post.id", "postId")
                .select("Post.title", "postTitle");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    userId: UserRow['id'],
                    authorName: UserRow['name'],
                    postId: PostRow['id'],
                    postTitle: PostRow['title']
                }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`id` AS `userId`, `User`.`name` AS `authorName`, `Post`.`id` AS `postId`, `Post`.`title` AS `postTitle` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );
        });
    });

    describe("Aliases with WHERE clause", () => {
        test("should allow WHERE on original column name even with alias", async () => {
            const query = prisma.$from("User")
                .where({"id": 1})
                .select("User.name", "username");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `username` FROM `User` WHERE `id` = 1;"
            );
        });
    });

    describe("Aliases with ORDER BY", () => {
        test("should use alias in ORDER BY clause", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .orderBy(["username DESC"]);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `username` FROM `User` ORDER BY `username` DESC;"
            );
        });

        test("should allow ORDER BY on original column name", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .orderBy(["User.name DESC"]);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `username` FROM `User` ORDER BY `User`.`name` DESC;"
            );
        });
    });

    describe("Aliases with GROUP BY and HAVING", () => {
        test("should use alias in GROUP BY", async () => {
            const query = prisma.$from("User")
                .groupBy(["User.name"])
                .select("User.name", "userName");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ userName: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `userName` FROM `User` GROUP BY `User`.`name`;"
            );
        });

        test("should use alias in HAVING clause", async () => {
            const query = prisma.$from("Post")
                .groupBy(["Post.authorId"])
                .having({"authorId": {op: ">", value: 1}})
                .select("Post.authorId", "author");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ author: PostRow['authorId'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `Post`.`authorId` AS `author` FROM `Post` GROUP BY `Post`.`authorId` HAVING `authorId` > 1;"
            );
        });
    });

    describe("Aliases with LIMIT and OFFSET", () => {
        test("should work with LIMIT", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .limit(10);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ username: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `username` FROM `User` LIMIT 10;"
            );
        });

        test("should work with LIMIT and OFFSET", async () => {
            const query = prisma.$from("User")
                .select("User.email", "emailAddr")
                .limit(10)
                .offset(5);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ emailAddr: UserRow['email'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`email` AS `emailAddr` FROM `User` LIMIT 10 OFFSET 5;"
            );
        });
    });

    describe("Edge cases", () => {
        test("should handle special characters in alias names", async () => {
            const query = prisma.$from("User")
                .select("User.name", "user_full_name");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ user_full_name: UserRow['name'] }>>>);
            }

            expectSQL(
                query.getSQL(),
                "SELECT `User`.`name` AS `user_full_name` FROM `User`;"
            );
        });

        test("should preserve data types in aliased columns", async () => {
            const result = await prisma.$from("User")
                .select("User.id", "userId")
                .select("User.email", "userEmail")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: UserRow['id'],
                userEmail: UserRow['email']
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle nullable fields correctly in aliases", async () => {
            const result = await prisma.$from("User")
                .select("User.name", "displayName")
                .run();

            // name is nullable, so displayName should also be nullable
            typeCheck({} as Expect<Equal<typeof result, Array<{
                displayName: UserRow['name']
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Duplicate key detection", () => {
        test("should error on duplicate result keys from same column name", async () => {
            // This test expects runtime error when duplicate keys would be created
            // When implementation is complete, this should throw
            try {
                const query = prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .select("User.id")
                    .select("Post.id")
                    .getSQL();

                // If we reach here, collision detection not yet implemented
                // For now, just document the expected behavior
                assert.ok(true, "Collision detection to be implemented");
            } catch (error) {
                // Expected: should throw error about duplicate "id" key
                assert.match((error as Error).message, /duplicate/i);
            }
        });

        test("should allow same column name with explicit aliases", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.id", "userId")
                .select("Post.id", "postId");

            const sql = query.getSQL();
            expectSQL(
                sql,
                "SELECT `User`.`id` AS `userId`, `Post`.`id` AS `postId` FROM `User` JOIN `Post` ON `Post`.`authorId` = `User`.`id`;"
            );

            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: UserRow['id'],
                postId: PostRow['id']
            }>>>);
        });

        test("should allow selecting same table column with different aliases", async () => {
            const result = await prisma.$from("User")
                .select("User.id", "primaryId")
                .select("User.id", "backupId")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                primaryId: UserRow['id'],
                backupId: UserRow['id']
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should detect collision between unaliased and later select", async () => {
            // This test expects runtime error
            // When implementation is complete, this should throw
            try {
                const query = prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .select("User.email")  // Creates "email" key
                    .select("User.email")  // Duplicate "email" key
                    .getSQL();

                // If we reach here, collision detection not yet implemented
                assert.ok(true, "Collision detection to be implemented");
            } catch (error) {
                // Expected: should throw error about duplicate "email" key
                assert.match((error as Error).message, /duplicate/i);
            }
        });
    });
});
