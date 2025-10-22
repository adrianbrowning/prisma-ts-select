import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import prismaTSSelect from "prisma-ts-select/extend";

const prisma = new PrismaClient().$extends(prismaTSSelect);

describe("README Example: where clauses", () => {
  test("where columns - should be chainable", () => {
    // #region columns
    const query = prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        "User.age": 20,
        "User.name": {op: "LIKE", value: "Stuart%"},
      });
    // #endregion columns

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name WHERE ((User.age = 20 AND User.name LIKE 'Stuart%' ));");
  });

  test("where $AND - should be chainable", () => {
    // #region and
    const query = prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $AND: [
          {"User.age": {op: ">", value: 20}},
          {"User.age": {op: "<", value: 60}},
        ]
      });
    // #endregion and

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name WHERE ((User.age > 20 ) AND (User.age < 60 ));");
  });

  test("where $OR - should be chainable", () => {
    // #region or
    const query = prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.name")
      .where({
        $OR: [
          {"User.name": {op: "LIKE", value: "a%"}},
          {"User.name": {op: "LIKE", value: "d%"}},
        ]
      });
    // #endregion or

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name WHERE ((User.name LIKE 'a%' ) OR (User.name LIKE 'd%' ));");
  });

  test("where $NOT - should be chainable", () => {
    // #region not
    const query = prisma.$from("User")
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

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name WHERE (NOT (User.age = 20 OR (User.age = 60 AND User.name = 'Bob')) );");
  });

  test("where $NOR - should be chainable", () => {
    // #region nor
    const query = prisma.$from("User")
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

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.id = User.name WHERE (NOT (User.age = 20 AND (User.age != 60 AND User.name = 'Bob'))");
  });

  test("whereNotNull - should generate correct SQL", () => {
    // #region not-null
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereNotNull("User.name")
      .getSQL();
    // #endregion not-null

    assert.equal(sql,"FROM User JOIN Post ON Post.authorId = User.id WHERE ((User.name IS NOT NULL ));");
  });

  test("whereNotNull - should be chainable", () => {
    // #region not-null
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereNotNull("User.name");
    // #endregion not-null

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id WHERE ((User.name IS NOT NULL ));");
  });

  test("whereIsNull - should generate correct SQL", () => {
    // #region is-null
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereIsNull("Post.content")
      .getSQL();
    // #endregion is-null

    assert.equal(sql, "FROM User JOIN Post ON Post.authorId = User.id WHERE ((Post.content IS NULL ));");
  });

  test("whereIsNull - should be chainable", () => {
    // #region is-null
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereIsNull("Post.content");
    // #endregion is-null

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id WHERE ((Post.content IS NULL ));");
  });

  test("whereRaw - should generate correct SQL", () => {
    // #region raw
    const sql = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereRaw("this is a raw where statement")
      .getSQL();
    // #endregion raw

    assert.equal(sql,"FROM User JOIN Post ON Post.authorId = User.id WHERE this is a raw where statement;");
  });

  test("whereRaw - should be chainable", () => {
    // #region raw
    const query = prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereRaw("this is a raw where statement");
    // #endregion raw

    assert.equal(query.getSQL(), "FROM User JOIN Post ON Post.authorId = User.id WHERE this is a raw where statement;");
  });
});
