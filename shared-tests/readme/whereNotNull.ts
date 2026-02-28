import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { prisma } from '#client';

describe("README Example: whereNotNull / whereIsNull", () => {

  test("whereNotNull — SQL", () => {
    const sql =
// #region whereNotNull
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereNotNull("User.name")
      // #endregion whereNotNull
.getSQL();

    const expectedSQL =
      // #region whereNotNull-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE (User.name IS NOT NULL);";
      // #endregion whereNotNull-sql

    assert.equal(sql, expectedSQL);
  });

  test("whereIsNull — SQL", () => {
    const sql =
// #region whereIsNull
prisma.$from("User")
      .join("Post", "authorId", "User.id")
      .whereIsNull("Post.content")
      // #endregion whereIsNull
.getSQL();

    const expectedSQL =
      // #region whereIsNull-sql
      "FROM User JOIN Post ON Post.authorId = User.id WHERE (Post.content IS NULL);";
      // #endregion whereIsNull-sql

    assert.equal(sql, expectedSQL);
  });

  test("whereNotNull — chained, narrows type", async () => {
    // #region whereNotNull-chain
    const result = await prisma.$from("User")
      .whereNotNull("User.name")
      .whereNotNull("User.age")
      .selectAll()
      // #endregion whereNotNull-chain
      .run();

    assert.ok(result.every(r => r.name !== null && r.age !== null));
  });

});
