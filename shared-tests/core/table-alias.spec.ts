import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {type Equal, type Expect, typeCheck} from "../utils.ts";
import type {
    EmployeeRow,
    PostRow,
    UserPostJoinRow,
    UserPostQualifiedJoinRow,
    UserRow,
    UserRowQualified
} from "../types.js";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("Table Alias Support", () => {
    describe("Single table alias with FROM", () => {
        test("should alias a table with two-parameter syntax", async () => {
            const query = prisma.$from("User u")
                .select("u.name");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "name">>>>);
            }

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} WHERE ${dialect.quote("id")} = 1;`
            );
        });

        test("should work without alias (backward compatibility)", async () => {
            const query = prisma.$from("User")
                .select("User.email");

            {
                const result = await query.run();
                typeCheck({} as Expect<Equal<typeof result, Array<Pick<UserRow, "email">>>>);
            }

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("email")} FROM ${dialect.quote("User")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} ORDER BY ${dialect.quoteOrderByClause("u.name DESC")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} JOIN ${dialect.quote("Post")} AS ${dialect.quote("p", true)} ON ${dialect.quoteQualifiedColumn("p.authorId")} = ${dialect.quoteQualifiedColumn("u.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} JOIN ${dialect.quote("Post")} AS ${dialect.quote("p", true)} ON ${dialect.quoteQualifiedColumn("p.authorId")} = ${dialect.quoteQualifiedColumn("u.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("u.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} AS ${dialect.quote("p", true)} ON ${dialect.quoteQualifiedColumn("p.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
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


            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quoteQualifiedColumn("e1.name")} AS ${dialect.quote("employeeName", true)}, ${dialect.quoteQualifiedColumn("e2.name")} AS ${dialect.quote("managerName", true)} FROM ${dialect.quote("Employee")} AS ${dialect.quote("e1", true)} JOIN ${dialect.quote("Employee")} AS ${dialect.quote("e2", true)} ON ${dialect.quoteQualifiedColumn("e2.managerId")} = ${dialect.quoteQualifiedColumn("e1.id")};`
            );
        });

        test("should support self-join with different aliases using .joinUnsafeTypeEnforced()", async () => {
            const query = prisma.$from("Employee e1")
                .joinUnsafeTypeEnforced("Employee e2", "id", "e1.id")
                .select("e1.name", "employee1Name")
                .select("e2.name", "employee2Name");



            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quoteQualifiedColumn("e1.name")} AS ${dialect.quote("employee1Name", true)}, ${dialect.quoteQualifiedColumn("e2.name")} AS ${dialect.quote("employee2Name", true)} FROM ${dialect.quote("Employee")} AS ${dialect.quote("e1", true)} JOIN ${dialect.quote("Employee")} AS ${dialect.quote("e2", true)} ON ${dialect.quoteQualifiedColumn("e2.id")} = ${dialect.quoteQualifiedColumn("e1.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} JOIN ${dialect.quote("Post")} AS ${dialect.quote("p", true)} ON ${dialect.quoteQualifiedColumn("p.authorId")} = ${dialect.quoteQualifiedColumn("u.id")} WHERE ${dialect.quoteQualifiedColumn("u.id")} = 1;`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("authorId")} FROM ${dialect.quote("Post")} AS ${dialect.quote("p", true)} GROUP BY ${dialect.quoteQualifiedColumn("p.authorId")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("authorId")} FROM ${dialect.quote("Post")} AS ${dialect.quote("p", true)} GROUP BY ${dialect.quoteQualifiedColumn("p.authorId")} HAVING ${dialect.quote("authorId")} > 1;`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} LIMIT 10;`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("email")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} LIMIT 10 OFFSET 5;`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quote("id")}, ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)};`
            );
        });

        test("should expand multiple Table.* with aliases in joins", async () => {
            const query = prisma.$from("User u")
                .join("Post p", "authorId", "u.id")
                .select("u.*")
                .select("p.*");



            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quoteQualifiedColumn("u.id")} AS ${dialect.quote("u.id", true)}, ${dialect.quoteQualifiedColumn("u.email")} AS ${dialect.quote("u.email", true)}, ${dialect.quoteQualifiedColumn("u.name")} AS ${dialect.quote("u.name", true)}, ${dialect.quoteQualifiedColumn("u.age")} AS ${dialect.quote("u.age", true)}, ${dialect.quoteQualifiedColumn("p.id")} AS ${dialect.quote("p.id", true)}, ${dialect.quoteQualifiedColumn("p.title")} AS ${dialect.quote("p.title", true)}, ${dialect.quoteQualifiedColumn("p.content")} AS ${dialect.quote("p.content", true)}, ${dialect.quoteQualifiedColumn("p.published")} AS ${dialect.quote("p.published", true)}, ${dialect.quoteQualifiedColumn("p.authorId")} AS ${dialect.quote("p.authorId", true)}, ${dialect.quoteQualifiedColumn("p.lastModifiedById")} AS ${dialect.quote("p.lastModifiedById", true)} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} JOIN ${dialect.quote("Post")} AS ${dialect.quote("p", true)} ON ${dialect.quoteQualifiedColumn("p.authorId")} = ${dialect.quoteQualifiedColumn("u.id")};`
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

            expectSQL(
                query.getSQL(),
                `SELECT ${dialect.quoteQualifiedColumn("u.name")} AS ${dialect.quote("userName", true)} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)};`
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
