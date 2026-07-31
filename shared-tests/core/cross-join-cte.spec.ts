import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../test-utils.ts";
import type { Equal, Expect } from "../utils.ts";
import { typeCheck } from "../utils.ts";

describe("crossJoin with CTE", () => {

  test("crossJoin accepts CTE name and emits CROSS JOIN", () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const query = prisma
      .$with("pp", inner)
      .from("User")
      .crossJoin("pp");

    const qpp = dialect.quoteTableIdentifier("pp", false);
    const qUser = dialect.quoteTableIdentifier("User", false);
    const innerSQL = inner.getSQL().replace(/;$/, "");

    expectSQL(query.getSQL(),
      `WITH ${qpp} AS (${innerSQL}) FROM ${qUser} CROSS JOIN ${qpp};`
    );
  });

  test("crossJoin CTE - fields are typed correctly", () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const _query = prisma
      .$with("pp", inner)
      .from("User")
      .crossJoin("pp")
      .select("*");

    type TResult = Awaited<ReturnType<typeof _query.run>>;
    typeCheck({} as Expect<Equal<TResult[number]["pp.id"], number>>);
    typeCheck({} as Expect<Equal<TResult[number]["pp.title"], string>>);
  });

  test("crossJoinUnsafeTypeEnforced accepts CTE name", () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const query = prisma
      .$with("pp", inner)
      .from("User")
      .crossJoinUnsafeTypeEnforced("pp");

    const qpp = dialect.quoteTableIdentifier("pp", false);
    const qUser = dialect.quoteTableIdentifier("User", false);
    const innerSQL = inner.getSQL().replace(/;$/, "");

    expectSQL(query.getSQL(),
      `WITH ${qpp} AS (${innerSQL}) FROM ${qUser} CROSS JOIN ${qpp};`
    );
  });

  test("crossJoinUnsafeIgnoreType accepts CTE name", () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const query = prisma
      .$with("pp", inner)
      .from("User")
      .crossJoinUnsafeIgnoreType("pp");

    const qpp = dialect.quoteTableIdentifier("pp", false);
    const qUser = dialect.quoteTableIdentifier("User", false);
    const innerSQL = inner.getSQL().replace(/;$/, "");

    expectSQL(query.getSQL(),
      `WITH ${qpp} AS (${innerSQL}) FROM ${qUser} CROSS JOIN ${qpp};`
    );
  });

  test("crossJoin rejects unknown string (not a CTE or related model)", () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const query = prisma
      .$with("pp", inner)
      .from("User");

    // @ts-expect-error "NotATable" is neither a CTE nor a related model
    query.crossJoin("NotATable");
    // @ts-expect-error same for unsafe variants
    query.crossJoinUnsafeTypeEnforced("NotATable");
    // @ts-expect-error same for unsafe variants
    query.crossJoinUnsafeIgnoreType("NotATable");
  });

  test("crossJoin CTE - runtime returns cartesian product", async () => {
    const inner = prisma.$from("Post").select("id")
      .select("title");
    const result = await prisma
      .$with("pp", inner)
      .from("User")
      .crossJoin("pp")
      .select("*")
      .run();

    // 3 users × 3 posts = 9 rows
    assert.equal(result.length, 9);
    // Every row has User fields and CTE fields
    for (const row of result) {
      assert.ok("User.id" in row);
      assert.ok("pp.id" in row);
      assert.ok("pp.title" in row);
    }
  });
});
