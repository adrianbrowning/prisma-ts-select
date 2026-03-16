import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, sqlDistinct, type SQLExpr, type SQLDistinct, DISTINCT_BRAND} from "../sql-expr.js";
import type {JSONValue, JSONObject} from "../utils/types.js";
import type {Decimal} from "@prisma/client/runtime/client";
import {esc, flattenJsonObjectPairs, type FilterCols, type FilterJsonCols, type ColName, type ColTypeOf} from "./shared.js";

type MySQLCastTypeMap = { SIGNED: bigint; UNSIGNED: bigint; DECIMAL: Decimal; CHAR: string; BINARY: Buffer; DATE: Date; DATETIME: Date; TIME: string; JSON: JSONValue; FLOAT: number; DOUBLE: number };

const MYSQL_CAST_TYPES = new Set<string>(['SIGNED','UNSIGNED','DECIMAL','CHAR','BINARY','DATE','DATETIME','TIME','JSON','FLOAT','DOUBLE']);

export type IntervalUnit ='MICROSECOND' | 'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export const mysqlContextFns = <TColEntries extends [string, unknown] = never, TCriteria extends object = object>(
  quoteFn: (ref: string) => string,
  condFn: (criteria: TCriteria) => string,
) => ({
  avg: (col: FilterCols<TColEntries, number> | SQLExpr<number | null>): SQLExpr<Decimal> =>
    sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number | null>): SQLExpr<Decimal> =>
    sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  countAll:      (): SQLExpr<bigint> => sqlExpr('COUNT(*)'),
  count:         (col: ColName<TColEntries> | '*' | SQLExpr<unknown>): SQLExpr<bigint> =>
    sqlExpr(col === '*' ? 'COUNT(*)' : `COUNT(${resolveArg(col as string | SQLExpr<unknown>, quoteFn)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<bigint> => sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  distinct:      <Col extends ColName<TColEntries>>(col: Col): SQLDistinct<ColTypeOf<TColEntries, Col>> => sqlDistinct(`DISTINCT ${quoteFn(col)}`),
  length: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<bigint> => sqlExpr(`LENGTH(${resolveArg(col, quoteFn)})`),
  groupConcat: ((col: ColName<TColEntries> | SQLExpr<string>, sep?: string): SQLExpr<string | null> =>
    sqlExpr(`GROUP_CONCAT(${resolveArg(col, quoteFn)}${sep !== undefined ? ` SEPARATOR '${esc(sep)}'` : ''})`)
  ) as (
    & (<T extends string | null>(col: SQLDistinct<T>, sep?: string) => SQLExpr<T>)
    & (<Col extends ColName<TColEntries>>(col: Col, sep?: string) => SQLExpr<null extends ColTypeOf<TColEntries, Col> ? string | null : string>)
    & (<T extends string | null>(col: SQLExpr<T> & { readonly [DISTINCT_BRAND]?: never }, sep?: string) => SQLExpr<T>)
  ),
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
  locate: (substr: string, col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<bigint> =>
    sqlExpr(`LOCATE('${esc(substr)}', ${resolveArg(col, quoteFn)})`),
  space: (n: number): SQLExpr<string> =>
    sqlExpr(`SPACE(${n})`),
  // DateTime base fns (MySQL defaults)
  now:       (): SQLExpr<Date> => sqlExpr('NOW()'),
  curDate:   (): SQLExpr<Date> => sqlExpr('CURDATE()'),
  year:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<bigint> => sqlExpr(`YEAR(${resolveArg(col, quoteFn)})`),
  month:     (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<bigint> => sqlExpr(`MONTH(${resolveArg(col, quoteFn)})`),
  day:       (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<bigint> => sqlExpr(`DAY(${resolveArg(col, quoteFn)})`),
  hour:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<bigint> => sqlExpr(`HOUR(${resolveArg(col, quoteFn)})`),
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
    sqlExpr(`IFNULL(${resolveArg(col, quoteFn)}, ${fallback.sql})`),
  // NULL-poisoned: returns NULL if any arg is NULL
  greatest: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T | null> => {
    if (args.length === 0) throw new Error('greatest: requires at least one argument');
    return sqlExpr(`GREATEST(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`);
  },
  // NULL-poisoned: returns NULL if any arg is NULL
  least: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T | null> => {
    if (args.length === 0) throw new Error('least: requires at least one argument');
    return sqlExpr(`LEAST(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`);
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
  quarter:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<bigint> =>
    sqlExpr(`QUARTER(${resolveArg(col, quoteFn)})`),
  weekOfYear: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> =>
    sqlExpr(`WEEKOFYEAR(${resolveArg(col, quoteFn)})`),
  dayName:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> =>
    sqlExpr(`DAYNAME(${resolveArg(col, quoteFn)})`),
  lastDay:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<Date> =>
    sqlExpr(`LAST_DAY(${resolveArg(col, quoteFn)})`),
  // ── Math ─────────────────────────────────────────────────────────────────
  abs:   (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> => sqlExpr(`ABS(${resolveArg(col, quoteFn)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> => sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> => sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
  round: (col: FilterCols<TColEntries, number> | SQLExpr<number>, decimals?: number): SQLExpr<number> => sqlExpr(decimals !== undefined ? `ROUND(${resolveArg(col, quoteFn)}, ${decimals})` : `ROUND(${resolveArg(col, quoteFn)})`),
  power: (base: FilterCols<TColEntries, number> | SQLExpr<number>, exp: number | SQLExpr<number>): SQLExpr<number> => sqlExpr(`POWER(${resolveArg(base, quoteFn)}, ${typeof exp === 'number' ? exp : exp.sql})`),
  sqrt:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SQRT(${resolveArg(col, quoteFn)})`),
  mod:   (col: FilterCols<TColEntries, number> | SQLExpr<number>, divisor: number): SQLExpr<bigint | number> => sqlExpr(`MOD(${resolveArg(col, quoteFn)}, ${divisor})`),
  sign:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> => sqlExpr(`SIGN(${resolveArg(col, quoteFn)})`),
  exp:   (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`EXP(${resolveArg(col, quoteFn)})`),
  // ── Math (MySQL-specific) ─────────────────────────────────────────────────
  pi: (): SQLExpr<number> => sqlExpr('PI()'),
  ln: (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LN(${resolveArg(x, quoteFn)})`),
  /** Natural log (ln(x)). Use `log10(x)` for base-10. Note: PG `log(x)` is base-10 — opposite semantics. */
  log: (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG(${resolveArg(x, quoteFn)})`),
  log2: (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG2(${resolveArg(x, quoteFn)})`),
  log10: (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG10(${resolveArg(x, quoteFn)})`),
  truncate: (x: FilterCols<TColEntries, number> | SQLExpr<number>, n: number): SQLExpr<number> => sqlExpr(`TRUNCATE(${resolveArg(x, quoteFn)}, ${n})`),
  rand: (seed?: number): SQLExpr<number> => sqlExpr(seed !== undefined ? `RAND(${seed})` : 'RAND()'),
  // ── JSON scalar fns ───────────────────────────────────────────────────────
  jsonExtract: (col: FilterJsonCols<TColEntries> | SQLExpr<JSONValue>, path: string): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_EXTRACT(${resolveArg(col, quoteFn)}, '${esc(path)}')`),
  jsonArray: (...args: [ColName<TColEntries> | SQLExpr<unknown>, ...Array<ColName<TColEntries> | SQLExpr<unknown>>]): SQLExpr<JSONValue[]> =>
    sqlExpr(`JSON_ARRAY(${args.map(a => resolveArg(a as ColName<TColEntries> | SQLExpr<unknown>, quoteFn)).join(', ')})`),
  jsonObject: (pairs: [string, ColName<TColEntries> | SQLExpr<unknown>][]): SQLExpr<JSONObject> =>
    sqlExpr(`JSON_OBJECT(${flattenJsonObjectPairs(pairs, quoteFn).join(', ')})`),
  // ── Type coercion ────────────────────────────────────────────────────────
  cast: <T extends keyof MySQLCastTypeMap>(
    expr: ColName<TColEntries> | SQLExpr<unknown>,
    type: T
  ): SQLExpr<MySQLCastTypeMap[T]> => {
    if (!MYSQL_CAST_TYPES.has(type as string)) throw new Error(`cast: invalid cast type '${String(type)}'`);
    return sqlExpr(`CAST(${resolveArg(expr, quoteFn)} AS ${type})`);
  },
});

export type DialectFns<TColEntries extends [string, unknown] = never, TCriteria extends object = object> = ReturnType<typeof mysqlContextFns<TColEntries, TCriteria>>;

/** Join methods supported by MySQL (no FULL JOIN). */
export const supportedJoinMethods = [
  "join", "joinUnsafeTypeEnforced", "joinUnsafeIgnoreType",
  "innerJoin", "innerJoinUnsafeTypeEnforced", "innerJoinUnsafeIgnoreType",
  "leftJoin", "leftJoinUnsafeTypeEnforced", "leftJoinUnsafeIgnoreType",
  "rightJoin", "rightJoinUnsafeTypeEnforced", "rightJoinUnsafeIgnoreType",
  "crossJoin", "crossJoinUnsafeTypeEnforced", "crossJoinUnsafeIgnoreType",
  "manyToManyJoin",
] as const;

/**
 * MySQL dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: CONCAT() function
 * - List aggregation: GROUP_CONCAT
 */
export const mysqlDialect: Dialect = {
  name: "mysql",
  needsBooleanCoercion: () => true,
  quote: (id, _isAlias) => `\`${id.replace(/`/g, '``')}\``,
  quoteTableIdentifier: (name, _isAlias) => `\`${name.replace(/`/g, '``')}\``,
  quoteQualifiedColumn: (ref) => {
    if (!ref.includes('.')) return `\`${ref.replace(/`/g, '``')}\``;
    const [table, col] = ref.split('.', 2);
    return `\`${table!.replace(/`/g, '``')}\`.\`${col!.replace(/`/g, '``')}\``;
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
