import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { windowFns } from "../src/dialects/window-expr.ts";
import type { FramedWindowFn, WindowFn, WindowFrame, WindowValue } from "../src/dialects/window-expr.ts";
import { sqlExpr } from "../src/sql-expr.ts";
import type { SQLExpr } from "../src/sql-expr.ts";
import type { JSONValue } from "../src/utils/types.ts";

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
const typeCheck = (_: true) => {};

const bt = (s: string) => `\`${s}\``;

type Cols =
  | ["id", number]
  | ["name", string | null]
  | ["flag", boolean]
  | ["d", Date]
  | ["meta", JSONValue | null];

const fns = windowFns<Cols, "postgresql">(bt);

void describe("over()", () => {
  void test("without options renders an empty window", () => {
    assert.equal(fns.over(fns.rowNumber()).sql, "ROW_NUMBER() OVER ()");
  });

  void test("renders PARTITION BY and ORDER BY with column directions", () => {
    assert.equal(
      fns.over(fns.rank(), { partitionBy: [ "name", "flag" ], orderBy: [ "id DESC", "d ASC", "name" ] }).sql,
      "RANK() OVER (PARTITION BY `name`, `flag` ORDER BY `id` DESC, `d` ASC, `name`)"
    );
  });

  void test("accepts expressions as partition and order terms", () => {
    const lower = sqlExpr<string>("LOWER(`name`)");
    assert.equal(
      fns.over(fns.denseRank(), { partitionBy: [ lower ], orderBy: [ lower, [ sqlExpr<number>("`id` + 1"), "DESC" ]] }).sql,
      "DENSE_RANK() OVER (PARTITION BY LOWER(`name`) ORDER BY LOWER(`name`), `id` + 1 DESC)"
    );
  });

  void test("omits empty partition and order lists", () => {
    assert.equal(fns.over(fns.rowNumber(), { partitionBy: [], orderBy: [] }).sql, "ROW_NUMBER() OVER ()");
  });

  void test("stringifies to its SQL", () => {
    assert.equal(String(fns.over(fns.rowNumber())), "ROW_NUMBER() OVER ()");
  });
});

void describe("frame", () => {
  void test("ROWS with unbounded and current-row bounds", () => {
    assert.equal(
      fns.over(fns.firstValue("id"), { orderBy: [ "id" ], frame: { rows: [ "unboundedPreceding", "currentRow" ] } }).sql,
      "FIRST_VALUE(`id`) OVER (ORDER BY `id` ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)"
    );
  });

  void test("ROWS with offset bounds", () => {
    assert.equal(
      fns.over(fns.lastValue("id"), { orderBy: [ "id" ], frame: { rows: [{ preceding: 2 }, { following: 0 }] } }).sql,
      "LAST_VALUE(`id`) OVER (ORDER BY `id` ROWS BETWEEN 2 PRECEDING AND 0 FOLLOWING)"
    );
  });

  void test("RANGE with unbounded and current-row bounds", () => {
    assert.equal(
      fns.over(fns.lastValue("id"), { orderBy: [ "id" ], frame: { range: [ "currentRow", "unboundedFollowing" ] } }).sql,
      "LAST_VALUE(`id`) OVER (ORDER BY `id` RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)"
    );
  });

  void test("rejects offsets that are not non-negative integers", () => {
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [{ preceding: -1 }, "currentRow" ] } }), /non-negative integer/);
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [ "currentRow", { following: 1.5 }] } }), /non-negative integer/);
  });

  void test("same-direction offsets may be reversed — the frame is empty, not invalid", () => {
    assert.equal(
      fns.over(fns.firstValue("id"), { frame: { rows: [{ preceding: 1 }, { preceding: 2 }] } }).sql,
      "FIRST_VALUE(`id`) OVER (ROWS BETWEEN 1 PRECEDING AND 2 PRECEDING)"
    );
    assert.equal(
      fns.over(fns.firstValue("id"), { frame: { rows: [{ following: 2 }, { following: 1 }] } }).sql,
      "FIRST_VALUE(`id`) OVER (ROWS BETWEEN 2 FOLLOWING AND 1 FOLLOWING)"
    );
  });

  void test("rejects a start that comes after the end", () => {
    // @ts-expect-error — CURRENT ROW cannot start a frame ending before it
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [ "currentRow", { preceding: 1 }] } }), /CURRENT ROW cannot start a frame that ends at 1 PRECEDING/);
    // @ts-expect-error — a FOLLOWING start cannot end at CURRENT ROW
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [{ following: 1 }, "currentRow" ] } }), /1 FOLLOWING cannot start/);
    // @ts-expect-error — UNBOUNDED FOLLOWING cannot start a frame
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [ "unboundedFollowing", "unboundedFollowing" ] } }), /UNBOUNDED FOLLOWING cannot start/);
  });
});

