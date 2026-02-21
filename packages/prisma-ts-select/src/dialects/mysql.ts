import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";
import {sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";

const esc = (s: string) => s.replace(/'/g, "''");

export const mysqlContextFns = (quoteFn: (ref: string) => string) => ({
  groupConcat:   (col: string, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? ` SEPARATOR '${esc(sep)}'` : ''})`),
  bitAnd:        (col: string): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: string): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  bitXor:        (col: string): SQLExpr<number> => sqlExpr(`BIT_XOR(${quoteFn(col)})`),
  stddev:        (col: string): SQLExpr<number> => sqlExpr(`STDDEV(${quoteFn(col)})`),
  stddevSamp:    (col: string): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  variance:      (col: string): SQLExpr<number> => sqlExpr(`VARIANCE(${quoteFn(col)})`),
  varSamp:       (col: string): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  jsonArrayAgg:  (col: string): SQLExpr<JSONValue> => sqlExpr(`JSON_ARRAYAGG(${quoteFn(col)})`),
  jsonObjectAgg: (key: string, val: string): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECTAGG(${quoteFn(key)}, ${quoteFn(val)})`),
});

export type DialectFns = ReturnType<typeof mysqlContextFns>;

/**
 * MySQL dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: CONCAT() function
 * - List aggregation: GROUP_CONCAT
 */
export const mysqlDialect: Dialect = {
  name: "mysql",
  //@ts-expect-error isAlias currently unused
  quote: (id, isAlias) => `\`${id}\``,
  functions: {
    ...sharedFunctions,
    CONCAT: (...args) => `CONCAT(${args.join(", ")})`,
    GROUP_CONCAT: (...args) => `GROUP_CONCAT(${args.join(", ")})`,
  },
  needsBooleanCoercion: () => true,
  quoteTableIdentifier: (name, _isAlias) => `\`${name}\``,
  quoteQualifiedColumn: (ref) => {
    if (!ref.includes('.')) return `\`${ref}\``;
    const [table, col] = ref.split('.', 2);
    return `\`${table}\`.\`${col}\``;
  },
  quoteOrderByClause: (clause) => {
    const parts = clause.trim().split(/\s+/);
    const colRef = parts[0] ?? '';
    const suffix = parts.slice(1).join(' ');
    const quoted = colRef.includes('.')
      ? (() => { const [table, col] = colRef.split('.', 2); return `\`${table}\`.\`${col}\``; })()
      : `\`${colRef}\``;
    return suffix ? `${quoted} ${suffix}` : quoted;
  },
};
