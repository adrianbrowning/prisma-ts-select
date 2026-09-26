import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../test-utils.ts";

describe("README Example: exists / notExists", () => {

  test("exists - correlated", async () => {
    const query =
    // #region exists
      prisma.$from("User")
        .where({
          exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }),
        })
        .select("id")
    // #endregion exists
    ;

    expectSQL(query.getSQL(),
      // #region exists-sql
      "SELECT id FROM User WHERE EXISTS (SELECT 1 FROM Post WHERE Post.authorId = User.id);"
      // #endregion exists-sql
    );
    assert.deepEqual(await query.run(), [{ id: 1 }, { id: 2 }]);
  });

  test("notExists - correlated", async () => {
    const query =
    // #region not-exists
      prisma.$from("User")
        .where({
          notExists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" } }),
        })
        .select("id")
    // #endregion not-exists
    ;

    expectSQL(query.getSQL(),
      // #region not-exists-sql
      "SELECT id FROM User WHERE NOT EXISTS (SELECT 1 FROM Post WHERE Post.authorId = User.id);"
      // #endregion not-exists-sql
    );
    assert.deepEqual(await query.run(), [{ id: 3 }]);
  });

  test("exists - composed with $OR", () => {
    const sql =
    // #region exists-or
      prisma.$from("User")
        .where({
          $OR: [
            { exists: ({ from }) => from("Post").where({ "Post.authorId": { $col: "User.id" }, "Post.published": true }) },
            { age: { op: ">", value: 60 } },
          ],
        })
        .select("id")
      // #endregion exists-or
        .getSQL();

    expectSQL(sql,
      // #region exists-or-sql
      "SELECT id FROM User WHERE (EXISTS (SELECT 1 FROM Post WHERE (Post.authorId = User.id AND Post.published = true)) OR age > 60);"
      // #endregion exists-or-sql
    );
  });

  test("join alternative to exists - one row per matching post", async () => {
    const query =
    // #region exists-join
      prisma.$from("User")
        .join("Post", "authorId", "User.id")
        .select("User.id")
    // #endregion exists-join
    ;

    expectSQL(query.getSQL(),
      // #region exists-join-sql
      "SELECT User.id AS `User.id` FROM User JOIN Post ON Post.authorId = User.id;"
      // #endregion exists-join-sql
    );
    // User 1 wrote two posts, so it comes back twice; `exists` returns it once.
    assert.deepEqual((await query.run()).map(r => r["User.id"]).sort((a, b) => a - b), [ 1, 1, 2 ]);
  });

  test("join alternative to notExists - LEFT JOIN ... IS NULL", async () => {
    const query =
    // #region not-exists-join
      prisma.$from("User")
        .leftJoin("Post", "authorId", "User.id")
        .whereIsNull("Post.id")
        .select("User.id")
    // #endregion not-exists-join
    ;

    expectSQL(query.getSQL(),
      // #region not-exists-join-sql
      "SELECT User.id AS `User.id` FROM User LEFT JOIN Post ON Post.authorId = User.id WHERE (Post.id IS NULL);"
      // #endregion not-exists-join-sql
    );
    assert.deepEqual(await query.run(), [{ "User.id": 3 }]);
  });
});
