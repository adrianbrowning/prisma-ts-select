import {describe, test} from "node:test";
import assert from "node:assert/strict";
import tsSelectExtend from 'prisma-ts-select/extend';
import {PrismaClient} from "@prisma/client";
import {type Equal, type Expect, type Prettify, typeCheck} from "../utils.ts";
import type {PostRow, PostRowQualified, UserPostQualifiedJoinRow, UserRow, UserRowQualified} from "../types.js";

const prisma = new PrismaClient({})
    .$extends(tsSelectExtend);

describe("Table.* select syntax", () => {
    test("Single table - select User.*", async () => {
        const query = prisma.$from("User")
            .select("User.*");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
        }
// t.assert.snapshot(query.getSQL())
        assert.strictEqual(
            query.getSQL(),
            "SELECT id, email, name, age FROM User;"
        );
    });

    test("Single table - User.* returns all fields without prefix", async () => {
        const result = await prisma.$from("User")
            .select("User.*")
            .run();


        typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
        assert.ok(Array.isArray(result));
    });

    test("Multiple tables - select User.* with join", async () => {
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("User.*");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRowQualified>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age` FROM User JOIN Post ON Post.authorId = User.id;"
        );
    });

    test("Multiple tables - User.* returns all fields with table prefix", async () => {
        const result = await prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("User.*")
            .run();

        typeCheck({} as Expect<Equal<typeof result, Array<UserRowQualified>>>);
        // t.assert.snapshot(result);
        assert.ok(Array.isArray(result));
    });

    test("Multiple tables - select Post.* with join", async () => {
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("Post.*");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<PostRowQualified>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById` FROM User JOIN Post ON Post.authorId = User.id;"
        );
    });

    test("Multiple tables - select both User.* and Post.*", async () => {
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("User.*")
            .select("Post.*");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserPostQualifiedJoinRow>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById` FROM User JOIN Post ON Post.authorId = User.id;"
        );
    });

    test("Mix Table.* with individual column selects", async () => {
        const query = prisma.$from("User")
            .join("Post", "authorId", "User.id")
            .select("User.*")
            .select("Post.title");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<Prettify<UserRowQualified & Pick<PostRow, 'title'>>>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age`, title FROM User JOIN Post ON Post.authorId = User.id;"
        );
    });

    test("Table.* with WHERE clause", async () => {
        const query = prisma.$from("User")
            .where({"id": 1})
            .select("User.*");

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT id, email, name, age FROM User WHERE (id = 1 );"
        );
    });

    test("Table.* with ORDER BY and LIMIT", async () => {
        const query = prisma.$from("User")
            .select("User.*")
            .orderBy(["User.id DESC"])
            .limit(10);

        {
            const result = await query.run();
            typeCheck({} as Expect<Equal<typeof result, Array<UserRow>>>);
        }

        assert.strictEqual(
            query.getSQL(),
            "SELECT id, email, name, age FROM User ORDER BY User.id DESC LIMIT 10;"
        );
    });
});
