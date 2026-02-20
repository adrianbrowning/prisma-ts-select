declare const _type: unique symbol;

/** Opaque wrapper carrying a SQL fragment + phantom TS type `T`. */
export type SQLExpr<T> = { readonly sql: string; readonly [_type]?: T };

export function sqlExpr<T>(sql: string): SQLExpr<T> {
  return { sql } as SQLExpr<T>;
}

type LitValue = string | number | boolean | null;

/** Maps a JS literal type to the TS type the SQL expression will produce. */
export type LitToType<T extends LitValue> =
  T extends string ? string
  : T extends number ? number
  : T extends boolean ? number  // booleans become 1/0 (dialect-agnostic)
  : null;

/**
 * Produces a SQL literal expression from a JS value.
 * - string → `'escaped'`
 * - number → numeric literal
 * - boolean → `1` or `0` (dialect-agnostic)
 * - null → `NULL`
 */
export function lit<T extends LitValue>(value: T): SQLExpr<LitToType<T>> {
  if (value === null) return sqlExpr('NULL') as any;
  if (typeof value === 'boolean') return sqlExpr(value ? '1' : '0') as any;
  if (typeof value === 'string') return sqlExpr(`'${value.replace(/'/g, "''")}'`) as any;
  return sqlExpr(String(value)) as any;
}

/**
 * Resolves a function argument to a SQL string.
 * - SQLExpr → returns `.sql` verbatim
 * - string → treated as a column ref, quoted via `quoteFn`
 */
export function resolveArg(
  arg: string | SQLExpr<any>,
  quoteFn: (ref: string) => string
): string {
  if (typeof arg !== 'string') return arg.sql;
  return quoteFn(arg);
}
