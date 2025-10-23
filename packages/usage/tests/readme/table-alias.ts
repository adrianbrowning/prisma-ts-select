import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: table aliases", () => {
  test("inline alias with joins - should generate correct SQL", () => {
    const sql =
// #region inline-join
prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.name")
      .select("p.title")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region inline-join-sql
      "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;";
    // #endregion inline-join-sql

    assert.strictEqual(sql, expectedSQL);
  });

  test("inline alias with joins - should run successfully", async () => {
    // #region inline-join
    const result = await prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.name")
      .select("p.title")
      // #endregion
.run();

    assert.deepEqual(result,
      [
            {
              name: 'John Doe',
            title: 'Blog 1'
      },
      {
        name: 'John Doe',
            title: 'blog 2'
      },
      {
        name: 'John Smith',
            title: 'blog 3'
      }
    ]);

  });

  test("object syntax joins - should generate correct SQL", () => {
    const sql =
// #region object-join
prisma.$from("User u")
      .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
      .select("u.name")
      .select("p.title")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region object-join-sql
      "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;";
    // #endregion object-join-sql

    assert.strictEqual(sql, expectedSQL);
  });

  test("object syntax joins - should run successfully", async () => {
    // #region object-join
    const result = await prisma.$from("User u")
      .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
      .select("u.name")
      .select("p.title")
      // #endregion
.run();

      assert.deepEqual(result,   [
             {
               name: 'John Doe',
               title: 'Blog 1'
         },
         {
           name: 'John Doe',
               title: 'blog 2'
         },
         {
           name: 'John Smith',
               title: 'blog 3'
         }
       ]);
  });

  test("self-joins with aliases - should create query", () => {

      prisma.$from("User u1")
          //@ts-expect-error This should error as User has no defined self join
          .join("User u2",
              "id", "u1.id")
          .select("u1.name", "user1Name")
          //@ts-expect-error This should error as User has no defined self join
          .select("u2.name", "user2Name");

      const query =
// #region self-join
prisma.$from("User u1")
      .joinUnsafeTypeEnforced("User u2", "id", "u1.id")
      .select("u1.name", "user1Name")
      .select("u2.name", "user2Name");
    // #endregion self-join

      prisma.$from("User u1")
          .joinUnsafeTypeEnforced({
              table: "User",
              alias: "u2",
              src: "id",
              on: "u1.id"
          })
          .select("u1.name", "user1Name")
          .select("u2.name", "user2Name");

      // #region self-join
      prisma.$from("User u1")
          .joinUnsafeIgnoreType("User u2", "id", "u1.id")
          .select("u1.name", "user1Name")
          .select("u2.name", "user2Name");
      // #endregion self-join

      prisma.$from("User u1")
          .joinUnsafeIgnoreType({
              table: "User",
              alias: "u2",
              src: "id",
              on: "u1.id"
          })
          .select("u1.name", "user1Name")
          .select("u2.name", "user2Name");

    const expectedSQL =
      // #region self-join-sql
      "SELECT u1.name AS `user1Name`, u2.name AS `user2Name` FROM User AS `u1` JOIN User AS `u2` ON u2.id = u1.id;";
    // #endregion self-join-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("table.* with alias single - should generate correct SQL", () => {
    const sql =
// #region star-single
prisma.$from("User u")
      .select("u.*")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region star-single-sql
      "SELECT id, email, name FROM User AS `u`;";
    // #endregion star-single-sql

    assert.strictEqual(sql, expectedSQL);
  });

  test("table.* with alias single - should run successfully", async () => {
    // #region star-single
    const result = await prisma.$from("User u")
      .select("u.*")
      // #endregion
.run();

   assert.deepEqual(result, [
      {
          id: 1,
        name: 'John Doe',
           email: 'johndoe@example.com'
     },
     {
         id: 2,
       name: 'John Smith',
           email: 'smith@example.com'
     },
     {
         id: 3,
       name: null,
           email: 'alice@example.com'
     }
       ]);
  });

  test("table.* with alias joins - should generate correct SQL", () => {
    const sql =
// #region star-join
prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.*")
      .select("p.*")
      // #endregion
.getSQL();

    const expectedSQL =
      // #region star-join-sql
      "SELECT u.id AS `u.id`, u.email AS `u.email`, u.name AS `u.name`, p.id AS `p.id`, p.title AS `p.title`, p.content AS `p.content`, p.published AS `p.published`, p.authorId AS `p.authorId`, p.lastModifiedById AS `p.lastModifiedById` FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;";
    // #endregion star-join-sql

    assert.equal(sql, expectedSQL);
  });

  test("table.* with alias joins - should run successfully", async () => {
    // #region star-join
    const result = await prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.*")
      .select("p.*")
      // #endregion
.run();

      assert.deepEqual(result, [
         {
           'p.authorId': 1,
           'p.content': 'Something',
           'p.id': 1,
           'p.lastModifiedById': 1,
           'p.published': false,
           'p.title': 'Blog 1',
           'u.email': 'johndoe@example.com',
           'u.id': 1,
           'u.name': 'John Doe'
     },
     {
       'p.authorId': 1,
           'p.content': 'sql',
           'p.id': 2,
           'p.lastModifiedById': 1,
           'p.published': false,
           'p.title': 'blog 2',
           'u.email': 'johndoe@example.com',
           'u.id': 1,
           'u.name': 'John Doe'
     },
     {
       'p.authorId': 2,
           'p.content': null,
           'p.id': 3,
           'p.lastModifiedById': 2,
           'p.published': false,
           'p.title': 'blog 3',
           'u.email': 'smith@example.com',
           'u.id': 2,
           'u.name': 'John Smith'
     }
       ]);
  });
});
