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

            //@ts-expect-error 1 should not be allowed for string field
            prisma.$from("User").where({ "name": 1 });
            //@ts-expect-error number not allowed for LIKE value on string field
            prisma.$from("User").where({ "email": { op: "LIKE", value: 1 } });
            //@ts-expect-error string should not be allowed for number field
            prisma.$from("User").where({ "age": "" });

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
                     'Post.createdAt': new Date("2020-01-15T10:30:00.000Z"),
                     'Post.title': 'Blog 1',
                     'Post.metadata': null,
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

            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE (NOT(${dialect.quoteQualifiedColumn("User.name")} LIKE 'something' OR ${dialect.quoteQualifiedColumn("User.name")} LIKE 'something else')) AND (NOT((${dialect.quoteQualifiedColumn("User.id")} = 2))) AND ((${dialect.quoteQualifiedColumn("User.id")} = 1 AND ${dialect.quoteQualifiedColumn("Post.id")} = 1)) AND (${dialect.quoteQualifiedColumn("User.id")} = 2 OR ${dialect.quoteQualifiedColumn("Post.content")} IS NOT NULL);`;

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
                    'Post.createdAt': new Date("2020-01-15T10:30:00.000Z"),
                  'Post.title': 'Blog 1',
                  'Post.metadata': null,
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
                  'Post.createdAt': new Date("2020-06-20T14:45:00.000Z"),
                  'Post.title': 'blog 2',
                  'Post.metadata': null,
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
                   'Post.createdAt': new Date("2021-12-25T08:00:00.000Z"),
                  'Post.title': 'blog 3',
                  'Post.metadata': null,
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
            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE ${rawWhere};`;
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

