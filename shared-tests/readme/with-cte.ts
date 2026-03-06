import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { expectSQL } from "../test-utils.ts";
import { prisma } from '#client';

describe("README Example: $with (CTE)", () => {

  test("CTE as joined table - SQL", () => {
// #region join
const posts = prisma.$from("Post").select("id").select("authorId").select("title");

// #endregion
    const sql =
// #region join
prisma.$with("pp", posts)
      .from("User")
      .join("pp", "authorId", "User.id")
    // #endregion
    .getSQL();

    assert.equal(sql,
      // #region join-sql
      "WITH pp AS (SELECT id, authorId, title FROM Post) FROM User JOIN pp ON pp.authorId = User.id;"
      // #endregion join-sql
    );
  });

  test("CTE as base table - SQL", () => {
// #region cte-base
const posts = prisma.$from("Post").select("id").select("title");

// #endregion
    const sql =
// #region cte-base
prisma.$with("pp", posts)
      .from("pp")
      .select("pp.id")
      .select("pp.title")
    // #endregion cte-base
    .getSQL();

    expectSQL(sql,
      // #region cte-base-sql
      "WITH pp AS (SELECT id, title FROM Post) SELECT pp.id AS `pp.id`, pp.title AS `pp.title` FROM pp;"
      // #endregion cte-base-sql
    );
  });

  test("multiple CTEs - SQL", () => {
// #region multi-cte
const posts = prisma.$from("Post").select("id").select("authorId").select("title");
const users = prisma.$from("User").select("id").select("name");

//#endregion
    const sql =
// #region multi-cte
prisma.$with("pp", posts)
      .with("uu", users)
      .from("User")
      .join("pp", "authorId", "User.id")
    // #endregion multi-cte
    .getSQL();

    assert.equal(sql,
      // #region multi-cte-sql
      "WITH pp AS (SELECT id, authorId, title FROM Post), uu AS (SELECT id, name FROM User) FROM User JOIN pp ON pp.authorId = User.id;"
      // #endregion multi-cte-sql
    );
  });
});
