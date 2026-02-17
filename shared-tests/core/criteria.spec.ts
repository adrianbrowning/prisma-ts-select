import assert from "node:assert/strict"
import {describe, it} from "node:test"
import {type Equal, type Expect, typeCheck} from "../utils.ts";
import type {PostRow, UserPostQualifiedJoinRow, UserRow} from "../types.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';

describe("where", () => {

    describe("Where Criteria Object", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({
                    $NOR: [
                        {
                            "User.name": {
                                op: "LIKE",
                                value: "something"
                            }
                        },
                        {
                            "User.name": {
                                op: "LIKE",
                                value: "something else"
                            }
                        }
                    ],
                    $NOT: [{
                        $OR: [{
                            "User.id": 2
                        }]
                    }],
                    $AND: [
                        {
                            "User.id": 1,
                            "Post.id": 1
                        },
                    ],
                    $OR: [
                        {
                            "User.id": 2,
                        },
                        {
                            "Post.content": {
                                op: "IS NOT NULL"
                            }
                        }
                    ]
                })
                .selectAll();
        }

        function createQuery2() {

            prisma.$from("User")
                .where({
                    //@ts-expect-error 1 should not be allowed
                    "name": 1,
                    //@ts-expect-error 1 should not be allowed
                    "email": {
                        op: "LIKE",
                        value: 1
                    },
                    //@ts-expect-error string should not be allowed
                     "age": ""
                });

            prisma.$from("User")
                .where({

                    "name": "",
                    "email": {
                        op: "LIKE",
                        value: ""
                    },
                    "age": 1
                });

            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereNotNull("User.name");


        }

        it("should run", async () => {
            const result = await createQuery().run();
            createQuery2().getSQL(true)

            typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow>>>);

            const expected: Array<UserPostQualifiedJoinRow> =  [
                   {
                     'Post.authorId': 1,
                     'Post.content': 'Something',
                     'Post.id': 1,
                     'Post.lastModifiedById': 1,
                     'Post.published': false,
                     'Post.title': 'Blog 1',
                     'User.email': 'johndoe@example.com',
                     'User.id': 1,
                     'User.name': 'John Doe',
                      'User.age':25,
               }
             ];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery()
                .getSQL();

            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE (NOT(${dialect.quoteQualifiedColumn("User.name")} LIKE 'something' OR ${dialect.quoteQualifiedColumn("User.name")} LIKE 'something else')) AND (NOT((${dialect.quoteQualifiedColumn("User.id")} = 2))) AND ((${dialect.quoteQualifiedColumn("User.id")} = 1 AND ${dialect.quoteQualifiedColumn("Post.id")} = 1)) AND (${dialect.quoteQualifiedColumn("User.id")} = 2 OR ${dialect.quoteQualifiedColumn("Post.content")} IS NOT NULL);`;

            expectSQL(sql, expectedSQL);
        });


    });

    describe("Where Raw", () => {

        const rawWhere = dialect.name === "postgresql"
            ? `("User"."id" = 1 AND "Post"."id" = 1) OR ("User"."id" = 2 OR "Post"."content" IS NOT NULL)`
            : "(User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL)";

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereRaw(rawWhere)
                .selectAll();
        }

        it("should run", async () => {
            const result = await createQuery().run();

            typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow>>>);

            const expected: Array<UserPostQualifiedJoinRow> = [
                {
                  'Post.authorId': 1,
                  'Post.content': 'Something',
                  'Post.id': 1,
                  'Post.lastModifiedById': 1,
                  'Post.published': false,
                  'Post.title': 'Blog 1',
                  'User.email': 'johndoe@example.com',
                  'User.id': 1,
                  'User.name': 'John Doe',
                    'User.age':25,
            },
            {
              'Post.authorId': 1,
                  'Post.content': 'sql',
                  'Post.id': 2,
                  'Post.lastModifiedById': 1,
                  'Post.published': false,
                  'Post.title': 'blog 2',
                  'User.email': 'johndoe@example.com',
                  'User.id': 1,
                  'User.name': 'John Doe',
                'User.age':25,
            },
            {
              'Post.authorId': 2,
                  'Post.content': null,
                  'Post.id': 3,
                  'Post.lastModifiedById': 2,
                  'Post.published': false,
                  'Post.title': 'blog 3',
                  'User.email': 'smith@example.com',
                  'User.id': 2,
                  'User.name': 'John Smith',
                  'User.age':30,
            }
             ];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE ${rawWhere};`;
            expectSQL(sql, expectedSQL);
        });

    });

    describe("Where NULL - Type Narrowing", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereNotNull("Post.content")
                .whereIsNull("User.name")
                .select("name")
                .select("Post.content");
        }

        it("should run", async () => {
            const result = await createQuery().run();

            type TExpected = Array<{
                "name": Exclude<UserRow['name'], string>;
                "content": Exclude<PostRow['content'], null>;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT ${dialect.quote("name")}, ${dialect.quote("content")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE (${dialect.quoteQualifiedColumn("Post.content")} IS NOT NULL) AND (${dialect.quoteQualifiedColumn("User.name")} IS NULL);`;
            expectSQL(sql, expectedSQL);
        });

    });
});

describe("having", () => {

    describe("HAVING with GROUP BY", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.name"])
                .having({
                    "User.name": {
                        op: "LIKE",
                        value: "John%"
                    }
                })
                .select("User.name");
        }

        it("should run", async () => {
            const result = await createQuery().run();

            const expected: Array<{ name: string }> = [
                {
                  name: 'John Doe',
            },
            {
                  name: 'John Smith',
            }
             ];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.name")} HAVING ${dialect.quoteQualifiedColumn("User.name")} LIKE 'John%';`;
            expectSQL(sql, expectedSQL);
        });

    });

    describe("HAVING without GROUP BY", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .having({
                    "User.name": {
                        op: "LIKE",
                        value: "Stuart%"
                    }
                })
                .selectAll();
        }

        it("should generate SQL (runtime skipped - SQLite limitation)", async () => {
            // NOTE: SQLite requires either GROUP BY or aggregate functions with HAVING
            // This test verifies SQL generation works, but we skip runtime execution
            // See README: "SQLite - Requires you to have either an aggregate function in the SELECT or make use of GROUP BY"

            const sql = createQuery()
                .getSQL();
            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} HAVING ${dialect.quoteQualifiedColumn("User.name")} LIKE 'Stuart%';`;
            expectSQL(sql, expectedSQL);

            // Verify type is correct even though we don't run it
            type TExpected = Array<UserPostQualifiedJoinRow>;

            const fields = createQuery().getResultType();

            typeCheck({} as Expect<Equal<typeof fields,TExpected>>);

        });
    });

    describe("HAVING with complex criteria", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .groupBy(["User.id", "User.name"])
                .having({
                    $AND: [
                        {
                            "User.name": {
                                op: "LIKE",
                                value: "J%"
                            }
                        }
                    ],
                    $OR: [
                        {
                            "User.id": 1,
                        },
                        {
                            "User.id": 2,
                        }
                    ]
                })
                .select("User.id")
                .select("User.name")
                .select("User.email")
                .select("User.age");
        }

        it("should run", async () => {
            const result = await createQuery().run();

            type TExpected = Array<{ "User.id": number, name: string | null, email: string, age: number | null }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected =  [
                {
                  email: 'johndoe@example.com',
                  'User.id': 1,
                  name: 'John Doe',
                  age:25,
            },
            {
                  email: 'smith@example.com',
                  'User.id': 2,
                  name: 'John Smith',
                  age:30,
            }
             ];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            // Should have both GROUP BY and HAVING
            expectSQL(sql,
            `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quote("name")}, ${dialect.quote("email")}, ${dialect.quote("age")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")} HAVING (${dialect.quoteQualifiedColumn("User.name")} LIKE 'J%') AND (${dialect.quoteQualifiedColumn("User.id")} = 1 OR ${dialect.quoteQualifiedColumn("User.id")} = 2);` );

        });
    });

    describe("GROUP BY type safety", () => {
        it("should prevent selectAll() after groupBy()", () => {
            // Runtime check: selectAll should not exist after groupBy
            const query = prisma.$from("User").groupBy(["User.id"]);
            const hasSelectAll = 'selectAll' in query;
            assert.ok(!hasSelectAll, "selectAll should not exist after groupBy()");
        });

        it("should allow select() after groupBy()", () => {
            const query = prisma.$from("User")
                .groupBy(["User.id"])
                .select("User.id")
                .select("User.name");
            // Should compile without errors
        });

        it("should allow selectDistinct() after groupBy()", () => {
            const query = prisma.$from("User")
                .groupBy(["User.id"])
                .selectDistinct();
            // Should compile without errors
        });
    });
});

