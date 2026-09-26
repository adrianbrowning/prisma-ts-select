import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

// Prisma v6 reads a MySQL window result over an INT column as a string — LAG with a default is
// the exception, because the default widens the result to BIGINT.
describe("MySQL v6 dialect — window navigation result types", () => {
  function createQuery() {
    return prisma.$from("Post")
      .select("id")
      .select(({ over, lag }) => over(lag("id"), { orderBy: [ "id" ] }), "prevId")
      .select(({ over, lag, lit }) => over(lag("id", 1, lit(0)), { orderBy: [ "id" ] }), "prevIdOr0")
      .select(({ over, firstValue }) => over(firstValue("id"), { orderBy: [ "id" ] }), "firstId")
      .select(({ over, lead }) => over(lead("published"), { orderBy: [ "id" ] }), "nextPublished")
      .orderBy([ "id" ]);
  }

  it("type: integers may come back as bigint, number or string", async () => {
    const _result = await createQuery().run();
    typeCheck({} as Expect<Equal<typeof _result, Array<{
      id: number;
      prevId: bigint | number | string | null;
      prevIdOr0: bigint | number | string;
      firstId: bigint | number | string;
      nextPublished: number | null;
    }>>>);
  });

  it("should return the driver representation", async () => {
    const result = await createQuery().run();
    assert.deepStrictEqual(result, [
      { id: 1, prevId: null, prevIdOr0: 0n, firstId: "1", nextPublished: 0 },
      { id: 2, prevId: "1", prevIdOr0: 1n, firstId: "1", nextPublished: 0 },
      { id: 3, prevId: "2", prevIdOr0: 2n, firstId: "1", nextPublished: null },
    ]);
  });
});
