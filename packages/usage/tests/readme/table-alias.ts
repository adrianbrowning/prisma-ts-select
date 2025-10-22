import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: table aliases", () => {
  test("inline alias with joins - should generate correct SQL", () => {
    // #region inline-join
    const sql = prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.name")
      .select("p.title")
      .getSQL();
    // #endregion inline-join

    assert.strictEqual(
      sql,
      "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;"
    );
  });

  test("inline alias with joins - should run successfully", async () => {
    // #region inline-join
    const result = await prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.name")
      .select("p.title")
      .run();
    // #endregion inline-join

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
    // #region object-join
    const sql = prisma.$from("User u")
      .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
      .select("u.name")
      .select("p.title")
      .getSQL();
    // #endregion object-join

    assert.strictEqual(
      sql,
      "SELECT name, title FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;"
    );
  });

  test("object syntax joins - should run successfully", async () => {
    // #region object-join
    const result = await prisma.$from("User u")
      .join({table: "Post", src: "authorId", on: "u.id", alias: "p"})
      .select("u.name")
      .select("p.title")
      .run();
    // #endregion object-join

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
    // #region self-join
    const query = prisma.$from("User u1")
      .joinUnsafeTypeEnforced("User u2", "id", "u1.id");
    // #endregion self-join

    assert.equal(query.getSQL(), "FROM User AS `u1` JOIN User AS `u2` ON u2.id = u1.id;");
  });

  test("table.* with alias single - should generate correct SQL", () => {
    // #region star-single
    const sql = prisma.$from("User u")
      .select("u.*")
      .getSQL();
    // #endregion star-single

    assert.strictEqual(
      sql,
      "SELECT id, email, name FROM User AS `u`;"
    );
  });

  test("table.* with alias single - should run successfully", async () => {
    // #region star-single
    const result = await prisma.$from("User u")
      .select("u.*")
      .run();
    // #endregion star-single

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
    // #region star-join
    const sql = prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.*")
      .select("p.*")
      .getSQL();
    // #endregion star-join

    assert.equal(sql,"SELECT u.id AS `u.id`, u.email AS `u.email`, u.name AS `u.name`, p.id AS `p.id`, p.title AS `p.title`, p.content AS `p.content`, p.published AS `p.published`, p.authorId AS `p.authorId`, p.lastModifiedById AS `p.lastModifiedById` FROM User AS `u` JOIN Post AS `p` ON p.authorId = u.id;");
  });

  test("table.* with alias joins - should run successfully", async () => {
    // #region star-join
    const result = await prisma.$from("User u")
      .join("Post p", "authorId", "u.id")
      .select("u.*")
      .select("p.*")
      .run();
    // #endregion star-join

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
