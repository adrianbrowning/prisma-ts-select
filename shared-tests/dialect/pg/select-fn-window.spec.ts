import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import type { JSONValue } from "#extend";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// PostgreSQL returns a value read through a window function exactly as it returns the column.
describe("PostgreSQL dialect — window navigation result types", () => {
  function createQuery() {
    return prisma.$from("Post")
      .select("id")
      .select(({ over, lag }) => over(lag("id"), { orderBy: [ "id" ] }), "prevId")
      .select(({ over, lag, lit }) => over(lag("id", 1, lit(0)), { orderBy: [ "id" ] }), "prevIdOr0")
      .select(({ over, lead }) => over(lead("published"), { orderBy: [ "id" ] }), "nextPublished")
      .select(({ over, lag }) => over(lag("createdAt"), { orderBy: [ "id" ] }), "prevCreatedAt")
      .select(({ over, firstValue }) => over(firstValue("metadata"), { orderBy: [ "id" ] }), "firstMetadata")
      .orderBy([ "id" ]);
  }

  it("type: the column type, nullable past the partition edge", async () => {
    const _result = await createQuery().run();
    typeCheck({} as Expect<Equal<typeof _result, Array<{
      id: number;
      prevId: number | null;
      prevIdOr0: number;
      nextPublished: boolean | null;
      prevCreatedAt: Date | null;
      firstMetadata: JSONValue | null; // JSONValue already includes null; spelled out for the nullable column
    }>>>);
  });

  it("should return the column representation", async () => {
    const result = await createQuery().run();
    assert.deepStrictEqual(result, [
      { id: 1, prevId: null, prevIdOr0: 0, nextPublished: false, prevCreatedAt: null, firstMetadata: { name: "Blog Post 1", tags: [ "prisma", "ts" ] } },
      { id: 2, prevId: 1, prevIdOr0: 1, nextPublished: false, prevCreatedAt: new Date("2020-01-15T10:30:00.000Z"), firstMetadata: { name: "Blog Post 1", tags: [ "prisma", "ts" ] } },
      { id: 3, prevId: 2, prevIdOr0: 2, nextPublished: null, prevCreatedAt: new Date("2020-06-20T14:45:00.000Z"), firstMetadata: { name: "Blog Post 1", tags: [ "prisma", "ts" ] } },
    ]);
  });
});
