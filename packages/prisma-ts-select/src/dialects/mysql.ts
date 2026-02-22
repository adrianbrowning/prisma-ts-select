import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";
import type {Decimal} from "@prisma/client/runtime/client";

const esc = (s: string) => s.replace(/'/g, "''");

export const mysqlContextFns = <TCol extends string = string>(quoteFn: (ref: string) => string) => ({
  avg: (col: TCol | SQLExpr<number>): SQLExpr<Decimal> =>
    sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: TCol | SQLExpr<number>): SQLExpr<Decimal> =>
    sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  groupConcat:   (col: TCol, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? ` SEPARATOR '${esc(sep)}'` : ''})`),
  bitAnd:        (col: TCol): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: TCol): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  bitXor:        (col: TCol): SQLExpr<number> => sqlExpr(`BIT_XOR(${quoteFn(col)})`),
  stddev:        (col: TCol): SQLExpr<number> => sqlExpr(`STDDEV(${quoteFn(col)})`),
  stddevSamp:    (col: TCol): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  variance:      (col: TCol): SQLExpr<number> => sqlExpr(`VARIANCE(${quoteFn(col)})`),
  varSamp:       (col: TCol): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  jsonArrayAgg:  (col: TCol): SQLExpr<JSONValue> => sqlExpr(`JSON_ARRAYAGG(${quoteFn(col)})`),
  jsonObjectAgg: (key: TCol, val: TCol): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECTAGG(${quoteFn(key)}, ${quoteFn(val)})`),
  concat: (...args: Array<TCol | SQLExpr<string>>): SQLExpr<string> =>
    sqlExpr(`CONCAT(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`),
  substring: (col: TCol | SQLExpr<string>, start: number, len?: number): SQLExpr<string> =>
    sqlExpr(`SUBSTRING(${resolveArg(col, quoteFn)}, ${start}${len !== undefined ? `, ${len}` : ''})`),
  left: (col: TCol | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`LEFT(${resolveArg(col, quoteFn)}, ${n})`),
  right: (col: TCol | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`RIGHT(${resolveArg(col, quoteFn)}, ${n})`),
  repeat: (col: TCol | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`REPEAT(${resolveArg(col, quoteFn)}, ${n})`),
  reverse: (col: TCol | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`REVERSE(${resolveArg(col, quoteFn)})`),
  lpad: (col: TCol | SQLExpr<string>, len: number, pad: string): SQLExpr<string> =>
    sqlExpr(`LPAD(${resolveArg(col, quoteFn)}, ${len}, '${pad.replace(/'/g, "''")}')`),
  rpad: (col: TCol | SQLExpr<string>, len: number, pad: string): SQLExpr<string> =>
    sqlExpr(`RPAD(${resolveArg(col, quoteFn)}, ${len}, '${pad.replace(/'/g, "''")}')`),
  locate: (substr: string, col: TCol | SQLExpr<string>): SQLExpr<number> =>
    sqlExpr(`LOCATE('${esc(substr)}', ${resolveArg(col, quoteFn)})`),
  space: (n: number): SQLExpr<string> =>
    sqlExpr(`SPACE(${n})`),
});

export type DialectFns<TCol extends string = string> = ReturnType<typeof mysqlContextFns<TCol>>;

/**
 * MySQL dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: CONCAT() function
 * - List aggregation: GROUP_CONCAT
 */
export const mysqlDialect: Dialect = {
  name: "mysql",
  needsBooleanCoercion: () => true,
  //@ts-expect-error isAlias currently unused
  quote: (id, isAlias) => `\`${id}\``,
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
