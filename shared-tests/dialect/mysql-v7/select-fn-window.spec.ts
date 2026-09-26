import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import type { JSONValue } from "#extend";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// Prisma v7 reads a MySQL window result over an INT column as bigint and over a BOOLEAN
// (TINYINT(1)) column as 0/1 — neither comes back the way the plain column does.
describe("MySQL v7 dialect — window navigation result types", () => {
  function createQuery() {
    return prisma.$from("Post")
      .select("id")
      .select(({ over, lag }) => over(lag("id"), { orderBy: [ "id" ] }), "prevId")
      .select(({ over, lead }) => over(lead("published"), { orderBy: [ "id" ] }), "nextPublished")
      .select(({ over, lag }) => over(lag("createdAt"), { orderBy: [ "id" ] }), "prevCreatedAt")
      .select(({ over, firstValue }) => over(firstValue("metadata"), { orderBy: [ "id" ] }), "firstMetadata")
      .orderBy([ "id" ]);
  }

  it("type: integers widen to bigint, booleans to 0/1", async () => {
    const _result = await createQuery().run();
    typeCheck({} as Expect<Equal<typeof _result, Array<{
      id: number;
      prevId: bigint | number | null;
      nextPublished: number | null;
      prevCreatedAt: Date | null;
      firstMetadata: JSONValue | null; // JSONValue already includes null; spelled out for the nullable column
    }>>>);
  });

  it("should return the driver representation", async () => {
    const result = await createQuery().run();
    const metadata = { name: "Blog Post 1", tags: [ "prisma", "ts" ] };
    assert.deepStrictEqual(result, [
      { id: 1, prevId: null, nextPublished: 0, prevCreatedAt: null, firstMetadata: metadata },
      { id: 2, prevId: 1n, nextPublished: 0, prevCreatedAt: new Date("2020-01-15T10:30:00.000Z"), firstMetadata: metadata },
      { id: 3, prevId: 2n, nextPublished: null, prevCreatedAt: new Date("2020-06-20T14:45:00.000Z"), firstMetadata: metadata },
    ]);
  });
});
