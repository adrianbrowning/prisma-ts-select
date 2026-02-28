import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {JSONValue} from "../utils/types.js";
import {esc, type FilterCols, type ColName} from "./shared.js";

export type PgExtractField = 'YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND' | 'DOW' | 'DOY' | 'EPOCH' | 'WEEK' | 'QUARTER';
export type PgDateTruncUnit = 'microseconds' | 'milliseconds' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'decade' | 'century' | 'millennium';

export const postgresqlContextFns = <TColEntries extends [string, unknown] = never>(quoteFn: (ref: string) => string) => ({
  avg: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  countAll:      (): SQLExpr<number> => sqlExpr('COUNT(*)'),
  count:         (col: ColName<TColEntries> | '*'): SQLExpr<number> => sqlExpr(col === '*' ? 'COUNT(*)' : `COUNT(${quoteFn(col)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  length: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<number> => sqlExpr(`LENGTH(${resolveArg(col, quoteFn)})`),
  stringAgg:     (col: ColName<TColEntries>, sep: string): SQLExpr<string> =>
    sqlExpr(`STRING_AGG(${quoteFn(col)}, '${esc(sep)}')`),
  arrayAgg:      (col: ColName<TColEntries>): SQLExpr<unknown[]> => sqlExpr(`ARRAY_AGG(${quoteFn(col)})`),
  stddevPop:     (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`STDDEV_POP(${quoteFn(col)})`),
  stddevSamp:    (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`STDDEV_SAMP(${quoteFn(col)})`),
  varPop:        (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`VAR_POP(${quoteFn(col)})`),
  varSamp:       (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`VAR_SAMP(${quoteFn(col)})`),
  boolAnd:       (col: FilterCols<TColEntries, boolean>): SQLExpr<boolean> => sqlExpr(`BOOL_AND(${quoteFn(col)})`),
  boolOr:        (col: FilterCols<TColEntries, boolean>): SQLExpr<boolean> => sqlExpr(`BOOL_OR(${quoteFn(col)})`),
  jsonAgg:       (col: ColName<TColEntries>): SQLExpr<JSONValue[]> => sqlExpr(`JSON_AGG(${quoteFn(col)})`),
  bitAnd:        (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`BIT_AND(${quoteFn(col)})`),
  bitOr:         (col: FilterCols<TColEntries, number>): SQLExpr<number> => sqlExpr(`BIT_OR(${quoteFn(col)})`),
  jsonObjectAgg: (key: ColName<TColEntries>, val: ColName<TColEntries>): SQLExpr<JSONValue> =>
    sqlExpr(`JSON_OBJECT_AGG(${quoteFn(key)}, ${quoteFn(val)})`),
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
  // Control flow
  greatest: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T> => {
    if (args.length === 0) throw new Error('greatest: requires at least one argument');
    return sqlExpr(`GREATEST(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`);
  },
  least: <T>(...args: [FilterCols<TColEntries, T> | SQLExpr<T>, ...Array<FilterCols<TColEntries, T> | SQLExpr<T>>]): SQLExpr<T> => {
    if (args.length === 0) throw new Error('least: requires at least one argument');
    return sqlExpr(`LEAST(${args.map(a => resolveArg(a, quoteFn)).join(', ')})`);
  },
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
  /**
   * PG `AGE()` returns an `interval`. Typed as `string` since node-postgres serializes
   * intervals as strings (e.g. `"1 year 2 mons 3 days"`). Arithmetic on the result
   * must be done in SQL, not JS — use `sqlExpr` to compose further expressions.
   */
  age:       (ts1: FilterCols<TColEntries, Date> | SQLExpr<Date>, ts2?: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> =>
    sqlExpr(ts2 !== undefined ? `AGE(${resolveArg(ts1, quoteFn)}, ${resolveArg(ts2, quoteFn)})` : `AGE(${resolveArg(ts1, quoteFn)})`),
  toDate:    (text: FilterCols<TColEntries, string> | SQLExpr<string>, fmt: string): SQLExpr<Date> =>
    sqlExpr(`TO_DATE(${resolveArg(text, quoteFn)}, '${esc(fmt)}')`),
  // ── Math ─────────────────────────────────────────────────────────────────
  abs:   (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`ABS(${resolveArg(col, quoteFn)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
  round: (col: FilterCols<TColEntries, number> | SQLExpr<number>, decimals?: number): SQLExpr<number> => sqlExpr(decimals !== undefined ? `ROUND(${resolveArg(col, quoteFn)}, ${decimals})` : `ROUND(${resolveArg(col, quoteFn)})`),
  power: (base: FilterCols<TColEntries, number> | SQLExpr<number>, exp: number | SQLExpr<number>): SQLExpr<number> => sqlExpr(`POWER(${resolveArg(base, quoteFn)}, ${typeof exp === 'number' ? exp : exp.sql})`),
  sqrt:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SQRT(${resolveArg(col, quoteFn)})`),
  mod:   (col: FilterCols<TColEntries, number> | SQLExpr<number>, divisor: number): SQLExpr<number> => sqlExpr(`MOD(${resolveArg(col, quoteFn)}, ${divisor})`),
  sign:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SIGN(${resolveArg(col, quoteFn)})`),
  exp:   (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`EXP(${resolveArg(col, quoteFn)})`),
  // ── Math (PostgreSQL-specific) ────────────────────────────────────────────
  pi:      (): SQLExpr<number> => sqlExpr('PI()'),
  ln:      (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LN(${resolveArg(x, quoteFn)})`),
  log:     (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG(${resolveArg(x, quoteFn)})`),
  logBase: (base: number, x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG(${base}, ${resolveArg(x, quoteFn)})`),
  trunc:   (x: FilterCols<TColEntries, number> | SQLExpr<number>, n?: number): SQLExpr<number> => sqlExpr(n !== undefined ? `TRUNC(${resolveArg(x, quoteFn)}, ${n})` : `TRUNC(${resolveArg(x, quoteFn)})`),
  div:     (x: FilterCols<TColEntries, number> | SQLExpr<number>, y: number): SQLExpr<number> => sqlExpr(`DIV(${resolveArg(x, quoteFn)}, ${y})`),
  random:  (): SQLExpr<number> => sqlExpr('RANDOM()'),
});

export type DialectFns<TColEntries extends [string, unknown] = never, _TCriteria extends object = object> = ReturnType<typeof postgresqlContextFns<TColEntries>>;

/**
 * PostgreSQL dialect configuration.
 * - Identifier quoting: double quotes
 * - String concatenation: CONCAT() function
 * - List aggregation: STRING_AGG (PostgreSQL equivalent of GROUP_CONCAT)
 */
export const postgresqlDialect: Dialect = {
  name: "postgresql",
  needsBooleanCoercion: () => false,
  quote: (id, _isAlias) => `"${id}"`,
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
