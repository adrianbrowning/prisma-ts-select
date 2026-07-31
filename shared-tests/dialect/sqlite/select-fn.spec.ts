import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "#client";
import { dialect } from "#dialect";
import { expectSQL } from "../../test-utils.ts";
import type { Equal, Expect } from "../../utils.ts";
import { typeCheck } from "../../utils.ts";

describe("SQLite dialect fns", () => {
  describe("groupConcat(col)", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id", "User.name" ])
        .select(({ groupConcat }) => groupConcat("User.name"), "names");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}) AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")};`);
    });

    it("should run and return grouped names", async () => {
      const _result = await createQuery().run();
      assert.ok(Array.isArray(_result));
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(_result.every(r => typeof r.names === "string" || r.names === null));
    });
  });

  describe("groupConcat(col, sep)", () => {
    function createQuery() {
      return prisma.$from("User")
        .groupBy([ "User.id", "User.name" ])
        .select(({ groupConcat }) => groupConcat("User.name", " | "), "names");
    }

    it("should match SQL with separator", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT GROUP_CONCAT(${dialect.quoteQualifiedColumn("User.name")}, ' | ') AS ${dialect.quote("names", true)} FROM ${dialect.quote("User")} GROUP BY ${dialect.quoteQualifiedColumn("User.id")}, ${dialect.quoteQualifiedColumn("User.name")};`);
    });
  });

  describe("total(col)", () => {
    function createQuery() {
      return prisma.$from("User")
        .select(({ total }) => total("User.age"), "t");
    }

    it("should match SQL", () => {
      expectSQL(createQuery().getSQL(),
        `SELECT TOTAL(${dialect.quoteQualifiedColumn("User.age")}) AS ${dialect.quote("t", true)} FROM ${dialect.quote("User")};`);
    });

    it("should run and return sum or 0.0 for empty sets", async () => {
      const _result = await createQuery().run();
      assert.ok(Array.isArray(_result));
      assert.ok(_result.length === 1 && typeof _result[0]!.t === "number");
    });
  });

  describe("countAll() — type", () => {
    it("type: bigint", async () => {
      const _result = await prisma.$from("User").select(({ countAll }) => countAll(), "n")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ n: bigint; }>>>);
      assert.equal(_result[0]!.n, 3n);
    });
  });

  describe("count(col) — type", () => {
    it("type: bigint", async () => {
      const _result = await prisma.$from("User").select(({ count }) => count("User.id"), "n")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ n: bigint; }>>>);
      assert.equal(_result[0]!.n, 3n);
    });
  });

  describe("countDistinct(col) — type", () => {
    it("type: bigint", async () => {
      const _result = await prisma.$from("User").select(({ countDistinct }) => countDistinct("User.id"), "n")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ n: bigint; }>>>);
      assert.equal(_result[0]!.n, 3n);
    });
  });

  describe("length(col) — type", () => {
    it("type: bigint", async () => {
      const _result = await prisma.$from("User").select(({ length }) => length("User.email"), "l")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ l: bigint; }>>>);
      // johndoe@example.com=19, smith@example.com=17, alice@example.com=17
      const lengths = _result.map(r => r.l).sort((a, b) => String(a).localeCompare(String(b)));
      assert.deepEqual(lengths, [ 17n, 17n, 19n ]);
    });
  });

  describe("sum(col) — type", () => {
    it("type: bigint | number", async () => {
      const _result = await prisma.$from("User").select(({ sum }) => sum("User.age"), "total")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ total: bigint | number; }>>>);
    });
  });

  describe("min(col) — numeric column", () => {
    it("type: bigint | null", async () => {
      const _result = await prisma.$from("User").select(({ min }) => min("User.age"), "youngest")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ youngest: bigint | null; }>>>);
      assert.equal(_result[0]!.youngest, 25n);
    });
  });

  describe("max(col) — numeric column", () => {
    it("type: bigint | null", async () => {
      const _result = await prisma.$from("User").select(({ max }) => max("User.age"), "oldest")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ oldest: bigint | null; }>>>);
      assert.equal(_result[0]!.oldest, 30n);
    });
  });

  describe("avg(col) — type", () => {
    it("type: number", async () => {
      const _result = await prisma.$from("User").select(({ avg }) => avg("User.age"), "average")
        .run();
      typeCheck({} as Expect<Equal<typeof _result, Array<{ average: number; }>>>);
    });
  });

  describe("column type safety — numeric fns", () => {
    it("avg() rejects string col", () => {
      // @ts-expect-error title is string, not number
      prisma.$from("Post").select(({ avg }) => avg("title"), "a");
    });

    it("avg() rejects DateTime col", () => {
      // @ts-expect-error createdAt is DateTime, not number
      prisma.$from("Post").select(({ avg }) => avg("Post.createdAt"), "a");
    });

    it("avg() rejects SQLExpr<string> from lit", () => {
      // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<number>
      prisma.$from("User").select(({ avg, lit }) => avg(lit("x")), "a");
    });

    it("sum() rejects string col", () => {
      // @ts-expect-error title is string, not number
      prisma.$from("Post").select(({ sum }) => sum("title"), "s");
    });

    it("accepts number col in avg()", () => {
      prisma.$from("User").select(({ avg }) => avg("User.age"), "a");
    });

    it("accepts SQLExpr<number> from lit in avg()", () => {
      prisma.$from("User").select(({ avg, lit }) => avg(lit(42)), "a");
    });
  });

  describe("column type safety — SQLite datetime fns", () => {
    it("strftime() rejects string col", () => {
      // @ts-expect-error title is string, not DateTime
      prisma.$from("Post").select(({ strftime }) => strftime("%Y", "title"), "s");
    });

    it("julianday() rejects string col", () => {
      // @ts-expect-error title is string, not DateTime
      prisma.$from("Post").select(({ julianday }) => julianday("title"), "j");
    });

    it("julianday() rejects SQLExpr<number> from lit", () => {
      // @ts-expect-error lit(42) is SQLExpr<number>, not SQLExpr<Date>
      prisma.$from("Post").select(({ julianday, lit }) => julianday(lit(42)), "j");
    });

    it("date() rejects number col", () => {
      // @ts-expect-error User.age is number, not DateTime
      prisma.$from("User").select(({ date }) => date("User.age"), "d");
    });

    it("datetime() rejects string lit", () => {
      // @ts-expect-error lit("x") is SQLExpr<string>, not SQLExpr<Date>
      prisma.$from("Post").select(({ datetime, lit }) => datetime(lit("x")), "dt");
    });
  });

  describe("column type safety — SQLite string fns", () => {
    it("substr() rejects DateTime col", () => {
      // @ts-expect-error createdAt is DateTime, not string
      prisma.$from("Post").select(({ substr }) => substr("Post.createdAt", 1), "s");
    });

    it("hex() rejects number col", () => {
      // @ts-expect-error User.age is number, not string
      prisma.$from("User").select(({ hex }) => hex("User.age"), "h");
    });

    it("instr() rejects SQLExpr<number> from lit", () => {
      // @ts-expect-error lit(42) is SQLExpr<number>, not SQLExpr<string>
      prisma.$from("Post").select(({ instr, lit }) => instr(lit(42), "x"), "i");
    });
  });
});
