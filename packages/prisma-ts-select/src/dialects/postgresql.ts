import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";
import type {FilterCols, ColName} from "./shared.js";

const esc = (s: string) => s.replace(/'/g, "''");

export type PgExtractField = 'YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND' | 'DOW' | 'DOY' | 'EPOCH' | 'WEEK' | 'QUARTER';
export type PgDateTruncUnit = 'microseconds' | 'milliseconds' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'decade' | 'century' | 'millennium';

export const postgresqlContextFns = <TColEntries extends [string, unknown] = [string, unknown]>(quoteFn: (ref: string) => string) => ({
  avg: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  stringAgg:     (col: ColName<TColEntries>, sep: string): SQLExpr<string> =>
    sqlExpr(`STRING_AGG(${quoteFn(col)}, '${esc(sep)}')`),
  arrayAgg:      (col: ColName<TColEntries>): SQLExpr<unknown[]> => sqlExpr(`ARRAY_AGG(${quoteFn(col)})`),
  stddevPop:     (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`STDDEV_POP(${quoteFn(col)})`),
  stddevSamp:    (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  varPop:        (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`VAR_POP(${quoteFn(col)})`),
  varSamp:       (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  boolAnd:       (col: ColName<TColEntries>): SQLExpr<boolean> => sqlExpr(`BOOL_AND(${quoteFn(col)})`),
  boolOr:        (col: ColName<TColEntries>): SQLExpr<boolean> => sqlExpr(`BOOL_OR(${quoteFn(col)})`),
  jsonAgg:       (col: ColName<TColEntries>): SQLExpr<JSONValue[]> => sqlExpr(`JSON_AGG(${quoteFn(col)})`),
  bitAnd:        (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  jsonObjectAgg: (key: ColName<TColEntries>, val: ColName<TColEntries>): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECT_AGG(${quoteFn(key)}, ${quoteFn(val)})`),
  concat: (...args: Array<FilterCols<TColEntries, string> | SQLExpr<string>>): SQLExpr<string> =>
    sqlExpr(`CONCAT(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`),
  substring: (col: FilterCols<TColEntries, string> | SQLExpr<string>, start: number, len?: number): SQLExpr<string> =>
    sqlExpr(`SUBSTRING(${resolveArg(col, quoteFn)}, ${start}${len !== undefined ? `, ${len}` : ''})`),
  left: (col: FilterCols<TColEntries, string> | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`LEFT(${resolveArg(col, quoteFn)}, ${n})`),
  right: (col: FilterCols<TColEntries, string> | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`RIGHT(${resolveArg(col, quoteFn)}, ${n})`),
  repeat: (col: FilterCols<TColEntries, string> | SQLExpr<string>, n: number): SQLExpr<string> =>
    sqlExpr(`REPEAT(${resolveArg(col, quoteFn)}, ${n})`),
  reverse: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`REVERSE(${resolveArg(col, quoteFn)})`),
  lpad: (col: FilterCols<TColEntries, string> | SQLExpr<string>, len: number, pad: string): SQLExpr<string> =>
    sqlExpr(`LPAD(${resolveArg(col, quoteFn)}, ${len}, '${esc(pad)}')`),
  rpad: (col: FilterCols<TColEntries, string> | SQLExpr<string>, len: number, pad: string): SQLExpr<string> =>
    sqlExpr(`RPAD(${resolveArg(col, quoteFn)}, ${len}, '${esc(pad)}')`),
  initcap: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`INITCAP(${resolveArg(col, quoteFn)})`),
  strpos: (col: FilterCols<TColEntries, string> | SQLExpr<string>, substr: string): SQLExpr<number> =>
    sqlExpr(`STRPOS(${resolveArg(col, quoteFn)}, '${esc(substr)}')`),
  splitPart: (col: FilterCols<TColEntries, string> | SQLExpr<string>, delimiter: string, field: number): SQLExpr<string> =>
    sqlExpr(`SPLIT_PART(${resolveArg(col, quoteFn)}, '${esc(delimiter)}', ${field})`),
  btrim: (col: FilterCols<TColEntries, string> | SQLExpr<string>, chars?: string): SQLExpr<string> =>
    sqlExpr(`BTRIM(${resolveArg(col, quoteFn)}${chars !== undefined ? `, '${esc(chars)}'` : ''})`),
  md5: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`MD5(${resolveArg(col, quoteFn)})`),
  // DateTime overrides
  now:       (): SQLExpr<Date> => sqlExpr('NOW()'),
  curDate:   (): SQLExpr<Date> => sqlExpr('CURRENT_DATE'),
  year:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(YEAR FROM ${resolveArg(col, quoteFn)})::integer`),
  month:     (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(MONTH FROM ${resolveArg(col, quoteFn)})::integer`),
  day:       (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(DAY FROM ${resolveArg(col, quoteFn)})::integer`),
  hour:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(HOUR FROM ${resolveArg(col, quoteFn)})::integer`),
  minute:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(MINUTE FROM ${resolveArg(col, quoteFn)})::integer`),
  second:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`EXTRACT(SECOND FROM ${resolveArg(col, quoteFn)})::integer`),
  // PG-only DateTime fns
  extract:   (field: PgExtractField, col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> =>
    sqlExpr(`EXTRACT(${field} FROM ${resolveArg(col, quoteFn)})`),
  dateTrunc: (unit: PgDateTruncUnit, col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<Date> =>
    sqlExpr(`DATE_TRUNC('${unit}', ${resolveArg(col, quoteFn)})`),
  age:       (ts1: FilterCols<TColEntries, Date> | SQLExpr<Date>, ts2?: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> =>
    sqlExpr(ts2 !== undefined ? `AGE(${resolveArg(ts1, quoteFn)}, ${resolveArg(ts2, quoteFn)})` : `AGE(${resolveArg(ts1, quoteFn)})`),
  toDate:    (text: FilterCols<TColEntries, string> | SQLExpr<string>, fmt: string): SQLExpr<Date> =>
    sqlExpr(`TO_DATE(${resolveArg(text, quoteFn)}, '${esc(fmt)}')`),
});

export type DialectFns<TColEntries extends [string, unknown] = [string, unknown]> = ReturnType<typeof postgresqlContextFns<TColEntries>>;

/**
 * PostgreSQL dialect configuration.
 * - Identifier quoting: double quotes
 * - String concatenation: CONCAT() function
 * - List aggregation: STRING_AGG (PostgreSQL equivalent of GROUP_CONCAT)
 */
export const postgresqlDialect: Dialect = {
  name: "postgresql",
  needsBooleanCoercion: () => false,
  //@ts-expect-error isAlias currently unused
  quote: (id, isAlias) => `"${id}"`,
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
