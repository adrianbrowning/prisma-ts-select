import { resolveArg } from "../sql-expr.ts";
import type { SQLExpr } from "../sql-expr.ts";

/**
 * Shared SQL functions that work identically across all supported databases.
 * These aggregate functions use standard SQL syntax.
 */
export const sharedFunctions = {
  // Intentionally empty — placeholder for future cross-dialect functions
};

/** Escapes single quotes in SQL string literals. */
export const esc = (s: string) => s.replace(/'/g, "''");

/**
 * Flattens jsonObject pairs into alternating quoted-key / resolved-value SQL tokens.
 * @param pairs - [key, value] pairs where string value must be a valid column reference resolved by quoteFn
 * @param quoteFn
 */
export const flattenJsonObjectPairs = (
  pairs: Array<[string, string | SQLExpr<unknown>]>,
  quoteFn: (ref: string) => string
): Array<string> =>
  pairs.flatMap(([ k, v ]) => [ `'${esc(k)}'`, resolveArg(v, quoteFn) ]);

/** Filters col-entry tuple union to names whose type matches T. */
export type FilterCols<TEntries extends [string, unknown], T> =
  TEntries extends [infer N extends string, infer V]
    ? NonNullable<V> extends T ? N : never
    : never;

/** Extracts all col names from a col-entry tuple union (untyped). */
export type ColName<TEntries extends [string, unknown]> =
  TEntries extends [infer N extends string, unknown] ? N : never;

type _TableDot<N extends string> = N extends `${infer T}.${string}` ? `${T}.` : never;
type _BareCol<N extends string> = N extends `${string}.${string}` ? never : N;

/**
 * Progressive column validator for aggregate `.orderBy()`: accepts exactly `ColName<TEntries>`,
 * but an invalid path resolves to the next level of suggestions — `Table.` prefixes plus the
 * bare columns in `TEntries` at the top (`ColEntries` lists a bare name only when it is
 * unambiguous), that table's columns once `Table.` is typed. Mirrors `ValidateSelect` without
 * `*` / `Table.*`; used as `C extends V<E, C> ? C : V<E, C>`.
 */
export type ValidateAggregateColumn<TEntries extends [string, unknown], Path extends string> =
  Path extends ColName<TEntries>
    ? Path
    : Path extends `${infer T}.${string}`
      ? [Extract<ColName<TEntries>, `${T}.${string}`>] extends [never]
        ? _BareCol<ColName<TEntries>> | _TableDot<ColName<TEntries>>
        : Extract<ColName<TEntries>, `${T}.${string}`>
      : _BareCol<ColName<TEntries>> | _TableDot<ColName<TEntries>>;

/** Extracts the value type for a specific column from a col-entry tuple union. */
export type ColTypeOf<TEntries extends [string, unknown], Col extends string> =
  TEntries extends [Col, infer V] ? V : never;

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