describe("where array shorthand", () => {

    describe("Stage 1: scalar array → IN", () => {

        const q = () => prisma.$from("User").where({ "name": ["John Doe", "John Smith"] }).selectAll();

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ");
            expectSQL(
                q().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE ${dialect.quote("name")} IN ('John Doe', 'John Smith');`
            );
        });

        it("should run and return matching users", async () => {
            const result = await q().run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
            assert.equal(result.length, 2);
            assert.ok(result.some(u => u.name === "John Doe"));
            assert.ok(result.some(u => u.name === "John Smith"));
        });

        it("type: numeric array compiles", () => {
            prisma.$from("User").where({ "age": [25, 30] });
        });

        it("type: mixed array is error", () => {
            prisma.$from("User").where({
                //@ts-expect-error mixed string/number array not allowed for numeric field
                "age": ["a", 25]
            });
        });

    });

    describe("Stage 2: op-object array → OR chain", () => {

        const q = () => prisma.$from("User")
            .where({ "name": [{ op: "LIKE", value: "John D%" }, { op: "LIKE", value: "John S%" }] })
            .selectAll();

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ");
            expectSQL(
                q().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quote("name")} LIKE 'John D%' OR ${dialect.quote("name")} LIKE 'John S%');`
            );
        });

        it("should run and return both Johns", async () => {
            const result = await q().run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
            assert.equal(result.length, 2);
            assert.ok(result.some(u => u.name === "John Doe"));
            assert.ok(result.some(u => u.name === "John Smith"));
        });

        it("type: numeric op-array compiles", () => {
            prisma.$from("User").where({ "age": [{ op: ">=", value: 18 }, { op: "<=", value: 65 }] });
        });

        it("type: IN op in array is error", () => {
            prisma.$from("User").where({
                //@ts-expect-error IN uses 'values', not valid in op-array
                "name": [{ op: "IN", values: ["a"] }]
            });
        });

    });

    describe("Stage 3: escaping", () => {

        it("should escape single quotes in scalar array", () => {
            const q = prisma.$from("User").where({ "name": ["O'Brien"] }).selectAll();
            expectSQL(
                q.getSQL(),
                `SELECT ${["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("name")} IN ('O''Brien');`
            );
        });

    });

    describe("Stage 4: empty array guard", () => {

        it("should throw at runtime on empty scalar array", () => {
            const w = [] as unknown as [string, ...string[]];
            assert.throws(
                () => prisma.$from("User").where({ "name": w }).selectAll().getSQL(),
                /empty array is not allowed/
            );
        });

        it("should throw at runtime on empty op-array", () => {
            const w = [] as unknown as [{ op: "LIKE"; value: string }, ...{ op: "LIKE"; value: string }[]];
            assert.throws(
                () => prisma.$from("User").where({ "name": w }).selectAll().getSQL(),
                /empty array is not allowed/
            );
        });

    });

    describe("Stage 5: single-element op-array — no parens", () => {

        it("should produce no surrounding parens for single op", () => {
            const q = prisma.$from("User").where({ "name": [{ op: "LIKE", value: "John D%" }] }).selectAll();
            expectSQL(
                q.getSQL(),
                `SELECT ${["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("name")} LIKE 'John D%';`
            );
        });

    });

    describe("Stage 6: numeric op-array", () => {

        const q = () => prisma.$from("User").where({ "age": [{ op: "=", value: 25 }, { op: "=", value: 30 }] }).selectAll();

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ");
            expectSQL(
                q().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quote("age")} = 25 OR ${dialect.quote("age")} = 30);`
            );
        });

        it("should run and return both users", async () => {
            const result = await q().run();
            typeCheck({} as Expect<Equal<typeof result, UserRow[]>>);
            assert.equal(result.length, 2);
            assert.ok(result.some(u => u.age === 25));
            assert.ok(result.some(u => u.age === 30));
        });

    });

    describe("Stage 7: qualified column via join", () => {

        const q = () => prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .where({ "User.name": ["John Doe", "John Smith"] })
            .select("User.name");

        it("should produce qualified IN SQL", () => {
            expectSQL(
                q().getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} WHERE ${dialect.quoteQualifiedColumn("User.name")} IN ('John Doe', 'John Smith');`
            );
        });

        it("should run and contain both user names in results", async () => {
            const result = await q().run();
            assert.ok(result.some(u => u.name === "John Doe"));
            assert.ok(result.some(u => u.name === "John Smith"));
        });

    });

    describe("Stage 9: NOT LIKE in op-array", () => {

        const q = () => prisma.$from("User")
            .where({ "name": [{ op: "NOT LIKE", value: "Jane%" }, { op: "NOT LIKE", value: "Alice%" }] })
            .selectAll();

        it("should match SQL", () => {
            const cols = ["id", "email", "name", "age"].map(c => dialect.quote(c)).join(", ");
            expectSQL(
                q().getSQL(),
                `SELECT ${cols} FROM ${dialect.quote("User")} WHERE (${dialect.quote("name")} NOT LIKE 'Jane%' OR ${dialect.quote("name")} NOT LIKE 'Alice%');`
            );
        });

        it("should run and return users not named Jane or Alice", async () => {
            const result = await q().run();
            typeCheck({} as Expect<Equal<typeof result, UserRow[]>>);
            assert.ok(result.every(u => u.name === null || (!u.name.startsWith("Jane") && !u.name.startsWith("Alice"))));
        });

    });

    describe("Stage 10: DateTime scalar array (SQL shape)", () => {

        it("should produce IN SQL for date array (type check)", () => {
            const d1 = new Date("2024-01-01");
            const d2 = new Date("2024-06-01");
            const q = prisma.$from("Post").where({ "createdAt": [d1, d2] }).selectAll();
            // Type check: Date array accepted
            prisma.$from("Post").where({ "createdAt": [d1, d2] });
            // SQL shape includes IN
            assert.ok(q.getSQL().includes("IN ("));
        });

    });

    describe("Stage 8: array where with table alias FROM", () => {

        const q = () => prisma.$from("User u")
            .where({ "name": ["John Doe", "John Smith"] })
            .select("name");

        it("should produce correct SQL with alias in FROM and IN in WHERE", () => {
            expectSQL(
                q().getSQL(),
                `SELECT ${dialect.quote("name")} FROM ${dialect.quote("User")} AS ${dialect.quote("u", true)} WHERE ${dialect.quote("name")} IN ('John Doe', 'John Smith');`
            );
        });

        it("should run and return both users", async () => {
            const result = await q().run();
            assert.equal(result.length, 2);
            assert.ok(result.some(u => u.name === "John Doe"));
            assert.ok(result.some(u => u.name === "John Smith"));
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
            const expectedSQL = `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")} HAVING ${dialect.quoteQualifiedColumn("User.name")} LIKE 'Stuart%';`;
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
            prisma.$from("User")
                .groupBy(["User.id"])
                .select("User.id")
                .select("User.name");
            // Should compile without errors
        });

        it("should allow selectDistinct() after groupBy()", () => {
            prisma.$from("User")
                .groupBy(["User.id"])
                .selectDistinct();
            // Should compile without errors
        });
    });
});

