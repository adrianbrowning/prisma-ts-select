import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";

// Database seeded via `pnpm p:r`:
// Employees: id=1 name='CEO' managerId=null, id=2 name='Manager' managerId=1, id=3 name='Employee' managerId=2

/** An arm's SQL without its trailing `;` — what the compound splices in. */
const body = (query: { getSQL: () => string; }) => query.getSQL().replace(/;$/, "");

/** A compound's ORDER BY term: one identifier, quoted the way the SELECT aliased it. */
const outCol = (col: string) => dialect.quote(col, col.includes("."));

describe("$union / $unionAll", () => {

  it("should join two arms with UNION", () => {
    const a = prisma.$from("Employee").select("name");
    const b = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const [ aSQL, bSQL ] = [ body(a), body(b) ];

    expectSQL(prisma.$union(a, b).getSQL(), `${aSQL} UNION ${bSQL};`);
  });

  it("should join two arms with UNION ALL", () => {
    const a = prisma.$from("Employee").select("name");
    const b = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const [ aSQL, bSQL ] = [ body(a), body(b) ];

    expectSQL(prisma.$unionAll(a, b).getSQL(), `${aSQL} UNION ALL ${bSQL};`);
  });

  it("should keep three arms in argument order", () => {
    const a = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const b = prisma.$from("Employee").where({ id: { op: ">", value: 1 } })
      .select("name");
    const c = prisma.$from("Employee").select("name");
    const [ aSQL, bSQL, cSQL ] = [ body(a), body(b), body(c) ];

    expectSQL(prisma.$union(a, b, c).getSQL(), `${aSQL} UNION ${bSQL} UNION ${cSQL};`);
  });

  it("should place the compound's ORDER BY / LIMIT / OFFSET after the last arm", () => {
    // Arm 1 carries every clause that precedes the compound operator, so this pins the full order:
    // SELECT … WHERE … GROUP BY … HAVING … UNION ALL SELECT … ORDER BY … LIMIT … OFFSET …
    const a = prisma.$from("Employee")
      .where({ id: { op: ">", value: 0 } })
      .groupBy([ "name" ])
      .having({ name: { op: "!=", value: "nobody" } })
      .select("name");
    const b = prisma.$from("Employee").select("name");
    const [ aSQL, bSQL ] = [ body(a), body(b) ];

    expectSQL(
      prisma.$unionAll(a, b).orderBy([ "name" ])
        .limit(2)
        .offset(1)
        .getSQL(),
      `${aSQL} UNION ALL ${bSQL} ORDER BY ${outCol("name")} LIMIT 2 OFFSET 1;`
    );
  });

  it("should paginate the compound without an ORDER BY", () => {
    const a = prisma.$from("Employee").select("name");
    const b = prisma.$from("Employee").select("name");
    const [ aSQL, bSQL ] = [ body(a), body(b) ];

    expectSQL(
      prisma.$union(a, b).limit(2)
        .offset(1)
        .getSQL(),
      `${aSQL} UNION ${bSQL} LIMIT 2 OFFSET 1;`
    );
    expectSQL(
      prisma.$union(a, b).offset(1)
        .getSQL(),
      `${aSQL} UNION ${bSQL} OFFSET 1;`
    );
  });

  it("should type the result row from the first arm's projection", () => {
    const _query = prisma.$union(
      prisma.$from("Employee").select("id")
        .select("name"),
      prisma.$from("Employee").select("id")
        .select("name")
    );

    type TResult = Awaited<ReturnType<typeof _query.run>>;
    typeCheck({} as Expect<Equal<TResult[number], { id: number; name: string; }>>);
  });

  it("should reject arms whose projections are incompatible", () => {
    const left = prisma.$from("Employee").select("id")
      .select("name");

    prisma.$union(
      left,
      // @ts-expect-error extra column
      prisma.$from("Employee").select("id")
        .select("name")
        .select("managerId")
    );

    prisma.$union(
      left,
      // @ts-expect-error `id` is a string here, a number in `left`
      prisma.$from("Employee").select("name", "id")
        .select("name")
    );

    prisma.$union(
      left,
      // @ts-expect-error missing column
      prisma.$from("Employee").select("id")
    );
  });

  it("should reject an arm that carries its own ORDER BY or LIMIT", () => {
    // SQLite forbids parenthesised arms, so there is no portable encoding for a per-arm
    // ORDER BY / LIMIT. Rejected at compile time, and at runtime for JS callers.
    const left = prisma.$from("Employee").select("name");

    assert.throws(() => prisma.$union(
      left,
      // @ts-expect-error arm carries its own ORDER BY
      prisma.$from("Employee").select("name")
        .orderBy([ "name" ])
    ), /cannot carry its own ORDER BY \/ LIMIT \/ OFFSET/);

    assert.throws(() => prisma.$union(
      left,
      // @ts-expect-error arm carries its own LIMIT
      prisma.$from("Employee").select("name")
        .limit(1)
    ), /cannot carry its own ORDER BY \/ LIMIT \/ OFFSET/);
  });

  it("should reject arms whose columns are in a different order", () => {
    // UNION is positional, but the type check compares key *sets* — a same-arity reordering
    // type-checks and would return wrong-typed values.
    assert.throws(() => prisma.$union(
      prisma.$from("Employee").select("id")
        .select("name"),
      prisma.$from("Employee").select("name")
        .select("id")
    ), /\[name, id\] must match the first arm's columns \[id, name\]/);
  });

  it("should reject a compound ORDER BY on a column the compound does not output", () => {
    const left = prisma.$from("Employee").select("name");
    const right = prisma.$from("Employee").select("name");

    // @ts-expect-error `managerId` is not projected
    prisma.$union(left, right).orderBy([ "managerId" ]);
  });

  it("should take output names from the first arm", () => {
    const _query = prisma.$union(
      prisma.$from("Employee").select("name", "label"),
      prisma.$from("Employee").select("name", "label")
    );

    type TResult = Awaited<ReturnType<typeof _query.run>>;
    typeCheck({} as Expect<Equal<TResult[number], { label: string; }>>);
  });

  it("should keep an arm's DISTINCT inside that arm", () => {
    const a = prisma.$from("Employee").selectDistinct()
      .select("name");
    const b = prisma.$from("Employee").select("name");
    const [ aSQL, bSQL ] = [ body(a), body(b) ];

    assert.match(aSQL, /^SELECT DISTINCT /);
    expectSQL(prisma.$unionAll(a, b).getSQL(), `${aSQL} UNION ALL ${bSQL};`);
  });

  it("should flatten a nested compound left-to-right", () => {
    // SQL compound operators are equal-precedence and left-associative, so a left-nested
    // compound needs no parentheses — which SQLite forbids on arms anyway.
    const a = prisma.$from("Employee").select("name");
    const b = prisma.$from("Employee").whereIsNull("Employee.managerId")
      .select("name");
    const c = prisma.$from("Employee").where({ id: { op: ">", value: 1 } })
      .select("name");
    const [ aSQL, bSQL, cSQL ] = [ body(a), body(b), body(c) ];

    expectSQL(
      prisma.$unionAll(prisma.$union(a, b), c).getSQL(),
      `${aSQL} UNION ${bSQL} UNION ALL ${cSQL};`
    );
  });

  it("should hoist an arm's CTE onto the compound", () => {
    // A `WITH ... AS (...)` prefix inside a compound arm is invalid SQL everywhere.
    const sql = prisma.$unionAll(
      prisma.$with("roots", prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("name"))
        .from("roots")
        .select("roots.name"),
      prisma.$from("Employee").select("name")
    ).getSQL();

    assert.equal(sql.match(/WITH/g)?.length, 1);
    assert.ok(sql.startsWith("WITH "), sql);
  });

  it("should discard duplicates with UNION and keep them with UNION ALL", async () => {
    const arm = () => prisma.$from("Employee").select("name");
    const all = await arm().run();
    const deduped = await prisma.$union(arm(), arm()).run();
    const kept = await prisma.$unionAll(arm(), arm()).run();

    assert.equal(kept.length, all.length * 2);
    assert.equal(deduped.length, new Set(all.map(r => r.name)).size);
  });

  it("should return rows from every arm", async () => {
    const rows = await prisma.$unionAll(
      prisma.$from("Employee").whereIsNull("Employee.managerId")
        .select("name"),
      prisma.$from("Employee").whereNotNull("Employee.managerId")
        .select("name")
    ).run();

    assert.deepEqual(
      rows.map(r => r.name).sort((a, b) => a.localeCompare(b)),
      [ "CEO", "Employee", "Manager" ]
    );
  });

  describe("compound ORDER BY on a multi-table arm", () => {
    // Both sources have an `id`, so the select list aliases them `Post.id` / `User.id` — the
    // compound's output column names then contain a dot. Arms partition the posts, so the
    // ordering has to be applied across both of them.
    const arm = (op: "<=" | ">") => prisma.$from("Post")
      .join("User", "id", "Post.authorId")
      .where({ "Post.id": { op, value: 2 } })
      .select("Post.id")
      .select("User.id");

    const createQuery = () => prisma.$unionAll(arm("<="), arm(">")).orderBy([ "Post.id" ]);

    it("should emit the output column as a single identifier", () => {
      // `"Post"."id"` is a hard error on PostgreSQL and MySQL: after a compound the tables are
      // gone, and the output column is literally named `Post.id`.
      assert.ok(
        createQuery().getSQL()
          .endsWith(`ORDER BY ${outCol("Post.id")};`),
        createQuery().getSQL()
      );
    });

    it("should order rows across both arms", async () => {
      const ids = (await createQuery().run()).map(r => r["Post.id"]);

      assert.ok(ids.length > 1, "needs rows from both arms to be meaningful");
      assert.deepEqual(ids, [ ...ids ].sort((a, b) => a - b));
    });
  });

});
