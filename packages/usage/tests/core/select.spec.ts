import assert from "node:assert/strict"

import { describe, test, before, it } from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import type {Equal, Expect, Prettify} from "../utils.ts";
import { typeCheck} from "../utils.ts";
import {PrismaClient} from "@prisma/client";
import type {
    UserRowArray,
    UserPostQualifiedJoinRow,
    UserPostJoinRow,
    UserRow,
    PostRow,
    PostRowQualified
} from "../types.ts";

const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

// Database is seeded via `pnpm p:r` which runs before all tests
describe("Select Tests", ()=> {
        describe("basic select *", () => {


            function createQuery() {
                return prisma.$from("User")
                    .select("*");
            }

            it("should RUN", async () => {
                const result = await createQuery().run();

                typeCheck({} as Expect<Equal<typeof result, UserRowArray>>);


                const expected: UserRowArray = [
                    {
                        id: 1,
                        email: 'johndoe@example.com',
                        name: 'John Doe',
                        age: 25
                    },
                    {
                        id: 2,
                        email: 'smith@example.com',
                        name: 'John Smith',
                        age: 30
                    },
                    {
                        id: 3,
                        email: "alice@example.com",
                        name: null,
                        age: null
                    }
                ];
                assert.deepEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.deepStrictEqual(sql, `SELECT * FROM User;`)
            });
        });

        describe("basic select * with join", () => {


            function createQuery() {
                return prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .select("*");
            }

            it("should run", async () => {
                const result = await createQuery().run();

                type TExpected = Array<UserPostJoinRow>;

                typeCheck({} as Expect<Equal<typeof result, TExpected>>);

                const expected: TExpected = [{
                    email: 'johndoe@example.com',
                    name: 'John Doe',
                    id: 1,
                    title: 'Blog 1',
                    content: 'Something',
                    published: false,
                    authorId: 1,
                    lastModifiedById: 1,
                    age: 25,
                }, {
                    email: 'johndoe@example.com',
                    name: 'John Doe',
                    id: 2,
                    title: 'blog 2',
                    content: 'sql',
                    published: false,
                    authorId: 1,
                    lastModifiedById: 1,
                    age: 25,
                }, {
                    email: 'smith@example.com',
                    name: 'John Smith',
                    id: 3,
                    title: 'blog 3',
                    content: null,
                    published: false,
                    authorId: 2,
                    lastModifiedById: 2,
                    age: 30,
                }];

                assert.deepStrictEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.strictEqual(sql, `SELECT * FROM User JOIN Post ON Post.authorId = User.id;`)
            });
        })


        describe("select distinct", () => {
            function createQuery() {
                return prisma.$from("User")
                    .selectDistinct()
                    .select("*");
            }

            it("sql", async () => {
                const sql = createQuery().getSQL();
                assert.deepStrictEqual(sql, `SELECT DISTINCT * FROM User;`)
            });
            it("sql", async () => {
                const result = await createQuery().run();


                typeCheck({} as Expect<Equal<typeof result, UserRowArray>>);

                const expected: UserRowArray = [
                    {
                        id: 1,
                        email: 'johndoe@example.com',
                        name: 'John Doe',
                        age: 25,
                    },
                    {
                        id: 2,
                        email: 'smith@example.com',
                        name: 'John Smith',
                        age: 30
                    },
                    {
                        id: 3,
                        email: "alice@example.com",
                        name: null,
                        age: null
                    }
                ];

                assert.deepEqual(result, expected);
            })
        });

        describe("order of operations", () => {
            test("if selectAll, no select allowed", () => {
                prisma.$from("User")
                    .selectAll();
                try {
                    prisma.$from("User")
                        .selectAll()
                        //@ts-expect-error this is correct, select should not be allowed after selectAll
                        .select("*");
                    assert.fail("select should not be a function");
                } catch {
                }
            })
            test("selectDistinct should always be first", () => {
                prisma.$from("User")
                    .selectDistinct()
                    .select("*")
                try {
                    prisma.$from("User")
                        .select("*")
                        //@ts-expect-error this is correct, selectDistinct should only be called before select
                        .selectDistinct();
                    assert.fail("selectDistinct should not be a function");
                } catch {
                }
            })
        });

        describe("basic selectAll", () => {

            function createQuery() {
                return prisma.$from("User")
                    .selectAll();
            }

            it("should run", async () => {
                const result = await createQuery().run();

                typeCheck({} as Expect<Equal<typeof result, UserRowArray>>);

                const expected: UserRowArray = [
                    {
                        id: 1,
                        email: 'johndoe@example.com',
                        name: 'John Doe',
                        age: 25,
                    },
                    {
                        id: 2,
                        email: 'smith@example.com',
                        name: 'John Smith',
                        age: 30
                    },
                    {
                        id: 3,
                        email: "alice@example.com",
                        name: null,
                        age: null,
                    }
                ]

                assert.deepEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.deepStrictEqual(sql, `SELECT id, email, name, age FROM User;`)
            });
        });

        describe("basic selectAll with join", () => {


            function createQuery() {
                return prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .selectAll();
            }

            it("should run", async () => {
                const result = await createQuery().run();

                typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow>>>);

                const expected: Array<UserPostQualifiedJoinRow> = [{
                    'User.id': 1,
                    'User.email': 'johndoe@example.com',
                    'User.name': 'John Doe',
                    "User.age": 25,
                    'Post.id': 1,
                    'Post.title': 'Blog 1',
                    'Post.content': 'Something',
                    'Post.published': false,
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1
                }, {
                    'User.id': 1,
                    'User.email': 'johndoe@example.com',
                    'User.name': 'John Doe',
                    "User.age": 25,
                    'Post.id': 2,
                    'Post.title': 'blog 2',
                    'Post.content': 'sql',
                    'Post.published': false,
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1
                }, {
                    'User.id': 2,
                    'User.email': 'smith@example.com',
                    'User.name': 'John Smith',
                    "User.age": 30,
                    'Post.id': 3,
                    'Post.title': 'blog 3',
                    'Post.content': null,
                    'Post.published': false,
                    'Post.authorId': 2,
                    'Post.lastModifiedById': 2
                }];

                assert.deepStrictEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.strictEqual(sql, `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, User.age AS \`User.age\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON Post.authorId = User.id;`)
            });
        })

        describe("basic select email, name", () => {


            function createQuery() {
                return prisma.$from("User")
                    .select("email")
                    .select("name");
            }

            it("should RUN", async () => {
                const result = await createQuery().run();

                type TExpected = Array<Pick<UserRow, "name" | "email">>;

                typeCheck({} as Expect<Equal<typeof result, TExpected>>);


                const expected: TExpected = [
                    {
                        email: 'johndoe@example.com',
                        name: 'John Doe',
                    },
                    {
                        email: 'smith@example.com',
                        name: 'John Smith',
                    },
                    {
                        email: "alice@example.com",
                        name: null
                    }
                ];
                assert.deepEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.deepStrictEqual(sql, `SELECT email, name FROM User;`)
            });
        });

        describe("basic select email, name, Post.title with join", () => {


            function createQuery() {
                return prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .select("email")
                    .select("name")
                    .select("Post.title");
            }

            it("should run", async () => {
                const result = await createQuery().run();

                type TExpected = Array<Pick<UserPostJoinRow, "email" | "name" | "title">>;

                typeCheck({} as Expect<Equal<typeof result, TExpected>>);

                const expected: TExpected = [{
                    email: 'johndoe@example.com',
                    name: 'John Doe',
                    title: 'Blog 1',
                }, {
                    email: 'johndoe@example.com',
                    name: 'John Doe',
                    title: 'blog 2',
                }, {
                    email: 'smith@example.com',
                    name: 'John Smith',
                    title: 'blog 3',
                }];

                assert.deepStrictEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                assert.strictEqual(sql, `SELECT email, name, title FROM User JOIN Post ON Post.authorId = User.id;`)
            });
        });

    describe("basic select email, name, Post.title, Post.id with join", () => {


        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("email")
                .select("name")
                .select("Post.title")
                .select("Post.id");
        }

        it("should run", async () => {
            const result = await createQuery().run();

            type TExpected = Array<Prettify<Pick<UserRow, "email"|"name"> & Pick<PostRow, "title"> & Pick<PostRowQualified, "Post.id">>>;

            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [{
                email: 'johndoe@example.com',
                name: 'John Doe',
                title: 'Blog 1',
                'Post.id': 1
            }, {
                email: 'johndoe@example.com',
                name: 'John Doe',
                title: 'blog 2',
                'Post.id': 2
            }, {
                email: 'smith@example.com',
                name: 'John Smith',
                title: 'blog 3',
                'Post.id': 3
            }];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            assert.strictEqual(sql, `SELECT email, name, title, Post.id AS \`Post.id\` FROM User JOIN Post ON Post.authorId = User.id;`)
        });
    });
    describe("basic select email, name, Post.title, Post.id with join", () => {


        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .select("email")
                .select("name")
                .select("Post.title")
                .select("Post.id", 'pId');
        }

        it("should run", async () => {
            const result = await createQuery().run();


            type TExpected = Array<Prettify<Pick<UserRow, "email"|"name"> & Pick<PostRow, "title"> & Record<'pId', PostRow['id']>>>;


            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [{
                email: 'johndoe@example.com',
                name: 'John Doe',
                title: 'Blog 1',
                pId: 1
            }, {
                email: 'johndoe@example.com',
                name: 'John Doe',
                title: 'blog 2',
                pId: 2
            }, {
                email: 'smith@example.com',
                name: 'John Smith',
                title: 'blog 3',
                pId: 3
            }];

            assert.deepStrictEqual(result, expected);

        });

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            assert.strictEqual(sql, `SELECT email, name, title, Post.id AS \`pId\` FROM User JOIN Post ON Post.authorId = User.id;`)
        });
    });

});

// }
