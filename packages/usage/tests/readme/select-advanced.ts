import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: select advanced", () => {
  test("selectDistinct - should generate correct SQL", () => {
    // #region distinct
    const sql = prisma.$from("User")
      .selectDistinct()
      .select("*")
      .getSQL();
    // #endregion distinct

    assert.equal(sql,"SELECT DISTINCT * FROM User;");
  });

  test("selectDistinct - should be chainable", () => {
    // #region distinct
    const query = prisma.$from("User")
      .selectDistinct()
      .select("User.name");
    // #endregion distinct

    assert.equal(query.getSQL(), "SELECT DISTINCT name FROM User;");
  });

  test("selectAll single table - should generate correct SQL", () => {
    // #region all-single
    const sql = prisma.$from("User")
      .selectAll()
      .getSQL();
    // #endregion all-single

    assert.strictEqual(sql, "SELECT id, email, name FROM User;");
  });

  test("selectAll single table - should run successfully", async () => {
    // #region all-single
    const result = await prisma.$from("User")
      .selectAll()
      .run();
    // #endregion all-single



      assert.deepEqual(result,  [
             {
               email: 'johndoe@example.com',
               id: 1,
               name: 'John Doe'
         },
         {
           email: 'smith@example.com',
               id: 2,
               name: 'John Smith'
         },
         {
          email: 'alice@example.com',
               id: 3,
               name: null
         }
       ]);

  });

  test("selectAll join table - should generate correct SQL", () => {
    // #region all-join
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .selectAll()
      .getSQL();
    // #endregion all-join

    assert.equal(sql,"SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById` FROM User JOIN Post ON Post.authorId = User.id;");
  });

  test("selectAll join table - should run successfully", async () => {
    // #region all-join
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .selectAll()
      .run();
    // #endregion all-join

    assert.ok(Array.isArray(result));
  });

  test("select Table.* single - should generate correct SQL", () => {
    // #region table-star-single
    const sql = prisma.$from("User")
      .select("User.*")
      .getSQL();
    // #endregion table-star-single

    assert.strictEqual(sql, "SELECT id, email, name FROM User;");
  });

  test("select Table.* single - should run successfully", async () => {
    // #region table-star-single
    const result = await prisma.$from("User")
      .select("User.*")
      .run();
    // #endregion table-star-single

    assert.deepEqual(result,  [
           {
             email: 'johndoe@example.com',
               id: 1,
               name: 'John Doe'
         },
         {
           email: 'smith@example.com',
               id: 2,
               name: 'John Smith'
         },
         {
           email: 'alice@example.com',
               id: 3,
               name: null
         }
       ]);
  });

  test("select Table.* with join - should generate correct SQL", () => {
    // #region table-star-join
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*")
      .getSQL();
    // #endregion table-star-join

    assert.equal(sql,"SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById` FROM User JOIN Post ON Post.authorId = User.id;");
  });

  test("select Table.* with join - should run successfully", async () => {
    // #region table-star-join
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*")
      .run();
    // #endregion table-star-join

    assert.deepEqual(result, [
        {
          'Post.authorId': 1,
            'Post.content': 'Something',
            'Post.id': 1,
            'Post.lastModifiedById': 1,
            'Post.published': false,
            'Post.title': 'Blog 1',
            'User.email': 'johndoe@example.com',
            'User.id': 1,
            'User.name': 'John Doe'
      },
      {
        'Post.authorId': 1,
            'Post.content': 'sql',
            'Post.id': 2,
            'Post.lastModifiedById': 1,
            'Post.published': false,
            'Post.title': 'blog 2',
            'User.email': 'johndoe@example.com',
            'User.id': 1,
            'User.name': 'John Doe'
      },
      {
        'Post.authorId': 2,
            'Post.content': null,
            'Post.id': 3,
            'Post.lastModifiedById': 2,
            'Post.published': false,
            'Post.title': 'blog 3',
            'User.email': 'smith@example.com',
            'User.id': 2,
            'User.name': 'John Smith'
      }
    ]);
  });

  test("select join  chained - should generate correct SQL", () => {
    // #region join-chained
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("name")
      .select("Post.title")
      .getSQL();
    // #endregion join-chained

    assert.strictEqual(sql, "SELECT name, title FROM User JOIN Post ON Post.authorId = User.id;");
  });

  test("select join  chained - should run successfully", async () => {
    // #region join-chained
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("name")
      .select("Post.title")
      .run();
    // #endregion join-chained

    assert.deepEqual(result,    [
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

  test("select aliases with joins - should generate correct SQL", () => {
    // #region aliases-joins
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.name", "authorName")
      .select("Post.title", "postTitle")
      .getSQL();
    // #endregion aliases-joins

    assert.strictEqual(
      sql,
      "SELECT User.name AS `authorName`, Post.title AS `postTitle` FROM User JOIN Post ON Post.authorId = User.id;"
    );
  });

  test("select aliases with joins - should run successfully", async () => {
    // #region aliases-joins
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.name", "authorName")
      .select("Post.title", "postTitle")
      .run();
    // #endregion aliases-joins

    assert.deepEqual(result, [
          {
            authorName: 'John Doe',
            postTitle: 'Blog 1'
      },
      {
        authorName: 'John Doe',
            postTitle: 'blog 2'
      },
      {
        authorName: 'John Smith',
            postTitle: 'blog 3'
      }
    ]);
  });
});
