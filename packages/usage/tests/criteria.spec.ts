import assert from "node:assert/strict"
import {describe, it, test} from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, typeCheck} from "./utils.js";


const prisma = new PrismaClient({}).$extends(tsSelectExtend);





    console.log(

        prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .having({
                "User.name": {
                    op: "LIKE",
                    value: "a"
                }
            })
            .limit(1)
            // .offset(1)


            .getSQL(true));

/*

describe.skip("where", () => {

    test("Where Criteria Object", async () =>  {

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
                    $NOT:[{
                        $OR:[{
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

        it.skip("should run", async () => {
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
            console.log(sql)

            `WHERE
            (NOT((User.name LIKE 'something' ) OR (User.name LIKE 'something else' )))
            AND
            (NOT((User.id = 2 )))
            AND
            ((User.id = 1 AND Post.id = 1 ) AND (User.id = 1 AND Post.id = 1 ))
            AND
            ((User.id = 2 ) OR (Post.content IS NOT NULL ));`

            assert.strictEqual(sql, `SELECT email, name, Post.title FROM User JOIN Post ON authorId = User.id;`)
        });


    });

    test("Where Raw", async () =>  {

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
            assert.strictEqual(sql, `SELECT email, name, Post.title FROM User JOIN Post ON authorId = User.id WHERE (User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL);`)
        });

    });

    test("Where NULL", async () =>  {

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
            assert.strictEqual(sql, `SELECT email, name, Post.title FROM User JOIN Post ON authorId = User.id WHERE (User.id = 1 AND Post.id = 1) OR (User.id = 2 OR Post.content IS NOT NULL);`)
        });

    });
});

describe.skip("having", () => {

    test("Where Criteria", async () =>  {

        {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({
                    $AND: [
                        {
                            "User.id": 1,
                            "Post.id": 1
                        },
                        {
                            "Post.title" : "hello"
                        },
                        {
                            $OR: [
                                {
                                    "User.name": "John Doe",
                                },{
                                    "User.name": "Frank Jones",
                                }
                            ]
                        }
                    ],
                    $OR: [
                        {
                            "User.id": 2,
                            "Post.id": 2
                        },
                        {
                            "Post.content": {
                                op: "IS NOT NULL"
                            }
                        }
                    ]
                })
                .getSQL();
            console.log(sql)
            //  WHERE ((User.id = 1 AND Post.id = 1 ) AND (Post.title = 'hello' ) AND ((User.name = 'John Doe' ) OR (User.name = 'Frank Jones' ))) AND ((User.id = 2 AND Post.id = 2 ) OR (Post.content IS NOT NULL ));

            // TODO check sql
            // TODO Return Type

            assert.equal(sql, "SELECT  FROM User JOIN Post ON authorId = User.id;");
        }

    });

    test("Where Raw", async () =>  {

        {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .where({
                    $AND: [
                        {
                            "User.id": 1,
                            "Post.id": 1
                        },
                        {
                            "Post.title" : "hello"
                        },
                        {
                            $OR: [
                                {
                                    "User.name": "John Doe",
                                },{
                                    "User.name": "Frank Jones",
                                }
                            ]
                        }
                    ],
                    $OR: [
                        {
                            "User.id": 2,
                            "Post.id": 2
                        },
                        {
                            "Post.content": {
                                op: "IS NOT NULL"
                            }
                        }
                    ]
                })
                .getSQL();
            console.log(sql)
            //  WHERE ((User.id = 1 AND Post.id = 1 ) AND (Post.title = 'hello' ) AND ((User.name = 'John Doe' ) OR (User.name = 'Frank Jones' ))) AND ((User.id = 2 AND Post.id = 2 ) OR (Post.content IS NOT NULL ));

            // TODO check sql
            // TODO Return Type

            assert.equal(sql, "SELECT  FROM User JOIN Post ON authorId = User.id;");
        }

    });

    test("Where NULL", async () =>  {

        {
            const sql = prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .whereNotNull("Post.content")
                .whereIsNull("User.name")
                .select("name")
                .select("Post.content")
                .run();
            // TODO check sql
            // TODO Return Type
            //  WHERE ((User.id = 1 AND Post.id = 1 ) AND (Post.title = 'hello' ) AND ((User.name = 'John Doe' ) OR (User.name = 'Frank Jones' ))) AND ((User.id = 2 AND Post.id = 2 ) OR (Post.content IS NOT NULL ));

            assert.equal(sql, "SELECT  FROM User JOIN Post ON authorId = User.id;");
        }

    });
});

*/

/*
{ status: 'D' }
->
WHERE status = "D"
*/

/*
{
    status: { $in: ['A', 'D'] }
}

-> WHERE status in ("A", "D")
*/

/*

{
    status: 'A',
        qty: { $lt: 30 }
}
->
WHERE status = "A" AND qty < 30
*/

/*

{
    $or: [{ status: 'A' }, { qty: { $lt: 30 } }]
}

WHERE status = "A" OR qty < 30
*/

/*
{
    status: 'A',
        $or: [{ qty: { $lt: 30 } }, { item: { $regex: '^p' } }]
}
->
WHERE status = "A" AND ( qty < 30 OR item LIKE "p%")
*/

