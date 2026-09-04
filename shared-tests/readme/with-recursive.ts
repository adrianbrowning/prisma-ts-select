import { describe, test } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../test-utils.ts";

describe("README Example: $withRecursive (recursive CTE)", () => {

  test("hierarchy traversal - SQL", () => {
    // #region recursive
    const roots = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("id")
      .select("name");

    // #endregion
    const sql =
    // #region recursive
      prisma.$withRecursive("tree", roots, w => w.from("Employee")
        .join("tree", "id", "Employee.managerId")
        .select("Employee.id")
        .select("Employee.name"))
        .from("tree")
        .select("tree.name")
      // #endregion recursive
        .getSQL();

    expectSQL(sql,
      // #region recursive-sql
      "WITH RECURSIVE tree(id, name) AS (SELECT id, name FROM Employee WHERE (Employee.managerId IS NULL) UNION ALL SELECT Employee.id AS `Employee.id`, Employee.name AS `Employee.name` FROM Employee JOIN tree ON tree.id = Employee.managerId) SELECT tree.name AS `tree.name` FROM tree;"
      // #endregion recursive-sql
    );
  });
});
