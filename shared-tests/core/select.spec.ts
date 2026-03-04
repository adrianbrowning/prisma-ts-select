import assert from "node:assert/strict"

import { describe, test, it } from "node:test"
import type {Equal, Expect, Prettify} from "../utils.ts";
import { typeCheck} from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';
import type {
    UserRowArray,
    UserPostQualifiedJoinRow,
    UserPostJoinRow,
    UserRow,
    PostRow,
    PostRowQualified
} from "../types.ts";

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
                expectSQL(sql, `SELECT * FROM ${dialect.quote("User")};`)
            });
        });

        // Behavioral contract: select("*") on a multi-table query expands to qualified columns
        // (e.g. "User.id", "Post.title"), returning UserPostQualifiedJoinRow, not UserPostJoinRow.
        describe("basic select * with join", () => {
            function createQuery() {
                return prisma.$from("User")
                    .join("Post", "authorId", "User.id")
                    .select("*");
            }

            it("should match SQL", () => {
                expectSQL(createQuery().getSQL(),
                    `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
                );
            });

            it("should run and return qualified data", async () => {
                const result = await createQuery().run();
                type TExpected = Array<UserPostQualifiedJoinRow>;

                typeCheck({} as Expect<Equal<typeof result, TExpected>>);

                const expected: TExpected = [{
                    'User.id': 1,
                    'User.email': 'johndoe@example.com',
                    'User.name': 'John Doe',
                    'User.age': 25,
                    'Post.id': 1,
                    'Post.title': 'Blog 1',
                    'Post.content': 'Something',
                    'Post.published': false,
                    'Post.createdAt': new Date("2020-01-15T10:30:00.000Z"),
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1,
                    'Post.metadata':{ name: 'Blog Post 1', tags: ['prisma', 'ts'] },
                }, {
                    'User.id': 1,
                    'User.email': 'johndoe@example.com',
                    'User.name': 'John Doe',
                    'User.age': 25,
                    'Post.id': 2,
                    'Post.title': 'blog 2',
                    'Post.content': 'sql',
                    'Post.published': false,
                    'Post.createdAt': new Date("2020-06-20T14:45:00.000Z"),
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1,
                    'Post.metadata':null
                }, {
                    'User.id': 2,
                    'User.email': 'smith@example.com',
                    'User.name': 'John Smith',
                    'User.age': 30,
                    'Post.id': 3,
                    'Post.title': 'blog 3',
                    'Post.content': null,
                    'Post.published': false,
                    'Post.createdAt': new Date("2021-12-25T08:00:00.000Z"),
                    'Post.authorId': 2,
                    'Post.lastModifiedById': 2,
                    'Post.metadata':null
                }];
                assert.deepStrictEqual(result, expected);
            });
        })


        describe("select distinct", () => {
            function createQuery() {
                return prisma.$from("User")
                    .selectDistinct()
                    .select("*")
                    .orderBy(["id"]);
            }

            it("should match SQL", async () => {
                const sql = createQuery().getSQL();
                expectSQL(sql, `SELECT DISTINCT * FROM ${dialect.quote("User")} ORDER BY ${dialect.quoteOrderByClause("id")};`)
            });
            it("should run and return distinct data", async () => {
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
                expectSQL(sql, `SELECT ${dialect.quote("id")}, ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")};`)
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
                    'Post.createdAt': new Date("2020-01-15T10:30:00.000Z"),
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1,
                    'Post.metadata': { name: 'Blog Post 1', tags: ['prisma', 'ts'] },
                }, {
                    'User.id': 1,
                    'User.email': 'johndoe@example.com',
                    'User.name': 'John Doe',
                    "User.age": 25,
                    'Post.id': 2,
                    'Post.title': 'blog 2',
                    'Post.content': 'sql',
                    'Post.published': false,
                    'Post.createdAt': new Date("2020-06-20T14:45:00.000Z"),
                    'Post.authorId': 1,
                    'Post.lastModifiedById': 1,
                    'Post.metadata': null,
                }, {
                    'User.id': 2,
                    'User.email': 'smith@example.com',
                    'User.name': 'John Smith',
                    "User.age": 30,
                    'Post.id': 3,
                    'Post.title': 'blog 3',
                    'Post.content': null,
                    'Post.published': false,
                     'Post.createdAt': new Date("2021-12-25T08:00:00.000Z"),
                    'Post.authorId': 2,
                    'Post.lastModifiedById': 2,
                    'Post.metadata': null,
                }];

                assert.deepStrictEqual(result, expected);

            });

            it("should match SQL", () => {
                const sql = createQuery().getSQL();
                expectSQL(sql, `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
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
                expectSQL(sql, `SELECT ${dialect.quote("email")}, ${dialect.quote("name")} FROM ${dialect.quote("User")};`)
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
                expectSQL(sql, `SELECT ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("title")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
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
            expectSQL(sql, `SELECT ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("title")}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
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
            expectSQL(sql, `SELECT ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("title")}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("pId", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
        });
    });

});

// }
