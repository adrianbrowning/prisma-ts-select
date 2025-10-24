import assert from "node:assert/strict"
import {describe, it, before} from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, typeCheck} from "../utils.ts";
import type {PostRow, UserPostQualifiedJoinRow, UserRow} from "../types.ts";

const prisma = new PrismaClient({}).$extends(tsSelectExtend);

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

            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, User.age AS \`User.age\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON Post.authorId = User.id WHERE (NOT(User.name LIKE 'something' OR User.name LIKE 'something else')) AND (NOT((User.id = 2))) AND ((User.id = 1 AND Post.id = 1)) AND (User.id = 2 OR Post.content IS NOT NULL);`;

            assert.strictEqual(sql, expectedSQL);
        });


    });

    describe("Where Raw", () => {

        const rawWhere = "(User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL)";

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
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, User.age AS \`User.age\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON Post.authorId = User.id WHERE ${rawWhere};`;
            assert.strictEqual(sql, expectedSQL);
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
            const expectedSQL = `SELECT name, content FROM User JOIN Post ON Post.authorId = User.id WHERE (Post.content IS NOT NULL) AND (User.name IS NULL);`;
            assert.strictEqual(sql, expectedSQL);
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
                    "User.age":25,
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
                "User.age":30,
            }
             ];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, User.age AS \`User.age\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON Post.authorId = User.id GROUP BY User.name HAVING User.name LIKE 'John%';`;
            assert.strictEqual(sql, expectedSQL);
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
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, User.age AS \`User.age\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON Post.authorId = User.id HAVING User.name LIKE 'Stuart%';`;
            assert.strictEqual(sql, expectedSQL);

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
                .selectAll();
        }

        it("should run", async () => {
            const result = await createQuery().run();

            type TExpected = Array<UserPostQualifiedJoinRow>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected =  [
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
              'Post.authorId': 2,
                  'Post.content': null,
                  'Post.id': 3,
                  'Post.lastModifiedById': 2,
                  'Post.published': false,
                  'Post.title': 'blog 3',
                  'User.email': 'smith@example.com',
                  'User.id': 2,
                  'User.name': 'John Smith',
                "User.age":30,
            }
             ];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            // Should have both GROUP BY and HAVING
            assert.equal(sql,
            "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById` FROM User JOIN Post ON Post.authorId = User.id GROUP BY User.id, User.name HAVING (User.name LIKE 'J%') AND (User.id = 1 OR User.id = 2);" );

        });
    });
});

