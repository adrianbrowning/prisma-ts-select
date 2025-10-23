import {describe, test} from "node:test";
import assert from "node:assert/strict";
import tsSelectExtend from 'prisma-ts-select/extend';
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, type Prettify, typeCheck} from "../utils.ts";
import type {
    EmployeeRow,
    PostRow,
    UserPostJoinRow,
    UserPostQualifiedJoinRow,
    UserRow,
    UserRowQualified
} from "../types.js";

const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

describe("Table Alias Support", () => {
    describe("Single table alias with FROM", () => {
        test("should alias a table with two-parameter syntax", async () => {
            const query = prisma.$from("User u")
                .select("u.name");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name FROM User AS `u`;"
            );
        });

        test("should allow using alias in WHERE clause", async () => {
            const query = prisma.$from("User u")
                .where({"id": 1})
                .select("u.name");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name FROM User AS `u` WHERE (id = 1 );"
            );
        });

        test("should work without alias (backward compatibility)", async () => {
            const query = prisma.$from("User")
                .select("User.email");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "email">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT email FROM User;"
            );
        });

        test("should support mixing aliased table with ORDER BY", async () => {
            const query = prisma.$from("User u")
                .select("u.name")
                .orderBy(["u.name DESC"]);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name FROM User AS `u` ORDER BY u.name DESC;"
            );
        });

        test("should return correct types with alias", async () => {
            const result = await prisma.$from("User u")
                .select("name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            assert.ok(Array.isArray(result));
        });

        test("should return correct types with alias", async () => {
            //     _?
            const result = await prisma.$from("User u")
                .select("u.name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            assert.ok(Array.isArray(result));
        });

    });

    describe("Table aliases with joins", () => {
        test("should alias both tables in a join (positional syntax)", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.name")
                .select("p.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name"| "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;"
            );
        });

        test("should alias both tables in a join (object syntax)", async () => {
            const query = prisma.$from("User u")
                .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
                .select("u.name")
                .select("p.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name"| "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;"
            );
        });

        test("should handle alias in base table only", async () => {
            const query = prisma.$from("User u")
                .join("Post", "authorId", "u.id")
                .select("u.name")
                .select("Post.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name"| "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User AS `u` JOIN Post ON Post.authorId = u.id;"
            );
        });

        test("should handle alias in joined table only", async () => {
            const query = prisma.$from("User")
                .join("Post p", "authorId", "User.id")
                .select("User.name")
                .select("p.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name"| "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User JOIN Post AS `p` ON p.authorId = User.id;"
            );
        });

        test("should support object syntax without alias", async () => {
            const query = prisma.$from("User")
                .join({table: "Post", src: "authorId", on: "User.id"})
                .select("User.name")
                .select("Post.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name"| "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User JOIN Post ON Post.authorId = User.id;"
            );
        });

        test("should support self-join with different aliases using .join()", async () => {
            const query = prisma.$from("Employee e1")
                .join("Employee e2", "managerId", "e1.id")
                .select("e1.name", "employeeName")
                .select("e2.name", "managerName");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    "employeeName": EmployeeRow["name"];
                    "managerName": EmployeeRow["name"];
                }>>>);

            }


            assert.strictEqual(
                query.getSQL(),
                "SELECT e1.name AS `employeeName`, e2.name AS `managerName` FROM Employee AS `e1` JOIN Employee AS `e2` ON e2.managerId = e1.id;"
            );
        });

        test("should support self-join with different aliases using .joinUnsafeTypeEnforced()", async () => {
            const query = prisma.$from("Employee e1")
                .joinUnsafeTypeEnforced("Employee e2", "id", "e1.id")
                .select("e1.name", "employee1Name")
                .select("e2.name", "employee2Name");



            assert.strictEqual(
                query.getSQL(),
                "SELECT e1.name AS `employee1Name`, e2.name AS `employee2Name` FROM Employee AS `e1` JOIN Employee AS `e2` ON e2.id = e1.id;"
            );

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{
                    "employee1Name": EmployeeRow["name"];
                    "employee2Name": EmployeeRow["name"];
                }>>>);
            }


        });

        test("should return correct types with aliased joins", async () => {
            const result = await prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.name")
                .select("p.title")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name" | "title">>>>);
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
                .select("p.title");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserPostJoinRow, "name" | "title">>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id WHERE (u.id = 1 );"
            );
        });
    });

    describe("Table aliases with GROUP BY and HAVING", () => {
        test("should use aliases in GROUP BY", async () => {
            const query = prisma.$from("Post p")
                .groupBy(["p.authorId"])
                .select("p.authorId");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ "authorId": PostRow['authorId'] }>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT authorId FROM Post AS `p` GROUP BY p.authorId;"
            );
        });

        test("should use aliases in HAVING clause", async () => {
            const query = prisma.$from("Post p")
                .groupBy(["p.authorId"])
                .having({"authorId": {op: ">", value: 1}})
                .select("p.authorId");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ "authorId": PostRow['authorId'] }>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT authorId FROM Post AS `p` GROUP BY p.authorId HAVING (authorId > 1 );"
            );
        });
    });

    describe("Table aliases with LIMIT and OFFSET", () => {
        test("should work with LIMIT", async () => {
            const query = prisma.$from("User u")
                .select("u.name")
                .limit(10);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ "name": UserRow['name'] }>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT name FROM User AS `u` LIMIT 10;"
            );
        });

        test("should work with LIMIT and OFFSET", async () => {
            const query = prisma.$from("User u")
                .select("u.email")
                .limit(10)
                .offset(5);

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ "email": UserRow['email'] }>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT email FROM User AS `u` LIMIT 10 OFFSET 5;"
            );
        });
    });

    describe("Table.* with aliases", () => {
        test("should expand Table.* using alias", async () => {
            const query = prisma.$from("User u")
                .select("u.*");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<UserRowQualified<'u'>>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT id, email, name, age FROM User AS `u`;"
            );
        });

        test("should expand multiple Table.* with aliases in joins", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.*")
                .select("p.*");



            assert.strictEqual(
                query.getSQL(),
                "SELECT u.id AS `u.id`, u.email AS `u.email`, u.name AS `u.name`, u.age AS `u.age`, p.id AS `p.id`, p.title AS `p.title`, p.content AS `p.content`, p.published AS `p.published`, p.authorId AS `p.authorId`, p.lastModifiedById AS `p.lastModifiedById` FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;"
            );
            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow<'u', 'p'>>>>);
            }
        });
    });

    describe("Edge cases", () => {
        test("should handle aliases with column aliases", async () => {
            const query = prisma.$from("User u")
                .select("u.name", "userName");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<{ "userName": UserRow["name"] }>>>);
            }

            assert.strictEqual(
                query.getSQL(),
                "SELECT u.name AS `userName` FROM User AS `u`;"
            );
        });

        test("should preserve data types with aliases", async () => {
            const result = await prisma.$from("User u")
                .select("u.id")
                .select("u.email")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow,"id" | "email">>>>);
            assert.ok(Array.isArray(result));
        });

        test("should handle nullable fields correctly with aliases", async () => {
            const result = await prisma.$from("User u")
                .select("u.name")
                .run();

            typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow,'name'>>>>);
            assert.ok(Array.isArray(result));
        });
    });
});
