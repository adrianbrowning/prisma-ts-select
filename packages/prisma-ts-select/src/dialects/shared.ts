import {resolveArg, type SQLExpr} from "../sql-expr.js";

/**
 * Shared SQL functions that work identically across all supported databases.
 * These aggregate functions use standard SQL syntax.
 */
export const sharedFunctions = {

};

/** Escapes single quotes in SQL string literals. */
export const esc = (s: string) => s.replace(/'/g, "''");

/** Flattens jsonObject pairs into alternating quoted-key / resolved-value SQL tokens. */
export const flattenJsonObjectPairs = (
  pairs: [string, string | SQLExpr<unknown>][],
  quoteFn: (ref: string) => string,
): string[] =>
  pairs.flatMap(([k, v]) => [`'${esc(k)}'`, resolveArg(v, quoteFn)]);

/** Filters col-entry tuple union to names whose type matches T. */
export type FilterCols<TEntries extends [string, unknown], T> =
  TEntries extends [infer N extends string, infer V]
    ? NonNullable<V> extends T ? N : never
    : never;

/** Extracts all col names from a col-entry tuple union (untyped). */
export type ColName<TEntries extends [string, unknown]> =
  TEntries extends [infer N extends string, unknown] ? N : never;

/**
 * Filters col-entry tuple union to names whose type is a JSON column (object/array).
 * Excludes all primitive DB types: string, number, boolean, Date, bigint, Buffer.
 * Works regardless of which JSONValue definition is in scope.
 */
export type FilterJsonCols<TEntries extends [string, unknown]> =
  TEntries extends [infer N extends string, infer V]
    ? NonNullable<V> extends (string | number | boolean | Date | bigint | Buffer)
      ? never
      : N
    : never;
