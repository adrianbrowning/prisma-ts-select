import { resolveArg, sqlExpr } from "../sql-expr.ts";
import type { SQLExpr } from "../sql-expr.ts";
import type { ColName, ColTypeOf } from "./shared.ts";

export declare const _windowType: unique symbol;

/**
 * A window function call such as `ROW_NUMBER()` or `LAG(col)`. SQL only accepts one together with
 * an OVER clause, so it has no `sql` and is not an `SQLExpr`: `select()` rejects it until `over()`
 * wraps it.
 */
export type WindowFn<T> = { readonly windowFnSql: string; readonly [_windowType]?: T; };

/** A window function that reads its frame (FIRST_VALUE / LAST_VALUE): over an empty frame it is NULL. */
export type FramedWindowFn<T> = WindowFn<T> & { readonly framed: true; };

type Dir = "ASC" | "DESC";

/** A PARTITION BY term: a column in scope, or an expression built from the same context. */
export type WindowPartitionTerm<TColEntries extends [string, unknown]> = ColName<TColEntries> | SQLExpr<unknown>;

/** An ORDER BY term: `"col"` / `"col DESC"` (as in query-level `.orderBy()`), an expression, or `[expr, dir]`. */
export type WindowOrderTerm<TColEntries extends [string, unknown]> =
  | `${ColName<TColEntries>}${"" | ` ${Dir}`}`
  | SQLExpr<unknown>
  | readonly [SQLExpr<unknown>, Dir];

type Preceding = { preceding: number; };
type Following = { following: number; };
type FrameOffset = Preceding | Following;

/**
 * A ROWS frame's `[start, end]`. The start may not come after the end in the order
 * UNBOUNDED PRECEDING, n PRECEDING, CURRENT ROW, n FOLLOWING, UNBOUNDED FOLLOWING — every
 * supported database rejects that. Two offsets in the same direction may be reversed
 * (`[{ preceding: 1 }, { preceding: 2 }]`); that frame is empty, not an error.
 */
type RowsBounds =
  | readonly [start: "unboundedPreceding" | Preceding, end: Preceding | "currentRow" | Following | "unboundedFollowing"]
  | readonly [start: "currentRow", end: "currentRow" | Following | "unboundedFollowing"]
  | readonly [start: Following, end: Following | "unboundedFollowing"];

/**
 * The frame forms SQLite, MySQL and PostgreSQL all accept with the same meaning. RANGE takes no
 * offsets: PostgreSQL needs a typed INTERVAL offset for temporal sort keys where the others take a
 * number, so an offset RANGE frame has no portable spelling. GROUPS and EXCLUDE are absent from MySQL.
 */
export type WindowFrame =
  | { rows: RowsBounds; }
  | { range: readonly [start: "unboundedPreceding" | "currentRow", end: "currentRow" | "unboundedFollowing"]; };

export type WindowOptions<TColEntries extends [string, unknown], F extends WindowFrame = WindowFrame> = {
  partitionBy?: ReadonlyArray<WindowPartitionTerm<TColEntries>>;
  orderBy?: ReadonlyArray<WindowOrderTerm<TColEntries>>;
  frame?: F;
};

/**
 * A frame always holds the current row unless it starts after it or ends before it. Only a ROWS
 * frame can: every RANGE form includes the current row and its peers.
 */
type FrameMayBeEmpty<F> =
  F extends { rows: readonly [infer S, infer E]; }
    ? S extends { following: number; } ? true : E extends { preceding: number; } ? true : false
    : false;

/**
 * Keys the table of how each driver returns a value that went through a window function. The
 * value loses its column type there, so it does not come back the way a plain column does.
 */
export type WindowDialect = "sqlite" | "mysql" | "mysql-v6" | "postgresql";

type Scalar = string | number | bigint | boolean | Date | Buffer;

