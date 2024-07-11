// import {describe, it, before, test} from "node:test"
import assert from "node:assert/strict"
//
// import {PrismaClient} from "@prisma/client";
// import {DbSelect} from "../src/db-select.js"
// import type {Equal, Expect} from "./utils.js";
// import {typeCheck} from "./utils.js";


import { describe, test, before } from "node:test"
import tsSelectExtend from 'prisma-ts-select/extend'
import type {Equal, Expect} from "./utils.js";
import { typeCheck} from "./utils.js";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient({}).$extends(tsSelectExtend);

type TUserExpected = Array<{ id: number; email: string; name: string | null }>;

describe("basic select *", () => {

    before(() => {
        /*TODO insert data into DB */
    });

    function createQuery() {
        return prisma.$from("User")
            .select("*");
    }

    it("should RUN", async () => {
        const result = await createQuery().run();

        typeCheck({} as Expect<Equal<typeof result, TUserExpected>>);


        const expected: TUserExpected = [
            {
                id: 1,
                email: 'johndoe@example.com',
                name: 'John Doe',
            },
            {
                id: 2,
                email: 'smith@example.com',
                name: 'John Smith',
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

    before(() => {
        /*TODO insert data into DB*/
    });

    function createQuery() {
        return prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("*");
    }

    it("should run", async () => {
        const result = await createQuery().run();

        type TExpected = Array<{
            id: number;
            email: string;
            name: string | null;
            // "Post.id": number,
            title: string;
            content: string | null;
            published: boolean;
            authorId: number;
            lastModifiedById: number;
        }>;

        typeCheck({} as Expect<Equal<typeof result, TExpected>>);

        const expected: TExpected = [{
            // id: 1,
            email: 'johndoe@example.com',
            name: 'John Doe',
            id: 1,
            title: 'Blog 1',
            content: 'Something',
            published: false,
            authorId: 1,
            lastModifiedById: 1
        }, {
            // id: 1,
            email: 'johndoe@example.com',
            name: 'John Doe',
            id: 2,
            title: 'blog 2',
            content: 'sql',
            published: false,
            authorId: 1,
            lastModifiedById: 1
        }, {
            // id: 2,
            email: 'smith@example.com',
            name: 'John Smith',
            id: 3,
            title: 'blog 3',
            content: null,
            published: false,
            authorId: 2,
            lastModifiedById: 2
        }];

        assert.deepStrictEqual(result, expected);

    });

    it("should match SQL", () => {
        const sql = createQuery().getSQL();
        assert.strictEqual(sql, `SELECT * FROM User JOIN Post ON authorId = User.id;`)
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


        typeCheck({} as Expect<Equal<typeof result, TUserExpected>>);

const expected : TUserExpected = [
    {
        id: 1,
        email: 'johndoe@example.com',
        name: 'John Doe',
    },
    {
        id: 2,
        email: 'smith@example.com',
        name: 'John Smith',
    }
];

        assert.deepEqual(result, expected);
    })
});

describe("order of operations", () => {
    test("if selectAll, no select allowed", () => {

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

    before(() => {
        /*TODO insert data into DB*/
    });

    function createQuery() {
        return prisma.$from("User")
            .selectAll();
    }

    it("should run", async () => {
        const result = await createQuery().run();

        typeCheck({} as Expect<Equal<typeof result, TUserExpected>>);

        const expected: TUserExpected = [
            {
                id: 1,
                email: 'johndoe@example.com',
                name: 'John Doe',
            },
            {
                id: 2,
                email: 'smith@example.com',
                name: 'John Smith',
            }
        ]

        assert.deepEqual(result, expected);

    });

    it("should match SQL", () => {
        const sql = createQuery().getSQL();
        assert.deepStrictEqual(sql, `SELECT id, email, name FROM User;`)
    });
});

describe("basic selectAll with join", () => {

    before(() => {
        /*TODO insert data into DB*/
    });

    function createQuery() {
        return prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .selectAll();
    }

    it("should run", async () => {
        const result = await createQuery().run();

        type RTTest = {
            "User.id": number;
            "User.email": string;
            "User.name": string | null;
            "Post.id": number,
            "Post.title": string;
            "Post.content": string | null;
            "Post.published": boolean;
            "Post.authorId": number;
            "Post.lastModifiedById": number;
        };

        typeCheck({} as Expect<Equal<typeof result, Array<RTTest>>>);

        const expected: Array<RTTest> = [{
            'User.id': 1,
            'User.email': 'johndoe@example.com',
            'User.name': 'John Doe',
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
            'Post.id': 3,
            'Post.title': 'blog 3',
            'Post.content': null,
            'Post.published': false,
            'Post.authorId': 2,
            'Post.lastModifiedById': 2
        }] ;

        assert.deepStrictEqual(result,  expected);

    });

    it("should match SQL", () => {
        const sql = createQuery().getSQL();
        assert.strictEqual(sql, `SELECT User.id AS \`User.id\`, User.email AS \`User.email\`, User.name AS \`User.name\`, Post.id AS \`Post.id\`, Post.title AS \`Post.title\`, Post.content AS \`Post.content\`, Post.published AS \`Post.published\`, Post.authorId AS \`Post.authorId\`, Post.lastModifiedById AS \`Post.lastModifiedById\` FROM User JOIN Post ON authorId = User.id;`)
    });
})

describe("basic select email, name", () => {

    before(() => {
        /*TODO insert data into DB */
    });

    function createQuery() {
        return prisma.$from("User")
            .select("email")
            .select("name");
    }

    it("should RUN", async () => {
        const result = await createQuery().run();

        type TExpected = Array<{
            email: string;
            name: string | null;
        }>;

        typeCheck({} as Expect<Equal<typeof result, TExpected>>);


        const expected: TExpected = [
            {
                email: 'johndoe@example.com',
                name: 'John Doe',
            },
            {
                email: 'smith@example.com',
                name: 'John Smith',
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

    before(() => {
        /*TODO insert data into DB*/
    });

    function createQuery() {
        return prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("email")
            .select("name")
            .select("Post.title");
    }

    it("should run", async () => {
        const result = await createQuery().run();

        type TExpected = Array<{
            email: string;
            name: string | null;
            title: string;
        }>;

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
        assert.strictEqual(sql, `SELECT email, name, Post.title FROM User JOIN Post ON authorId = User.id;`)
    });
})
