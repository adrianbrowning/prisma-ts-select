export declare const _type: unique symbol;

/** Opaque wrapper carrying a SQL fragment + phantom TS type `T`. */
export type SQLExpr<T> = { readonly sql: string; readonly [_type]?: T; toString: () => string; };

export function sqlExpr<T>(sql: string): SQLExpr<T> {
  return { sql, toString() { return sql; } };
}

export const DISTINCT_BRAND: unique symbol = Symbol("sqlDistinct");

/**
 * A DISTINCT-modified aggregate argument. `sql` is the rendered `DISTINCT <arg>` form; `arg` is the
 * bare argument, which dialects that rewrite the argument (MySQL's `CASE WHEN`) need on its own.
 */
export type SQLDistinct<T> = SQLExpr<T> & { readonly [DISTINCT_BRAND]: true; readonly arg: string; };

export function sqlDistinct<T>(arg: string): SQLDistinct<T> {
  const sql = `DISTINCT ${arg}`;
  return { sql, arg, [DISTINCT_BRAND]: true as const, toString() { return sql; } };
}
 
export function isDistinct(val: SQLExpr<unknown> | string): val is SQLDistinct<unknown> {
  return typeof val !== "string" && DISTINCT_BRAND in val;
}

type LitValue = string | number | boolean | null;

/** Maps a JS literal type to the TS type the SQL expression will produce. */
export type LitToType<T extends LitValue> =
  T extends string ? string
    : T extends number ? number
      : T extends boolean ? number // booleans become 1/0 (dialect-agnostic)
        : null;

/**
 * Produces a SQL literal expression from a JS value.
 * - string → `'escaped'`
 * - number → numeric literal
 * - boolean → `1` or `0` (dialect-agnostic)
 * - null → `NULL`
 */
export function lit<T extends LitValue>(value: T): SQLExpr<LitToType<T>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ANY_IS_OK = any;
   
  if (value === null) return sqlExpr("NULL") as ANY_IS_OK;
  if (typeof value === "boolean") return sqlExpr(value ? "1" : "0") as ANY_IS_OK;
  if (typeof value === "string") return sqlExpr(`'${value.replace(/'/g, "''")}'`) as ANY_IS_OK;
  return sqlExpr(String(value)) as ANY_IS_OK;
}

/**
 * Resolves a function argument to a SQL string.
 * - SQLExpr → returns `.sql` verbatim
 * - string → treated as a column ref, quoted via `quoteFn`
 */
export function resolveArg(
  arg: string | { sql: string; },
  quoteFn: (ref: string) => string
): string {
  if (typeof arg !== "string") return arg.sql;
  return quoteFn(arg);
}
