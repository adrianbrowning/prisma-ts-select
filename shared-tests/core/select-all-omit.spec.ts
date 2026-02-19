import assert from "node:assert/strict"

import { describe, it } from "node:test"
import type {Equal, Expect, Prettify} from "../utils.ts";
import { typeCheck} from "../utils.ts";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';
import { dialect } from '#dialect';
import type {
    UserRow,
    UserPostQualifiedJoinRow,
} from "../types.ts";

describe("selectAllOmit Tests", () => {

    describe("single table - omit one field - col", () => {
        function createQuery() {
            return prisma.$from("User")
                .selectAllOmit(["email"]);
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quote("id")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")};`)
        });

        it("should run and return correct type", async () => {
            const result = await createQuery().run();

            type TExpected = Array<Omit<UserRow, "email">>;
               //  ^?
            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [
                { id:1, name: 'John Doe', age: 25 },
                { id:2, name: 'John Smith', age: 30 },
                { id:3, name: null, age: null },
            ];
            assert.deepEqual(result, expected);
        });
    });
    describe("single table - omit star", () => {

        it("should fail on *", () => {
            prisma.$from("User")
                //@ts-expect-error * is not allowed
                .selectAllOmit(["*"])
        });
        it("should fail on Table.*", () => {
            prisma.$from("User")
                //@ts-expect-error * is not allowed
                .selectAllOmit(["User.*"])
        });

    });

    describe("single table - omit one field - Table.col", () => {
        function createQuery() {
            return prisma.$from("User")
                .selectAllOmit(["User.email"]);
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quote("id")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")};`)
        });
    });

    describe("single table - omit multiple fields", () => {
        function createQuery() {
            return prisma.$from("User")
                .selectAllOmit(["User.email", "User.age"]);
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quote("id")}, ${dialect.quote("name")} FROM ${dialect.quote("User")};`)
        });

        it("should run and return correct type", async () => {
            const result = await createQuery().run();

            type TExpected = Array<Omit<UserRow, "email" | "age">>;
            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [
                { id: 1, name: 'John Doe' },
                { id: 2, name: 'John Smith' },
                { id: 3, name: null },
            ];
            assert.deepEqual(result, expected);
        });
    });

    describe("multi-table join - omit from one table", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .selectAllOmit(["User.email"]);
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
        });

        it("should run and return correct type", async () => {
            const result = await createQuery().run();

            type TExpected = Array<Prettify<Omit<UserPostQualifiedJoinRow, "User.email">>>;
            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [{
                'User.id': 1,
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
    });

    describe("multi-table join - omit from both tables", () => {
        function createQuery() {
            return prisma.$from("User")
                .join("Post", "authorId", "User.id")
                .selectAllOmit(["User.email", "Post.content"]);
        }

        it("should match SQL", () => {
            const sql = createQuery().getSQL();
            expectSQL(sql, `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`)
        });

        it("should run and return correct type", async () => {
            const result = await createQuery().run();

            type TExpected = Array<Prettify<Omit<UserPostQualifiedJoinRow, "User.email" | "Post.content">>>;
            typeCheck({} as Expect<Equal<typeof result, TExpected>>);

            const expected: TExpected = [{
                'User.id': 1,
                'User.name': 'John Doe',
                "User.age": 25,
                'Post.id': 1,
                'Post.title': 'Blog 1',
                'Post.published': false,
                'Post.authorId': 1,
                'Post.lastModifiedById': 1
            }, {
                'User.id': 1,
                'User.name': 'John Doe',
                "User.age": 25,
                'Post.id': 2,
                'Post.title': 'blog 2',
                'Post.published': false,
                'Post.authorId': 1,
                'Post.lastModifiedById': 1
            }, {
                'User.id': 2,
                'User.name': 'John Smith',
                "User.age": 30,
                'Post.id': 3,
                'Post.title': 'blog 3',
                'Post.published': false,
                'Post.authorId': 2,
                'Post.lastModifiedById': 2
            }];
            assert.deepStrictEqual(result, expected);
        });
    });

});
