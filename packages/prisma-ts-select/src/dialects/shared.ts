/**
 * Shared SQL functions that work identically across all supported databases.
 * These aggregate functions use standard SQL syntax.
 */
export const sharedFunctions = {

};

/** Filters col-entry tuple union to names whose type matches T. */
export type FilterCols<TEntries extends [string, unknown], T> =
  TEntries extends [infer N extends string, infer V]
    ? NonNullable<V> extends T ? N : never
    : never;

/** Extracts all col names from a col-entry tuple union (untyped). */
export type ColName<TEntries extends [string, unknown]> =
  TEntries extends [infer N extends string, unknown] ? N : never;
