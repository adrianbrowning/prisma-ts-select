import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";

const esc = (s: string) => s.replace(/'/g, "''");

export const postgresqlContextFns = <TCol extends string = string>(quoteFn: (ref: string) => string) => ({
  avg: (col: TCol | SQLExpr<number>): SQLExpr<number> => sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: TCol | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  stringAgg:     (col: TCol, sep: string): SQLExpr<string> =>
    sqlExpr(`STRING_AGG(${quoteFn(col)}, '${esc(sep)}')`),
  arrayAgg:      (col: TCol): SQLExpr<unknown[]> => sqlExpr(`ARRAY_AGG(${quoteFn(col)})`),
  stddevPop:     (col: TCol): SQLExpr<number> => sqlExpr(`STDDEV_POP(${quoteFn(col)})`),
  stddevSamp:    (col: TCol): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  varPop:        (col: TCol): SQLExpr<number> => sqlExpr(`VAR_POP(${quoteFn(col)})`),
  varSamp:       (col: TCol): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  boolAnd:       (col: TCol): SQLExpr<boolean> => sqlExpr(`BOOL_AND(${quoteFn(col)})`),
  boolOr:        (col: TCol): SQLExpr<boolean> => sqlExpr(`BOOL_OR(${quoteFn(col)})`),
  jsonAgg:       (col: TCol): SQLExpr<JSONValue[]> => sqlExpr(`JSON_AGG(${quoteFn(col)})`),
  bitAnd:        (col: TCol): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: TCol): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  jsonObjectAgg: (key: TCol, val: TCol): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECT_AGG(${quoteFn(key)}, ${quoteFn(val)})`),
});

export type DialectFns<TCol extends string = string> = ReturnType<typeof postgresqlContextFns<TCol>>;

/**
 * PostgreSQL dialect configuration.
 * - Identifier quoting: double quotes
 * - String concatenation: CONCAT() function
 * - List aggregation: STRING_AGG (PostgreSQL equivalent of GROUP_CONCAT)
 */
export const postgresqlDialect: Dialect = {
  name: "postgresql",
  //@ts-expect-error isAlias currently unused
  quote: (id, isAlias) => `"${id}"`,
  functions: {
    ...sharedFunctions,
    CONCAT: (...args) => `CONCAT(${args.join(", ")})`,
    GROUP_CONCAT: (...args) => `STRING_AGG(${args.join(", ")})`,
  },
  needsBooleanCoercion: () => false,
  quoteTableIdentifier: (name, _isAlias) => `"${name}"`,
  quoteQualifiedColumn: (ref) => {
    if (!ref.includes('.')) return `"${ref}"`; // Quote unqualified column
    const [table, col] = ref.split('.', 2);
    return `"${table}"."${col}"`;
  },
  quoteOrderByClause: (clause) => {
    const parts = clause.trim().split(/\s+/);
    const colRef = parts[0] ?? '';
    const suffix = parts.slice(1).join(' '); // DESC/ASC
    // Inline quoting logic to avoid circular reference during construction
    const quoted = colRef.includes('.')
      ? (() => { const [table, col] = colRef.split('.', 2); return `"${table}"."${col}"`; })()
      : `"${colRef}"`;
    return suffix ? `${quoted} ${suffix}` : quoted;
  },
};
