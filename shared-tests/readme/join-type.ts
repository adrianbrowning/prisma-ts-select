import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: join type", () => {
  test("LEFT JOIN", () => {
    const sql =
// #region join-type-left
prisma.$from("User")
      .join("Post", "authorId", "User.id", { joinType: "LEFT" })
    // #endregion join-type-left
    .getSQL();

    assert.equal(sql,
      // #region join-type-left-sql
      "FROM User LEFT JOIN Post ON Post.authorId = User.id;"
      // #endregion join-type-left-sql
    );
  });

  test("CROSS JOIN (no ON clause)", () => {
    const sql =
// #region join-type-cross
prisma.$from("User")
      .joinUnsafeIgnoreType("Post", "id", "User.id", { joinType: "CROSS" })
    // #endregion join-type-cross
    .getSQL();

    assert.equal(sql,
      // #region join-type-cross-sql
      "FROM User CROSS JOIN Post;"
      // #endregion join-type-cross-sql
    );
  });

  test("joinType + where", () => {
    const sql =
// #region join-type-with-where
prisma.$from("User")
      .join("Post", "authorId", "User.id", {
        joinType: "LEFT",
        where: { "Post.published": true }
      })
    // #endregion join-type-with-where
    .getSQL();

    assert.equal(sql,
      // #region join-type-with-where-sql
      "FROM User LEFT JOIN Post ON Post.authorId = User.id AND Post.published = true;"
      // #endregion join-type-with-where-sql
    );
  });
});
