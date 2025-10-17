import {describe, test} from "node:test";
import assert from "node:assert/strict";
import tsSelectExtend from 'prisma-ts-select/extend';
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, typeCheck} from "./utils.ts";

const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

describe("Table Alias Support", () => {
    describe("Single table alias with FROM", () => {
        test("should alias a table with two-parameter syntax", async () => {
            const query = prisma.$from("User u")
                .select("u.name")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name FROM User AS u;"
            );
        });

        test("should allow using alias in WHERE clause", async () => {
            const query = prisma.$from("User u")
                .where({"u.id": 1})
                .select("u.name")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name FROM User AS u WHERE (u.id = 1 );"
            );
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

        test("should support mixing aliased table with ORDER BY", async () => {
            const query = prisma.$from("User u")
                .select("u.name")
                .orderBy(["u.name DESC"])
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name FROM User AS u ORDER BY u.name DESC;"
            );
        });

        test("should return correct types with alias", async () => {
            //     _?
            const result = await prisma.$from("User u")
                .select("name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{ name: string | null }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should return correct types with alias", async () => {
            //     _?
            const result = await prisma.$from("User u")
                .select("u.name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{ "u.name": string | null }>>>);
            assert.ok(Array.isArray(result));
        });

    });

    describe("Table aliases with joins", () => {
        test("should alias both tables in a join (positional syntax)", async () => {
            const query = prisma.$from("User u")
                // _?
                .join("Post p", "authorId", "u.id")
                .select("u.name")
                .select("p.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name, p.title FROM User AS u JOIN Post AS p ON authorId = u.id;"
            );
        });

        test("should alias both tables in a join (object syntax)", async () => {
            const query = prisma.$from("User u")
                .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
                .select("u.name")
                .select("p.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name, p.title FROM User AS u JOIN Post AS p ON authorId = u.id;"
            );
        });

        test("should handle alias in base table only", async () => {
            const query = prisma.$from("User u")
                .join("Post", "authorId", "u.id")
                .select("u.name")
                .select("Post.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name, Post.title FROM User AS u JOIN Post ON authorId = u.id;"
            );
        });

        test("should handle alias in joined table only", async () => {
            const query = prisma.$from("User")
                .join("Post p", "authorId", "User.id")
                .select("User.name")
                .select("p.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name, p.title FROM User JOIN Post AS p ON authorId = User.id;"
            );
        });

        test("should support object syntax without alias", async () => {
            const query = prisma.$from("User")
                .join({table: "Post", src: "authorId", on: "User.id"})
                .select("User.name")
                .select("Post.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT User.name, Post.title FROM User JOIN Post ON authorId = User.id;"
            );
        });

        test("should support self-join with different aliases", async () => {
            const query = prisma.$from("User u1")
                .joinUnsafeTypeEnforced("User u2", "id", "u1.id")
                .select("u1.name", "user1Name")
                .select("u2.name", "user2Name")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u1.name AS `user1Name`, u2.name AS `user2Name` FROM User AS u1 JOIN User AS u2 ON User.id = u1.id;"
            );
        });

        test("should return correct types with aliased joins", async () => {
            const result = await prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.name")
                .select("p.title")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                name: string | null,
                title: string
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });

    describe("Table aliases with WHERE on joins", () => {
        test("should use aliases in WHERE clause with joins", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .where({
                    "u.id": 1
                })
                .select("u.name")
                .select("p.title")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name, p.title FROM User AS u JOIN Post AS p ON authorId = u.id WHERE (u.id = 1 );"
            );
        });
    });

    describe("Table aliases with GROUP BY and HAVING", () => {
        test("should use aliases in GROUP BY", async () => {
            const query = prisma.$from("Post p")
                .groupBy(["p.authorId"])
                .select("p.authorId")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT p.authorId FROM Post AS p GROUP BY p.authorId;"
            );
        });

        test("should use aliases in HAVING clause", async () => {
            const query = prisma.$from("Post p")
                .groupBy(["p.authorId"])
                .having({"p.authorId": {op: ">", value: 1}})
                .select("p.authorId")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT p.authorId FROM Post AS p GROUP BY p.authorId HAVING (p.authorId > 1 );"
            );
        });
    });

    describe("Table aliases with LIMIT and OFFSET", () => {
        test("should work with LIMIT", async () => {
            const query = prisma.$from("User u")
                .select("u.name")
                .limit(10)
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name FROM User AS u LIMIT 10;"
            );
        });

        test("should work with LIMIT and OFFSET", async () => {
            const query = prisma.$from("User u")
                .select("u.email")
                .limit(10)
                .offset(5)
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.email FROM User AS u LIMIT 10 OFFSET 5;"
            );
        });
    });

    describe("Table.* with aliases", () => {
        test("should expand Table.* using alias", async () => {
            const query = prisma.$from("User u")
                .select("u.*")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.id, u.email, u.name FROM User AS u;"
            );
        });

        test("should expand multiple Table.* with aliases in joins", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.*")
                .select("p.*")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.id AS `u.id`, u.email AS `u.email`, u.name AS `u.name`, p.id AS `p.id`, p.title AS `p.title`, p.content AS `p.content`, p.published AS `p.published`, p.authorId AS `p.authorId`, p.lastModifiedById AS `p.lastModifiedById` FROM User AS u JOIN Post AS p ON authorId = u.id;"
            );
        });
    });

    describe("Edge cases", () => {
        test("should handle aliases with column aliases", async () => {
            const query = prisma.$from("User u")
                .select("u.name", "userName")
                .getSQL();

            assert.strictEqual(
                query,
                "SELECT u.name AS `userName` FROM User AS u;"
            );
        });

        test("should preserve data types with aliases", async () => {
            const result = await prisma.$from("User u")
                .select("u.id")
                .select("u.email")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                id: number,
                email: string
            }>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle nullable fields correctly with aliases", async () => {
            const result = await prisma.$from("User u")
                .select("u.name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<{
                name: string | null
            }>>>);
            assert.ok(Array.isArray(result));
        });
    });
});
