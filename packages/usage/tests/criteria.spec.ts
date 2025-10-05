import assert from "node:assert/strict"
import {describe, it, before} from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, typeCheck} from "./utils.js";

const prisma = new PrismaClient({}).$extends(tsSelectExtend);

runTests();

function runTests() {
describe("where", () => {

    before(async function(){
        // Delete in correct order due to foreign key constraints
        await prisma.post.deleteMany({});
        await prisma.user.deleteMany({});
    });

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


            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereNotNull("User.name");


        }

        it("should run", async () => {
            const result = await createQuery().run();
            createQuery2().getSQL(true)
            type TExpected = Array<{
                "User.id": number;
                "User.email": string;
                "User.name": string | null;
                "Post.id": number;
                "Post.title": string;
                "Post.content": string | null;
                "Post.published": boolean;
                "Post.authorId": number;
                "Post.lastModifiedById": number;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();

            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON authorId = User.id WHERE (NOT((User.name LIKE 'something' ) OR (User.name LIKE 'something else' ))) AND (NOT(((User.id = 2 )))) AND ((User.id = 1 AND  Post.id = 1 ) AND (User.id = 1 AND  Post.id = 1 )) AND ((User.id = 2 ) OR (Post.content IS NOT NULL ));`;

            assert.strictEqual(sql, expectedSQL);
        });


    });

    describe("Where Raw", () => {

        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereRaw("(User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL)")
                .selectAll();
        }

        it("should run", async () => {
            const result = await createQuery().run();

            type TExpected = Array<{
                "User.id": number;
                "User.email": string;
                "User.name": string | null;
                "Post.id": number;
                "Post.title": string;
                "Post.content": string | null;
                "Post.published": boolean;
                "Post.authorId": number;
                "Post.lastModifiedById": number;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON authorId = User.id WHERE (User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL);`;
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
                "name": null;
                "content": string;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT name, Post.content FROM User JOIN Post ON authorId = User.id WHERE ((Post.content IS NOT NULL )) AND ((User.name IS NULL ));`;
            assert.strictEqual(sql, expectedSQL);
        });

    });
});

describe("having", () => {

    before(async function(){
        // Delete in correct order due to foreign key constraints
        await prisma.post.deleteMany({});
        await prisma.user.deleteMany({});
    });

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

            type TExpected = Array<{
                "User.id": number;
                "User.email": string;
                "User.name": string | null;
                "Post.id": number;
                "Post.title": string;
                "Post.content": string | null;
                "Post.published": boolean;
                "Post.authorId": number;
                "Post.lastModifiedById": number;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON authorId = User.id GROUP BY User.name HAVING (User.name LIKE 'John%' );`;
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

        it("should generate SQL (runtime skipped - SQLite limitation)", () => {
            // NOTE: SQLite requires either GROUP BY or aggregate functions with HAVING
            // This test verifies SQL generation works, but we skip runtime execution
            // See README: "SQLite - Requires you to have either an aggregate function in the SELECT or make use of GROUP BY"

            const sql = createQuery().getSQL();
            const expectedSQL = `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON authorId = User.id HAVING (User.name LIKE 'Stuart%' );`;
            assert.strictEqual(sql, expectedSQL);

            // Verify type is correct even though we don't run it
            type TExpected = Array<{
                "User.id": number;
                "User.email": string;
                "User.name": string | null;
                "Post.id": number;
                "Post.title": string;
                "Post.content": string | null;
                "Post.published": boolean;
                "Post.authorId": number;
                "Post.lastModifiedById": number;
            }>;

            type TActual = Awaited<ReturnType<typeof createQuery.prototype.run>>;
            typeCheck({} as Expect<Equal<TActual, TExpected>>);
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

            type TExpected = Array<{
                "User.id": number;
                "User.email": string;
                "User.name": string | null;
                "Post.id": number;
                "Post.title": string;
                "Post.content": string | null;
                "Post.published": boolean;
                "Post.authorId": number;
                "Post.lastModifiedById": number;
            }>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [];

            assert.deepStrictEqual(result, expected);
        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            // Should have both GROUP BY and HAVING
            assert.ok(sql.includes("GROUP BY"));
            assert.ok(sql.includes("HAVING"));
            assert.ok(sql.includes("User.name LIKE 'J%'"));
        });
    });
});
}

