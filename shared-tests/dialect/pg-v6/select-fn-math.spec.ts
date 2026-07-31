/**
 * PostgreSQL Prisma v6 — math return type deviations from v7.
 * CEIL/FLOOR of a numeric literal return `Decimal` (PostgreSQL returns `numeric`)
 * rather than `number` as in Prisma v7.
 */
import { describe, it } from "node:test";
import type { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "#client";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

describe("PostgreSQL v6 dialect — math return types", () => {
  describe("ceil(lit(4.2))", () => {
    it("type: number | Decimal", async () => {
      const _result = await prisma.$from("User").select(({ ceil, lit }) => ceil(lit(4.2)), "v")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ v: number | Decimal; }>>>);
    });
  });

  describe("floor(lit(4.8))", () => {
    it("type: number | Decimal", async () => {
      const _result = await prisma.$from("User").select(({ floor, lit }) => floor(lit(4.8)), "v")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ v: number | Decimal; }>>>);
    });
  });
});