// Distributes over the scalar members of V. `number` covers Int and Float columns alike, so it maps
// to the union of the integer and the floating-point representation.
type ScalarWindowValue<D extends WindowDialect, V> =
  V extends string | Buffer ? V
    : D extends "postgresql" ? V
      : V extends boolean ? (D extends "sqlite" ? bigint | string : number)
        : V extends number ? (D extends "mysql" ? bigint | number : bigint | number | string)
          : D extends "sqlite" ? bigint | string
            : V;

/**
 * The type a driver returns for a value of type `V` read through a window function.
 * - PostgreSQL: unchanged.
 * - MySQL (Prisma v7): integers come back as `bigint`, booleans as `0`/`1`.
 * - MySQL (Prisma v6): as v7, but a window result over an integer column may also be a string.
 * - SQLite: scalars come back as `bigint` or as text — Prisma v6 reads the whole column as text when
 *   its first row is NULL, which a LAG without a default always is. SQLite stores nothing but
 *   integers, reals, text and blobs, so a non-scalar value (a JSON column or JSON expression) is its text.
 */
export type WindowValue<D extends WindowDialect, V> =
  | ([NonNullable<V>] extends [Scalar] ? ScalarWindowValue<D, NonNullable<V>> : D extends "sqlite" ? string : NonNullable<V>)
  | (null extends V ? null : never);

/** The `over()` signature: frame-reading functions gain NULL when the frame can be empty. */
type OverFn<TColEntries extends [string, unknown]> = {
  <T, const F extends WindowFrame = never>(fn: FramedWindowFn<T>, options?: WindowOptions<TColEntries, F>): SQLExpr<T | (true extends FrameMayBeEmpty<F> ? null : never)>;
  <T>(fn: WindowFn<T>, options?: WindowOptions<TColEntries>): SQLExpr<T>;
};

type NavArg<TColEntries extends [string, unknown]> = ColName<TColEntries> | SQLExpr<unknown>;

type ArgValue<TColEntries extends [string, unknown], A> =
  A extends string ? ColTypeOf<TColEntries, A> : A extends SQLExpr<infer T> ? T : never;

/** LAG / LEAD: NULL past the partition edge, unless a default of the argument's type is given. */
type NavFn<TColEntries extends [string, unknown], D extends WindowDialect> = {
  <A extends NavArg<TColEntries>>(arg: A, offset?: number): WindowFn<WindowValue<D, ArgValue<TColEntries, A>> | null>;
  <A extends NavArg<TColEntries>>(arg: A, offset: number, defaultValue: SQLExpr<NonNullable<ArgValue<TColEntries, A>>>): WindowFn<WindowValue<D, ArgValue<TColEntries, A>>>;
};

const windowFn = <T>(windowFnSql: string): WindowFn<T> => ({ windowFnSql });

