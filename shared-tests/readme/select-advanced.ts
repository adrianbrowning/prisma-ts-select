import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { expectSQL } from "../test-utils.ts";


import { prisma } from '#client';

describe("README Example: select advanced", () => {
  test("selectDistinct - should generate correct SQL", () => {
    const sql =
// #region distinct-1
prisma.$from("User")
      .selectDistinct()
      .select("name")
      // #endregion distinct
.getSQL();

    const expectedSQL =
      // #region distinct-sql
      "SELECT DISTINCT name FROM User;";
      // #endregion distinct-sql

    assert.equal(sql, expectedSQL);
  });

  test("selectDistinct - should be chainable", () => {
    const query =
// #region distinct
prisma.$from("User")
      .selectDistinct()
      .select("User.name");
    // #endregion distinct

    assert.equal(query.getSQL(), "SELECT DISTINCT name FROM User;");
  });

  test("selectAll single table - should generate correct SQL", () => {
    const $from =
// #region all-single
prisma.$from("User")
      .selectAll();
      // #endregion all-single
const sql = $from.getSQL();

    const expectedSQL =
      // #region all-single-sql
      "SELECT id, email, name, age FROM User;";
      // #endregion all-single-sql

    expectSQL(sql, expectedSQL);
  });

  test("selectAll single table - should run successfully", async () => {
    // #region all-single-full
    const result = await prisma.$from("User")
      .selectAll()
      // #endregion all-single
.run();



      assert.deepEqual(result,  [
             {
               email: 'johndoe@example.com',
               id: 1,
               name: 'John Doe',
                 age: 25
         },
         {
           email: 'smith@example.com',
               id: 2,
               name: 'John Smith',
             age: 30
         },
         {
          email: 'alice@example.com',
               id: 3,
               name: null,
             age:null
         }
       ]);

  });

  test("selectAll join table - should generate correct SQL", () => {
    const $sql =
// #region all-join
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .selectAll();
      // #endregion all-join
const sql = $sql.getSQL();

    const expectedSQL =
      // #region all-join-sql
      "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.createdAt AS `Post.createdAt`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById`, Post.metadata AS `Post.metadata` FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion all-join-sql

    assert.equal(sql, expectedSQL);
  });

  test("selectAll join table - should run successfully", async () => {
    // #region all-join-full
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .selectAll()
      // #endregion all-join
.run();

    assert.ok(Array.isArray(result));
  });

  test("select Table.* single - should generate correct SQL", () => {
    const $sql =
// #region table-star-single
prisma.$from("User")
      .select("User.*");
      // #endregion table-star-single
      const sql = $sql.getSQL();

    const expectedSQL =
      // #region table-star-single-sql
      "SELECT id, email, name, age FROM User;";
      // #endregion table-star-single-sql

    expectSQL(sql, expectedSQL);
  });

  test("select Table.* single - should run successfully", async () => {
    // #region table-star-single-2
    const result = await prisma.$from("User")
      .select("User.*")
      // #endregion table-star-single
.run();

    assert.deepEqual(result,  [
           {
               age: 25,
             email: 'johndoe@example.com',
               id: 1,
               name: 'John Doe'
         },
         {
             age: 30,
           email: 'smith@example.com',
               id: 2,
               name: 'John Smith'
         },
         {
             age: null,
           email: 'alice@example.com',
               id: 3,
               name: null
         }
       ]);
  });

  test("select Table.* with join - should generate correct SQL", () => {
    const $sql =
// #region table-star-join
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*");
      // #endregion table-star-join
      const sql = $sql.getSQL();

    const expectedSQL =
      // #region table-star-join-sql
      "SELECT User.id AS `User.id`, User.email AS `User.email`, User.name AS `User.name`, User.age AS `User.age`, Post.id AS `Post.id`, Post.title AS `Post.title`, Post.content AS `Post.content`, Post.published AS `Post.published`, Post.createdAt AS `Post.createdAt`, Post.authorId AS `Post.authorId`, Post.lastModifiedById AS `Post.lastModifiedById`, Post.metadata AS `Post.metadata` FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion table-star-join-sql

    assert.equal(sql, expectedSQL);
  });

  test("select Table.* with join - should run successfully", async () => {
    // #region table-star-join-2
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.*")
      .select("Post.*")
      // #endregion table-star-join
.run();

    assert.deepEqual(result, [
        {
          'Post.authorId': 1,
            'Post.content': 'Something',
            'Post.id': 1,
            'Post.lastModifiedById': 1,
            'Post.metadata': { name: 'Blog Post 1', tags: ['prisma', 'ts'] },
            'Post.published': false,
            'Post.createdAt': new Date("2020-01-15T10:30:00.000Z"),
            'Post.title': 'Blog 1',
            'User.email': 'johndoe@example.com',
            'User.id': 1,
            'User.name': 'John Doe',
            "User.age": 25
      },
      {
        'Post.authorId': 1,
            'Post.content': 'sql',
            'Post.id': 2,
            'Post.lastModifiedById': 1,
            'Post.metadata': null,
            'Post.published': false,
          'Post.createdAt': new Date("2020-06-20T14:45:00.000Z"),
            'Post.title': 'blog 2',
            'User.email': 'johndoe@example.com',
            'User.id': 1,
            'User.name': 'John Doe',
          "User.age": 25
      },
      {
        'Post.authorId': 2,
            'Post.content': null,
            'Post.id': 3,
            'Post.lastModifiedById': 2,
            'Post.metadata': null,
            'Post.published': false,
           'Post.createdAt': new Date("2021-12-25T08:00:00.000Z"),
            'Post.title': 'blog 3',
            'User.email': 'smith@example.com',
            'User.id': 2,
            'User.name': 'John Smith',
          "User.age": 30
      }
    ]);
  });

  test("select join  chained - should generate correct SQL", () => {
    const $sql =
// #region join-chained
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("name")
      .select("Post.title");
      // #endregion join-chained
      const sql = $sql.getSQL();

    const expectedSQL =
      // #region join-chained-sql
      "SELECT name, title FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion join-chained-sql

    expectSQL(sql, expectedSQL);
  });

  test("select join  chained - should run successfully", async () => {
    // #region join-chained-run
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("name")
      .select("Post.title")
      // #endregion join-chained
.run();

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
    const $sql =
// #region aliases-joins
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.name", "authorName")
      .select("Post.title", "postTitle");
      // #endregion aliases-joins
      const sql = $sql.getSQL();

    const expectedSQL =
      // #region aliases-joins-sql
      "SELECT User.name AS `authorName`, Post.title AS `postTitle` FROM User JOIN Post ON Post.authorId = User.id;";
      // #endregion aliases-joins-sql

    expectSQL(sql, expectedSQL);
  });

  test("select aliases with joins - should run successfully", async () => {
    // #region aliases-joins-run
    const result = await prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .select("User.name", "authorName")
      .select("Post.title", "postTitle")
      // #endregion aliases-joins
.run();

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
