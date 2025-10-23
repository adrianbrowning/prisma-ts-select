import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: where clauses", () => {
  test("where columns - should be chainable", () => {
    const query =
// #region columns
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        "User.age": 20,
        "User.name": {op: "LIKE", value: "Stuart%"},
      });
    // #endregion columns

    const expectedSQL =
      // #region columns-sql
      "FROM User JOIN Post ON Post.id = User.name WHERE (User.age = 20 AND  User.name LIKE 'Stuart%' ) AND (User.age = 20 AND  User.name LIKE 'Stuart%' );";
      // #endregion columns-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("where $AND - should be chainable", () => {
    const query =
// #region and
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $AND: [
          {"User.age": {op: ">", value: 20}},
          {"User.age": {op: "<", value: 60}},
        ]
      });
    // #endregion and

    const expectedSQL =
      // #region and-sql
      "FROM User JOIN Post ON Post.id = User.name WHERE ((User.age > 20 ) AND (User.age < 60 ));";
      // #endregion and-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("where $OR - should be chainable", () => {
    const query =
// #region or
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $OR: [
          {"User.name": {op: "LIKE", value: "a%"}},
          {"User.name": {op: "LIKE", value: "d%"}},
        ]
      });
    // #endregion or

    const expectedSQL =
      // #region or-sql
      "FROM User JOIN Post ON Post.id = User.name WHERE ((User.name LIKE 'a%' ) OR (User.name LIKE 'd%' ));";
      // #endregion or-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("where $NOT - should be chainable", () => {
    const query =
// #region not
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $NOT: [
          {"User.age": 20},
          {
            "User.age": {op: "=", value: 60},
            "User.name": "Bob",
          },
        ]
      });
    // #endregion not

    const expectedSQL =
      // #region not-sql
      "FROM User JOIN Post ON Post.id = User.name WHERE (NOT((User.age = 20 ) AND (User.age = 60 AND  User.name = 'Bob' ) AND (User.age = 60 AND  User.name = 'Bob' )));";
      // #endregion not-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("where $NOR - should be chainable", () => {
    const query =
// #region nor
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $NOR: [
          {"User.age": 20},
          {
            "User.age": {op: "!=", value: 60},
            "User.name": "Bob",
          },
        ]
      });
    // #endregion nor

    const expectedSQL =
      // #region nor-sql
      "FROM User JOIN Post ON Post.id = User.name WHERE (NOT((User.age = 20 ) OR (User.age != 60 AND  User.name = 'Bob' ) OR (User.age != 60 AND  User.name = 'Bob' )));";
      // #endregion nor-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("whereNotNull - should generate correct SQL", () => {
    const sql =
// #region not-null
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereNotNull("User.name")
      // #endregion not-null
.getSQL();

    const expectedSQL =
      // #region not-null-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE ((User.name IS NOT NULL ));";
      // #endregion not-null-sql

    assert.equal(sql, expectedSQL);
  });

  test("whereNotNull - should be chainable", () => {
    const query =
// #region not-null
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereNotNull("User.name");
    // #endregion not-null

    const expectedSQL =
      // #region not-null-chainable-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE ((User.name IS NOT NULL ));";
      // #endregion not-null-chainable-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("whereIsNull - should generate correct SQL", () => {
    const sql =
// #region is-null
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereIsNull("Post.content")
      // #endregion is-null
.getSQL();

    const expectedSQL =
      // #region is-null-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE ((Post.content IS NULL ));";
      // #endregion is-null-sql

    assert.equal(sql, expectedSQL);
  });

  test("whereIsNull - should be chainable", () => {
    const query =
// #region is-null
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereIsNull("Post.content");
    // #endregion is-null

    const expectedSQL =
      // #region is-null-chainable-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE ((Post.content IS NULL ));";
      // #endregion is-null-chainable-sql

    assert.equal(query.getSQL(), expectedSQL);
  });

  test("whereRaw - should generate correct SQL", () => {
    const sql =
// #region raw
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereRaw("this is a raw where statement")
      // #endregion raw
.getSQL();

    const expectedSQL =
      // #region raw-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE this is a raw where statement;";
      // #endregion raw-sql

    assert.equal(sql, expectedSQL);
  });

  test("whereRaw - should be chainable", () => {
    const query =
// #region raw
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereRaw("this is a raw where statement");
    // #endregion raw

    const expectedSQL =
      // #region raw-chainable-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE this is a raw where statement;";
      // #endregion raw-chainable-sql

    assert.equal(query.getSQL(), expectedSQL);
  });
});