/** MySQL only accepts a non-negative integer literal as a LAG/LEAD or frame offset. */
function checkOffset(n: number, fn: string): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${fn}: offset must be a non-negative integer, got ${n}`);
  return n;
}

const BOUND_SQL = {
  unboundedPreceding: "UNBOUNDED PRECEDING",
  currentRow: "CURRENT ROW",
  unboundedFollowing: "UNBOUNDED FOLLOWING",
} as const;

type Bound = keyof typeof BOUND_SQL | FrameOffset;

function boundSql(bound: Bound): string {
  if (typeof bound === "string") return BOUND_SQL[bound];
  return "preceding" in bound
    ? `${checkOffset(bound.preceding, "frame")} PRECEDING`
    : `${checkOffset(bound.following, "frame")} FOLLOWING`;
}

/** Position in UNBOUNDED PRECEDING < n PRECEDING < CURRENT ROW < n FOLLOWING < UNBOUNDED FOLLOWING. */
const BOUND_RANK = { unboundedPreceding: 0, currentRow: 2, unboundedFollowing: 4 } as const;

function boundRank(bound: Bound): number {
  if (typeof bound === "string") return BOUND_RANK[bound];
  return "preceding" in bound ? 1 : 3;
}

function frameSql(frame: WindowFrame): string {
  const [ unit, [ start, end ]] = "rows" in frame ? [ "ROWS", frame.rows ] as const : [ "RANGE", frame.range ] as const;
  // The types already rule these out; the check keeps untyped callers to one error instead of three dialect ones.
  const bounds: [Bound, Bound] = [ start, end ];
  if (bounds[0] === "unboundedFollowing" || bounds[1] === "unboundedPreceding" || boundRank(start) > boundRank(end)) {
    throw new Error(`frame: ${boundSql(start)} cannot start a frame that ends at ${boundSql(end)}`);
  }
  return `${unit} BETWEEN ${boundSql(start)} AND ${boundSql(end)}`;
}

function orderTermSql<TColEntries extends [string, unknown]>(term: WindowOrderTerm<TColEntries>, quoteFn: (ref: string) => string): string {
  if (typeof term === "string") {
    // Column names hold no spaces, so a space can only separate the column from its direction.
    const space = term.indexOf(" ");
    return space < 0 ? quoteFn(term) : `${quoteFn(term.slice(0, space))}${term.slice(space)}`;
  }
  if ("sql" in term) return term.sql;
  const [ expr, dir ] = term;
  return `${expr.sql} ${dir}`;
}

/**
 * The portable window API, shared by every dialect: `over()` plus the ranking and navigation
 * functions. Only the navigation result types differ, selected by `D`.
 *
 * @param quoteFn dialect column quoter, applied to column-name arguments and terms.
 */
export function windowFns<TColEntries extends [string, unknown], D extends WindowDialect>(quoteFn: (ref: string) => string) {
  const navSql = (name: string, arg: NavArg<TColEntries>, offset?: number, defaultValue?: SQLExpr<unknown>): string => {
    const args = [ resolveArg(arg, quoteFn) ];
    if (offset !== undefined) args.push(String(checkOffset(offset, name)));
    if (defaultValue !== undefined) args.push(defaultValue.sql);
    return `${name}(${args.join(", ")})`;
  };
  const nav = (name: string) =>
    ((arg: NavArg<TColEntries>, offset?: number, defaultValue?: SQLExpr<unknown>) => windowFn(navSql(name, arg, offset, defaultValue))) as NavFn<TColEntries, D>;
  const valueFn = (name: string) =>
    <A extends NavArg<TColEntries>>(arg: A): FramedWindowFn<WindowValue<D, ArgValue<TColEntries, A>>> =>
      ({ windowFnSql: `${name}(${resolveArg(arg, quoteFn)})`, framed: true });

  return {
    over: (<T>(fn: WindowFn<T>, options: WindowOptions<TColEntries> = {}): SQLExpr<T> => {
      const { partitionBy = [], orderBy = [], frame } = options;
      const clauses: Array<string> = [];
      if (partitionBy.length > 0) clauses.push(`PARTITION BY ${partitionBy.map(t => resolveArg(t, quoteFn)).join(", ")}`);
      if (orderBy.length > 0) clauses.push(`ORDER BY ${orderBy.map(t => orderTermSql(t, quoteFn)).join(", ")}`);
      if (frame) clauses.push(frameSql(frame));
      return sqlExpr(`${fn.windowFnSql} OVER (${clauses.join(" ")})`);
    }) as OverFn<TColEntries>,
    // Every supported driver returns the BIGINT these produce as bigint.
    rowNumber: (): WindowFn<bigint> => windowFn("ROW_NUMBER()"),
    rank:      (): WindowFn<bigint> => windowFn("RANK()"),
    denseRank: (): WindowFn<bigint> => windowFn("DENSE_RANK()"),
    lag:  nav("LAG"),
    lead: nav("LEAD"),
    firstValue: valueFn("FIRST_VALUE"),
    // With the default frame (up to the current row) LAST_VALUE is the current row — pass a frame.
    lastValue:  valueFn("LAST_VALUE"),
  };
}
