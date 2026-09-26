import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// SQLite has no column type for a window result, so Prisma reads its storage class: integers,
// booleans and v6 DateTimes are INTEGER (bigint), JSON and v7 DateTimes are TEXT. Prisma v6
// also reads the whole result column as TEXT when its first row is NULL, which a LAG without a
// default always is.
describe("SQLite dialect — window navigation result types", () => {
  function createQuery() {
    return prisma.$from("Post")
      .select("id")
      .select(({ over, lag }) => over(lag("id"), { orderBy: [ "id" ] }), "prevId")
      .select(({ over, lead }) => over(lead("published"), { orderBy: [ "id" ] }), "nextPublished")
      .select(({ over, firstValue }) => over(firstValue("createdAt"), { orderBy: [ "id" ] }), "firstCreatedAt")
      .select(({ over, firstValue }) => over(firstValue("metadata"), { orderBy: [ "id" ] }), "firstMetadata")
      .orderBy([ "id" ]);
  }

  it("type: scalars widen to bigint or text, JSON is text", async () => {
    const _result = await createQuery().run();
    typeCheck({} as Expect<Equal<typeof _result, Array<{
      id: number;
      prevId: bigint | number | string | null;
      nextPublished: bigint | string | null;
      firstCreatedAt: bigint | string;
      firstMetadata: string | null;
    }>>>);
  });

  it("should return values inside the declared representation", async () => {
    const result = await createQuery().run();
    assert.deepStrictEqual(result.map(r => r.prevId === null ? null : Number(r.prevId)), [ null, 1, 2 ]);
    assert.deepStrictEqual(result.map(r => r.nextPublished), [ 0n, 0n, null ]);
    for (const r of result) {
      assert.ok([ "bigint", "string" ].includes(typeof r.firstCreatedAt));
      assert.deepStrictEqual(JSON.parse(r.firstMetadata!), { name: "Blog Post 1", tags: [ "prisma", "ts" ] });
    }
  });
});