void describe("navigation functions", () => {
  void test("lag / lead with column, offset and default", () => {
    assert.equal(fns.lag("id").windowFnSql, "LAG(`id`)");
    assert.equal(fns.lag("id", 2).windowFnSql, "LAG(`id`, 2)");
    assert.equal(fns.lead("id", 1, sqlExpr<number>("0")).windowFnSql, "LEAD(`id`, 1, 0)");
  });

  void test("accept expressions", () => {
    assert.equal(fns.lead(sqlExpr<string>("UPPER(`name`)")).windowFnSql, "LEAD(UPPER(`name`))");
    assert.equal(fns.firstValue(sqlExpr<number>("`id` * 2")).windowFnSql, "FIRST_VALUE(`id` * 2)");
  });

  void test("rejects offsets that are not non-negative integers", () => {
    assert.throws(() => fns.lag("id", -1), /non-negative integer/);
    assert.throws(() => fns.lead("id", Number.NaN), /non-negative integer/);
  });
});

void describe("types", () => {
  void test("ranking fns are bigint window functions, and over() turns them into expressions", () => {
    typeCheck({} as Expect<Equal<ReturnType<typeof fns.rowNumber>, WindowFn<bigint>>>);
    const _expr = fns.over(fns.rowNumber());
    typeCheck({} as Expect<Equal<typeof _expr, SQLExpr<bigint>>>);
  });

  void test("a bare window function is not a selectable expression", () => {
    // @ts-expect-error — ROW_NUMBER() is only valid inside over()
    const _e: SQLExpr<bigint> = fns.rowNumber();
  });

  void test("over() only wraps window functions", () => {
    // @ts-expect-error — a plain expression has no window form
    fns.over(sqlExpr<number>("1"));
  });

  void test("partition and order terms are restricted to columns in scope", () => {
    // @ts-expect-error — not a column in scope
    fns.over(fns.rowNumber(), { partitionBy: [ "nope" ] });
    // @ts-expect-error — not a column in scope
    fns.over(fns.rowNumber(), { orderBy: [ "nope DESC" ] });
    // @ts-expect-error — only ASC / DESC
    fns.over(fns.rowNumber(), { orderBy: [ "id SIDEWAYS" ] });
  });

  void test("frames exclude non-portable forms", () => {
    // @ts-expect-error — a frame cannot start at UNBOUNDED FOLLOWING
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [ "unboundedFollowing", "currentRow" ] } }), /cannot start/);
    // @ts-expect-error — a frame cannot end at UNBOUNDED PRECEDING
    assert.throws(() => fns.over(fns.rowNumber(), { frame: { rows: [ "currentRow", "unboundedPreceding" ] } }), /cannot start/);
    // @ts-expect-error — RANGE offsets are not portable (PostgreSQL needs typed INTERVAL offsets for dates)
    fns.over(fns.rowNumber(), { frame: { range: [{ preceding: 1 }, "currentRow" ] } });
  });

  void test("lag / lead are nullable without a default and keep the column type with one", () => {
    const _noDefault = fns.lag("id");
    typeCheck({} as Expect<Equal<typeof _noDefault, WindowFn<number | null>>>);
    const _nullableCol = fns.lead("name", 1, sqlExpr<string>("''"));
    typeCheck({} as Expect<Equal<typeof _nullableCol, WindowFn<string | null>>>);
  });

  void test("the default must match the column type", () => {
    // @ts-expect-error — string default for a number column
    fns.lag("id", 1, sqlExpr<string>("'x'"));
  });

  void test("first / last value keep the argument type", () => {
    typeCheck({} as Expect<Equal<ReturnType<typeof fns.firstValue<"name">>, FramedWindowFn<string | null>>>);
    const _expr = fns.lastValue(sqlExpr<Date>("NOW()"));
    typeCheck({} as Expect<Equal<typeof _expr, FramedWindowFn<Date>>>);
  });

  void test("first / last value stay non-null over a frame that always holds the current row", () => {
    const _noFrame = fns.over(fns.firstValue("id"));
    typeCheck({} as Expect<Equal<typeof _noFrame, SQLExpr<number>>>);
    const _running = fns.over(fns.lastValue("id"), { frame: { rows: [ "unboundedPreceding", "currentRow" ] } });
    typeCheck({} as Expect<Equal<typeof _running, SQLExpr<number>>>);
    const _around = fns.over(fns.lastValue("id"), { frame: { rows: [{ preceding: 1 }, { following: 1 }] } });
    typeCheck({} as Expect<Equal<typeof _around, SQLExpr<number>>>);
    const _range = fns.over(fns.lastValue("id"), { frame: { range: [ "currentRow", "unboundedFollowing" ] } });
    typeCheck({} as Expect<Equal<typeof _range, SQLExpr<number>>>);
  });

  void test("first / last value gain NULL over a frame that can be empty", () => {
    const _ahead = fns.over(fns.firstValue("id"), { frame: { rows: [{ following: 1 }, "unboundedFollowing" ] } });
    typeCheck({} as Expect<Equal<typeof _ahead, SQLExpr<number | null>>>);
    const _behind = fns.over(fns.lastValue("id"), { frame: { rows: [ "unboundedPreceding", { preceding: 1 }] } });
    typeCheck({} as Expect<Equal<typeof _behind, SQLExpr<number | null>>>);
    const _bothBehind = fns.over(fns.lastValue("id"), { frame: { rows: [{ preceding: 1 }, { preceding: 2 }] } });
    typeCheck({} as Expect<Equal<typeof _bothBehind, SQLExpr<number | null>>>);
    const _bothAhead = fns.over(fns.lastValue("id"), { frame: { rows: [{ following: 2 }, { following: 1 }] } });
    typeCheck({} as Expect<Equal<typeof _bothAhead, SQLExpr<number | null>>>);
    const frame: WindowFrame = { rows: [ "currentRow", "currentRow" ] };
    const _unknownFrame = fns.over(fns.lastValue("id"), { frame });
    typeCheck({} as Expect<Equal<typeof _unknownFrame, SQLExpr<number | null>>>);
  });

  void test("ranking and LAG / LEAD ignore the frame", () => {
    const _ranked = fns.over(fns.rank(), { orderBy: [ "id" ], frame: { rows: [{ following: 1 }, "unboundedFollowing" ] } });
    typeCheck({} as Expect<Equal<typeof _ranked, SQLExpr<bigint>>>);
  });
});

