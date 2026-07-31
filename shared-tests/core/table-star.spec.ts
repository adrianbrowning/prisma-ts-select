import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";
import type { PostRow, PostRowQualified, UserPostQualifiedJoinRow, UserRow, UserRowQualified } from "../types.js";
import { typeCheck } from "../utils.ts";
import type { Equal, Expect, Prettify } from "../utils.ts";

describe("Table.* select syntax", () => {
  test("Single table - select User.*", async () => {
    const query = prisma.$from("User")
      .select("User.*");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<UserRow>>>);
    }
    // t.assert.snapshot(query.getSQL())
    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quote("id")}, ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")};`
    );
  });

  test("Single table - User.* returns all fields without prefix", async () => {
    const _result = await prisma.$from("User")
      .select("User.*")
      .run();

    typeCheck({} as Expect<Equal<typeof _result, Array<UserRow>>>);
    assert.ok(Array.isArray(_result));
  });

  test("Multiple tables - select User.* with join", async () => {
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<UserRowQualified>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
    );
  });

  test("Multiple tables - User.* returns all fields with table prefix", async () => {
    const _result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .run();

    typeCheck({} as Expect<Equal<typeof _result, Array<UserRowQualified>>>);
    // t.assert.snapshot(_result);
    assert.ok(Array.isArray(_result));
  });

  test("Multiple tables - select Post.* with join", async () => {
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("Post.*");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<PostRowQualified>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
    );
  });

  test("Multiple tables - select both User.* and Post.*", async () => {
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<UserPostQualifiedJoinRow>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quoteQualifiedColumn("Post.id")} AS ${dialect.quote("Post.id", true)}, ${dialect.quoteQualifiedColumn("Post.title")} AS ${dialect.quote("Post.title", true)}, ${dialect.quoteQualifiedColumn("Post.content")} AS ${dialect.quote("Post.content", true)}, ${dialect.quoteQualifiedColumn("Post.published")} AS ${dialect.quote("Post.published", true)}, ${dialect.quoteQualifiedColumn("Post.createdAt")} AS ${dialect.quote("Post.createdAt", true)}, ${dialect.quoteQualifiedColumn("Post.authorId")} AS ${dialect.quote("Post.authorId", true)}, ${dialect.quoteQualifiedColumn("Post.lastModifiedById")} AS ${dialect.quote("Post.lastModifiedById", true)}, ${dialect.quoteQualifiedColumn("Post.metadata")} AS ${dialect.quote("Post.metadata", true)} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
    );
  });

  test("Mix Table.* with individual column selects", async () => {
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.title");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<Prettify<UserRowQualified & Pick<PostRow, "title">>>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quoteQualifiedColumn("User.id")} AS ${dialect.quote("User.id", true)}, ${dialect.quoteQualifiedColumn("User.email")} AS ${dialect.quote("User.email", true)}, ${dialect.quoteQualifiedColumn("User.name")} AS ${dialect.quote("User.name", true)}, ${dialect.quoteQualifiedColumn("User.age")} AS ${dialect.quote("User.age", true)}, ${dialect.quote("title")} FROM ${dialect.quote("User")} JOIN ${dialect.quote("Post")} ON ${dialect.quoteQualifiedColumn("Post.authorId")} = ${dialect.quoteQualifiedColumn("User.id")};`
    );
  });

  test("Table.* with WHERE clause", async () => {
    const query = prisma.$from("User")
      .where({ "id": 1 })
      .select("User.*");

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<UserRow>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quote("id")}, ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")} WHERE ${dialect.quote("id")} = 1;`
    );
  });

  test("Table.* with ORDER BY and LIMIT", async () => {
    const query = prisma.$from("User")
      .select("User.*")
      .orderBy([ "User.id DESC" ])
      .limit(10);

    {
      const _result = await query.run();
      typeCheck({} as Expect<Equal<typeof _result, Array<UserRow>>>);
    }

    expectSQL(
      query.getSQL(),
      `SELECT ${dialect.quote("id")}, ${dialect.quote("email")}, ${dialect.quote("name")}, ${dialect.quote("age")} FROM ${dialect.quote("User")} ORDER BY ${dialect.quoteOrderByClause("User.id DESC")} LIMIT 10;`
    );
  });
});
