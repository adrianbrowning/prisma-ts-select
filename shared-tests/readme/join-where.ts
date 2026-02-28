import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: join with where", () => {
  test("simple condition", () => {
    const sql =
// #region join-where-example
prisma.$from("User")
      .join("Post", "authorId", "User.id", { where: { "Post.published": true } })
    // #endregion join-where-example
    .getSQL();

    assert.equal(sql,
      // #region join-where-sql
      "FROM User JOIN Post ON Post.authorId = User.id AND Post.published = true;"
      // #endregion join-where-sql
    );
  });

  test("logical ops ($AND)", () => {
    const sql =
// #region join-where-ops-example
prisma.$from("User")
      .join("Post", "authorId", "User.id", {
        where: {
          $AND: [
            { "Post.published": true },
            { "Post.id": { op: ">", value: 0 } }
          ]
        }
      })
    // #endregion join-where-ops-example
    .getSQL();

    assert.equal(sql,
      // #region join-where-ops-sql
      "FROM User JOIN Post ON Post.authorId = User.id AND (Post.published = true AND Post.id > 0);"
      // #endregion join-where-ops-sql
    );
  });
});