void describe("WindowValue — value representation drivers return through a window function", () => {
  void test("postgresql keeps the column type", () => {
    typeCheck({} as Expect<Equal<WindowValue<"postgresql", number | null>, number | null>>);
    typeCheck({} as Expect<Equal<WindowValue<"postgresql", boolean>, boolean>>);
    typeCheck({} as Expect<Equal<WindowValue<"postgresql", JSONValue | null>, JSONValue | null>>);
  });

  void test("mysql (Prisma v7) returns integers as bigint and booleans as 0/1", () => {
    typeCheck({} as Expect<Equal<WindowValue<"mysql", number | null>, bigint | number | null>>);
    typeCheck({} as Expect<Equal<WindowValue<"mysql", boolean>, number>>);
    typeCheck({} as Expect<Equal<WindowValue<"mysql", Date>, Date>>);
    typeCheck({} as Expect<Equal<WindowValue<"mysql", string>, string>>);
    typeCheck({} as Expect<Equal<WindowValue<"mysql", JSONValue>, JSONValue>>);
  });

  void test("mysql (Prisma v6) may also return integers as strings", () => {
    typeCheck({} as Expect<Equal<WindowValue<"mysql-v6", number>, bigint | number | string>>);
    typeCheck({} as Expect<Equal<WindowValue<"mysql-v6", boolean | null>, number | null>>);
  });

  void test("sqlite returns scalars as bigint or text, and JSON as text", () => {
    typeCheck({} as Expect<Equal<WindowValue<"sqlite", number>, bigint | number | string>>);
    typeCheck({} as Expect<Equal<WindowValue<"sqlite", boolean>, bigint | string>>);
    typeCheck({} as Expect<Equal<WindowValue<"sqlite", Date | null>, bigint | string | null>>);
    typeCheck({} as Expect<Equal<WindowValue<"sqlite", string>, string>>);
    typeCheck({} as Expect<Equal<WindowValue<"sqlite", JSONValue | null>, string | null>>);
  });

  void test("nav fns apply the dialect's representation", () => {
    const sqliteFns = windowFns<Cols, "sqlite">(bt);
    const _lagged = sqliteFns.lag("id");
    typeCheck({} as Expect<Equal<typeof _lagged, WindowFn<bigint | number | string | null>>>);
    typeCheck({} as Expect<Equal<ReturnType<typeof sqliteFns.firstValue<"meta">>, FramedWindowFn<string | null>>>);
  });
});
