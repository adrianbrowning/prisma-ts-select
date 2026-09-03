import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";

// Database seeded via `pnpm p:r`:
// Employees: id=1 name='CEO' managerId=null, id=2 name='Manager' managerId=1, id=3 name='Employee' managerId=2

const q = (col: string) => dialect.quote(col);
const qq = (col: string) => dialect.quoteQualifiedColumn(col);
const qt = (table: string) => dialect.quoteTableIdentifier(table, false);

describe("$withRecursive (recursive CTE)", () => {

  function createQuery() {
    return prisma.$withRecursive(
      "tree",
      prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("id")
        .select("name"),
      w => w.from("Employee")
        .join("tree", "id", "Employee.managerId")
        .select("Employee.id")
        .select("Employee.name")
    )
      .from("tree")
      .select("tree.name");
  }

  it("should generate WITH RECURSIVE <name>(cols) AS (anchor UNION ALL recursive)", () => {
    const anchor = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("id")
      .select("name");
    const anchorSQL = anchor.getSQL().replace(/;$/, "");
    const recursiveSQL = [
      // qualified + aliased: bare `id`/`name` would be ambiguous against the self-referenced CTE.
      // Projection names are irrelevant — the CTE's column names come from the header list.
      `SELECT ${qq("Employee.id")} AS ${dialect.quote("Employee.id", true)}, ${qq("Employee.name")} AS ${dialect.quote("Employee.name", true)}`,
      `FROM ${q("Employee")}`,
      `JOIN ${qt("tree")} ON ${qq("tree.id")} = ${qq("Employee.managerId")}`,
    ].join(" ");

    expectSQL(createQuery().getSQL(), [
      `WITH RECURSIVE ${qt("tree")}(${q("id")}, ${q("name")}) AS`,
      `(${anchorSQL} UNION ALL ${recursiveSQL})`,
      `SELECT ${qq("tree.name")} AS ${dialect.quote("tree.name", true)}`,
      `FROM ${qt("tree")};`,
    ].join(" "));
  });

  it("should traverse the whole management chain from the root", async () => {
    const rows = await createQuery().run();

    assert.deepEqual(
      rows.map(r => r["tree.name"]).sort((a, b) => a.localeCompare(b)),
      [ "CEO", "Employee", "Manager" ]
    );
  });

  it("should type the result row from the anchor's projection", () => {
    const _query = createQuery();

    type TResult = Awaited<ReturnType<typeof _query.run>>;
    typeCheck({} as Expect<Equal<TResult[number]["tree.name"], string>>);
  });

  it("should hoist a CTE added inside the recursive member onto the outer WITH", () => {
    // A `WITH ... AS (...)` prefix inside the UNION ALL body is invalid SQL everywhere.
    const query = prisma.$withRecursive(
      "tree",
      prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("id")
        .select("name"),
      w => w.with("extra", prisma.$from("Employee").select("id"))
        .from("Employee")
        .join("tree", "id", "Employee.managerId")
        .select("Employee.id")
        .select("Employee.name")
    )
      .from("tree")
      .select("tree.name");

    const sql = query.getSQL();
    assert.equal(sql.match(/WITH/g)?.length, 1);
    assert.match(sql, new RegExp(`WITH RECURSIVE ${qt("extra")} AS \\(.*\\), ${qt("tree")}\\(`));
  });

  it("should reject a recursive member that projects a different shape", () => {
    assert.throws(() => prisma.$withRecursive(
      "tree",
      prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("id")
        .select("name"),
      // @ts-expect-error recursive member must project the same columns as the anchor
      w => w.from("Employee")
        .join("tree", "id", "Employee.managerId")
        .select("Employee.id")
    ), /must match the anchor columns/);
  });

  it("should reject a recursive member whose columns are in a different order", () => {
    // UNION ALL is positional, so a same-arity reordering would silently return wrong rows.
    assert.throws(() => prisma.$withRecursive(
      "tree",
      prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("id")
        .select("name"),
      w => w.from("Employee")
        .join("tree", "id", "Employee.managerId")
        .select("Employee.name")
        .select("Employee.id")
    ), /\[name, id\] must match the anchor columns \[id, name\]/);
  });

});
