import { describe, test } from "node:test";
import { prisma } from "#client";
import { expectSQL } from "../test-utils.ts";

describe("README Example: $union / $unionAll", () => {

  test("UNION - SQL", () => {
    // #region union
    const managers = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const everyone = prisma.$from("Employee").select("name");

    // #endregion
    const sql =
    // #region union
      prisma.$union(managers, everyone)
        .orderBy([ "name" ])
        .limit(10)
      // #endregion union
        .getSQL();

    expectSQL(sql,
      // #region union-sql
      "SELECT name FROM Employee WHERE (Employee.managerId IS NULL) UNION SELECT name FROM Employee ORDER BY name LIMIT 10;"
      // #endregion union-sql
    );
  });

  test("UNION ALL - SQL", () => {
    // #region union-all
    const roots = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const rest = prisma.$from("Employee").whereNotNull("Employee.managerId")
      .select("name");

    // #endregion
    const sql =
    // #region union-all
      prisma.$unionAll(roots, rest)
      // #endregion union-all
        .getSQL();

    expectSQL(sql,
      // #region union-all-sql
      "SELECT name FROM Employee WHERE (Employee.managerId IS NULL) UNION ALL SELECT name FROM Employee WHERE (Employee.managerId IS NOT NULL);"
      // #endregion union-all-sql
    );
  });

  test("mixed operators by nesting - SQL", () => {
    // #region union-nested
    const a = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const b = prisma.$from("Employee").whereNotNull("Employee.managerId")
      .select("name");
    const c = prisma.$from("Employee").select("name");

    // #endregion
    const sql =
    // #region union-nested
      prisma.$unionAll(prisma.$union(a, b), c)
      // #endregion union-nested
        .getSQL();

    expectSQL(sql,
      // #region union-nested-sql
      "SELECT name FROM Employee WHERE (Employee.managerId IS NULL) UNION SELECT name FROM Employee WHERE (Employee.managerId IS NOT NULL) UNION ALL SELECT name FROM Employee;"
      // #endregion union-nested-sql
    );
  });
});
