import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";
import type {Decimal} from "@prisma/client/runtime/client";
import type {FilterCols, ColName} from "./shared.js";

const esc = (s: string) => s.replace(/'/g, "''");

export type IntervalUnit = 'MICROSECOND' | 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export const mysqlContextFns = <TColEntries extends [string, unknown] = never, TCriteria extends object = object>(
  quoteFn: (ref: string) => string,
  condFn: (criteria: TCriteria) => string,
) => ({
  avg: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<Decimal> =>
    sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<Decimal> =>
    sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  groupConcat:   (col: ColName<TColEntries>, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? ` SEPARATOR '${esc(sep)}'` : ''})`),
  bitAnd:        (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  bitXor:        (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`BIT_XOR(${quoteFn(col)})`),
  stddev:        (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`STDDEV(${quoteFn(col)})`),
  stddevSamp:    (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  variance:      (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`VARIANCE(${quoteFn(col)})`),
  varSamp:       (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  jsonArrayAgg:  (col: ColName<TColEntries>): SQLExpr<JSONValue> => sqlExpr(`JSON_ARRAYAGG(${quoteFn(col)})`),
  jsonObjectAgg: (key: ColName<TColEntries>, val: ColName<TColEntries>): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECTAGG(${quoteFn(key)}, ${quoteFn(val)})`),
  concat: (...args: [FilterCols<TColEntries, string> | SQLExpr<string>, ...Array<FilterCols<TColEntries, string> | SQLExpr<string>>]): SQLExpr<string> => {
    if (args.length === 0) throw new Error('concat: requires at least one argument');
    return sqlExpr(`CONCAT(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`);
  },
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
  locate: (substr: string, col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<number> =>
    sqlExpr(`LOCATE('${esc(substr)}', ${resolveArg(col, quoteFn)})`),
  space: (n: number): SQLExpr<string> =>
    sqlExpr(`SPACE(${n})`),
  // DateTime base fns (MySQL defaults)
  now:       (): SQLExpr<Date> => sqlExpr('NOW()'),
  curDate:   (): SQLExpr<Date> => sqlExpr('CURDATE()'),
  year:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`YEAR(${resolveArg(col, quoteFn)})`),
  month:     (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`MONTH(${resolveArg(col, quoteFn)})`),
  day:       (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`DAY(${resolveArg(col, quoteFn)})`),
  hour:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`HOUR(${resolveArg(col, quoteFn)})`),
  minute:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`MINUTE(${resolveArg(col, quoteFn)})`),
  second:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`SECOND(${resolveArg(col, quoteFn)})`),
  // Control flow
  $if: <T>(cond: TCriteria | SQLExpr<unknown>, trueVal: SQLExpr<T>, falseVal: SQLExpr<T>): SQLExpr<T> => {
    const condSql = typeof cond === 'object' && cond !== null && 'sql' in cond
      ? (cond as SQLExpr<unknown>).sql
      : condFn(cond as TCriteria);
    return sqlExpr(`IF(${condSql}, ${trueVal.sql}, ${falseVal.sql})`);
  },
  ifNull: <T>(col: FilterCols<TColEntries, T> | SQLExpr<T>, fallback: SQLExpr<NonNullable<T>>): SQLExpr<NonNullable<T>> =>
    sqlExpr(`IFNULL(${resolveArg(col as string | SQLExpr<any>, quoteFn)}, ${fallback.sql})`),
  // NULL-poisoned: returns NULL if any arg is NULL
  greatest: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T | null> => {
    if (args.length === 0) throw new Error('greatest: requires at least one argument');
    return sqlExpr(`GREATEST(${args.map(a => resolveArg(a as string | SQLExpr<any>, quoteFn)).join(', ')})`);
  },
  // NULL-poisoned: returns NULL if any arg is NULL
  least: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T | null> => {
    if (args.length === 0) throw new Error('least: requires at least one argument');
    return sqlExpr(`LEAST(${args.map(a => resolveArg(a as string | SQLExpr<any>, quoteFn)).join(', ')})`);
  },
  // DateTime fns (MySQL-only)
  dateAdd: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>, n: number, unit: IntervalUnit): SQLExpr<Date> => {
    if (!Number.isFinite(n)) throw new Error(`dateAdd: n must be a finite number, got ${n}`);
    return sqlExpr(`DATE_ADD(${resolveArg(col, quoteFn)}, INTERVAL ${n} ${unit})`);
  },
  dateSub: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>, n: number, unit: IntervalUnit): SQLExpr<Date> => {
    if (!Number.isFinite(n)) throw new Error(`dateSub: n must be a finite number, got ${n}`);
    return sqlExpr(`DATE_SUB(${resolveArg(col, quoteFn)}, INTERVAL ${n} ${unit})`);
  },
  /**
   * MySQL `DATE_FORMAT` returns `NULL` if the date column value is `NULL`.
   * Unknown format specifiers are passed through literally, not as errors.
   */
  dateFormat: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>, fmt: string): SQLExpr<string> =>
    sqlExpr(`DATE_FORMAT(${resolveArg(col, quoteFn)}, '${esc(fmt)}')`),
  dateDiff:   (d1: FilterCols<TColEntries, Date> | SQLExpr<Date>, d2: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> =>
    sqlExpr(`DATEDIFF(${resolveArg(d1, quoteFn)}, ${resolveArg(d2, quoteFn)})`),
  quarter:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> =>
    sqlExpr(`QUARTER(${resolveArg(col, quoteFn)})`),
  weekOfYear: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> =>
    sqlExpr(`WEEKOFYEAR(${resolveArg(col, quoteFn)})`),
  dayName:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> =>
    sqlExpr(`DAYNAME(${resolveArg(col, quoteFn)})`),
  lastDay:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<Date> =>
    sqlExpr(`LAST_DAY(${resolveArg(col, quoteFn)})`),
});

export type DialectFns<TColEntries extends [string, unknown] = never, TCriteria extends object = object> = ReturnType<typeof mysqlContextFns<TColEntries, TCriteria>>;

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
