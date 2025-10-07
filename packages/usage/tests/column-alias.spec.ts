import {describe, test} from "node:test";
import assert from "node:assert/strict";
import tsSelectExtend from 'prisma-ts-select/extend';
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, typeCheck} from "./utils.ts";

const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

describe("Column Alias Support", () => {
    describe("Single column alias", () => {
        test("should alias a column with two-parameter syntax", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `username` FROM User;"
            );
        });

        test("should return aliased column name in type", async () => {
            //    _?
            const result = await prisma.$from("User")
                .select("User.name", "username")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{ username: string | null }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should work without alias (backward compatibility)", async () => {
            const query = prisma.$from("User")
                .select("User.email")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.email FROM User;"
            );
        });

        test("should support mixing aliased and non-aliased columns", async () => {
            const query = prisma.$from("User")
                .select("User.id")
                .select("User.name", "username")
                .select("User.email")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.id, User.name AS `username`, User.email FROM User;"
            );
        });

        test("should return mixed types for aliased and non-aliased", async () => {
            const result = await prisma.$from("User")
                .select("User.id")
                .select("User.name", "username")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                id: number,
                username: string | null
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Multiple column aliases", () => {
        test("should handle multiple aliased columns", async () => {
            const query = prisma.$from("User")
                .select("User.id", "userId")
                .select("User.name", "fullName")
                .select("User.email", "emailAddr")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.id AS `userId`, User.name AS `fullName`, User.email AS `emailAddr` FROM User;"
            );
        });

        test("should return all aliased column names in type", async () => {
            const result = await prisma.$from("User")
                .select("User.id", "userId")
                .select("User.email", "emailAddr")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: number,
                emailAddr: string
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Aliases with joins", () => {
        test("should alias columns from joined tables", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.name", "authorName")
                .select("Post.title", "postTitle")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `authorName`, Post.title AS `postTitle` FROM User JOIN Post ON authorId = User.id;"
            );
        });

        test("should return aliased columns from joins in type", async () => {
            const result = await prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.name", "author")
                .select("Post.title", "title")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                author: string | null,
                title: string
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle mix of prefixed and aliased columns in joins", async () => {
            const query = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("User.id")
                .select("User.name", "authorName")
                .select("Post.id")
                .select("Post.title", "postTitle")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.id, User.name AS `authorName`, Post.id, Post.title AS `postTitle` FROM User JOIN Post ON authorId = User.id;"
            );
        });
    });

    describe("Aliases with WHERE clause", () => {
        test("should allow WHERE on original column name even with alias", async () => {
            const query = prisma.$from("User")
                .where({"User.id": 1})
                .select("User.name", "username")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `username` FROM User WHERE (User.id = 1 );"
            );
        });
    });

    describe("Aliases with ORDER BY", () => {
        test("should use alias in ORDER BY clause", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .orderBy(["username DESC"])
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `username` FROM User ORDER BY username DESC;"
            );
        });

        test("should allow ORDER BY on original column name", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .orderBy(["User.name DESC"])
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `username` FROM User ORDER BY User.name DESC;"
            );
        });
    });

    describe("Aliases with GROUP BY and HAVING", () => {
        test("should use alias in GROUP BY", async () => {
            const query = prisma.$from("User")
                .groupBy(["User.name"])
                .select("User.name", "userName")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `userName` FROM User GROUP BY User.name;"
            );
        });

        test("should use alias in HAVING clause", async () => {
            const query = prisma.$from("Post")
                .groupBy(["Post.authorId"])
                .having({"Post.authorId": {op: ">", value: 1}})
                .select("Post.authorId", "author")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT Post.authorId AS `author` FROM Post GROUP BY Post.authorId HAVING (Post.authorId > 1 );"
            );
        });
    });

    describe("Aliases with LIMIT and OFFSET", () => {
        test("should work with LIMIT", async () => {
            const query = prisma.$from("User")
                .select("User.name", "username")
                .limit(10)
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `username` FROM User LIMIT 10;"
            );
        });

        test("should work with LIMIT and OFFSET", async () => {
            const query = prisma.$from("User")
                .select("User.email", "emailAddr")
                .limit(10)
                .offset(5)
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.email AS `emailAddr` FROM User LIMIT 10 OFFSET 5;"
            );
        });
    });

    describe("Edge cases", () => {
        test("should handle special characters in alias names", async () => {
            const query = prisma.$from("User")
                .select("User.name", "user_full_name")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name AS `user_full_name` FROM User;"
            );
        });

        test("should preserve data types in aliased columns", async () => {
            const result = await prisma.$from("User")
                .select("User.id", "userId")
                .select("User.email", "userEmail")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                userId: number,
                userEmail: string
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle nullable fields correctly in aliases", async () => {
            const result = await prisma.$from("User")
                .select("User.name", "displayName")
                .run();

            // name is nullable, so displayName should also be nullable
            typeCheck({} as Expect<Equal<typeof result, Array<{
                displayName: string | null
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });
});
