import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {FilterCols, ColName} from "./shared.js";

/** SQLite MIN/MAX return bigint for integer columns, unchanged for other types. */
type SqliteMinMaxResult<TColEntries extends [string, unknown], Col extends string> =
  TColEntries extends [Col, infer V]
    ? NonNullable<V> extends number ? bigint | null : V | null
    : never;

// Prisma v6 stores DateTime as integer ms, v7 as ISO text in SQLite.
// CASE normalizes both to a date string; SQLExpr args (e.g. now()) pass through unchanged.
// INTEGER returns bigint — consistent with all other SQLite integer-returning functions
type SqliteCastTypeMap = { INTEGER: bigint; TEXT: string; REAL: number; NUMERIC: number; BLOB: Buffer };

const SQLITE_CAST_TYPES = new Set<string>(['INTEGER','TEXT','REAL','NUMERIC','BLOB']);

const dateArg = (col: string | SQLExpr<Date>, quoteFn: (ref: string) => string): string => {
  if (typeof col !== 'string') return col.sql;
  const ref = quoteFn(col);
  return `CASE WHEN typeof(${ref}) = 'integer' THEN datetime(${ref}/1000, 'unixepoch') ELSE ${ref} END`;
};

export const sqliteContextFns = <TColEntries extends [string, unknown] = never, TCriteria extends object = object>(
  quoteFn: (ref: string) => string,
  condFn: (criteria: TCriteria) => string,
) => ({
  avg: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  // SQLite SUM returns INTEGER (→ bigint) for integer columns, REAL (→ number) for float columns
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  // Aggregate integer-result fns — SQLite returns INTEGER → bigint
  countAll:      (): SQLExpr<bigint> => sqlExpr('COUNT(*)'),
  count:         (col: ColName<TColEntries> | '*'): SQLExpr<bigint> => sqlExpr(col === '*' ? 'COUNT(*)' : `COUNT(${quoteFn(col)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<bigint> => sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  // LENGTH returns INTEGER → bigint in SQLite
  length: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<bigint> => sqlExpr(`LENGTH(${resolveArg(col, quoteFn)})`),
  groupConcat: (col: ColName<TColEntries>, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? `, '${sep.replace(/'/g, "''")}'` : ''})`),
  total: (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`TOTAL(${quoteFn(col)})`),
  // SQLite MIN/MAX return bigint for integer columns — override base (number) return types
  min: <Col extends ColName<TColEntries>>(col: Col): SQLExpr<SqliteMinMaxResult<TColEntries, Col>> => sqlExpr(`MIN(${quoteFn(col)})`),
  max: <Col extends ColName<TColEntries>>(col: Col): SQLExpr<SqliteMinMaxResult<TColEntries, Col>> => sqlExpr(`MAX(${quoteFn(col)})`),
  concat: (...args: [FilterCols<TColEntries, string> | SQLExpr<string>, ...Array<FilterCols<TColEntries, string> | SQLExpr<string>>]): SQLExpr<string> => {
    if (args.length === 0) throw new Error('concat: requires at least one argument');
    return sqlExpr(args.map(a => resolveArg(a, quoteFn)).join(' || '));
  },
  substr: (col: FilterCols<TColEntries, string> | SQLExpr<string>, start: number, len?: number): SQLExpr<string> =>
    sqlExpr(`SUBSTR(${resolveArg(col, quoteFn)}, ${start}${len !== undefined ? `, ${len}` : ''})`),
  instr: (col: FilterCols<TColEntries, string> | SQLExpr<string>, substr: string): SQLExpr<bigint> =>
    sqlExpr(`INSTR(${resolveArg(col, quoteFn)}, '${substr.replace(/'/g, "''")}')`),
  char: (...codes: number[]): SQLExpr<string> =>
    sqlExpr(`CHAR(${codes.join(', ')})`),
  hex: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`HEX(${resolveArg(col, quoteFn)})`),
  unicode: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<bigint> =>
    sqlExpr(`UNICODE(${resolveArg(col, quoteFn)})`),
  // Control flow
  // Note: SQLite has no GREATEST()/LEAST() functions — it uses scalar MAX(a,b)/MIN(a,b) instead.
  // Omitted here because the naming diverges from the MySQL/PG convention.
  iif: <T>(cond: TCriteria | SQLExpr<unknown>, trueVal: SQLExpr<T>, falseVal: SQLExpr<T>): SQLExpr<T> => {
    const condSql = typeof cond === 'object' && cond !== null && 'sql' in cond
      ? (cond as SQLExpr<unknown>).sql
      : condFn(cond as TCriteria);
    return sqlExpr(`IIF(${condSql}, ${trueVal.sql}, ${falseVal.sql})`);
  },
  ifNull: <T>(col: FilterCols<TColEntries, T> | SQLExpr<T>, fallback: SQLExpr<NonNullable<T>>): SQLExpr<NonNullable<T>> =>
    sqlExpr(`IFNULL(${resolveArg(col, quoteFn)}, ${fallback.sql})`),
  // DateTime overrides
  now:       (): SQLExpr<Date> => sqlExpr(`datetime('now')`),
  curDate:   (): SQLExpr<Date> => sqlExpr(`date('now')`),
  year:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%Y', ${dateArg(col, quoteFn)})`),
  month:     (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%m', ${dateArg(col, quoteFn)})`),
  day:       (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%d', ${dateArg(col, quoteFn)})`),
  hour:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%H', ${dateArg(col, quoteFn)})`),
  minute:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%M', ${dateArg(col, quoteFn)})`),
  second:    (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%S', ${dateArg(col, quoteFn)})`),
  // SQLite-only DateTime fns
  /**
   * SQLite `strftime` returns `NULL` if the date value is `NULL` or cannot be parsed.
   * Unknown format directives (e.g. `%q`) are passed through literally, not as errors.
   */
  strftime:  (fmt: string, col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('${fmt.replace(/'/g, "''")}', ${dateArg(col, quoteFn)})`),
  julianday: (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`julianday(${dateArg(col, quoteFn)})`),
  date:      (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`date(${dateArg(col, quoteFn)})`),
  datetime:  (col: FilterCols<TColEntries, Date> | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`datetime(${dateArg(col, quoteFn)})`),
  // ── Math ─────────────────────────────────────────────────────────────────
  // SQLite returns bigint for integer results (ceil, floor, sign, mod) and number for floats.
  // All inputs accept SQLExpr<number | bigint> so composed calls (e.g. sqrt(power(...))) type-check.
  // sqrt/exp always return REAL, so they are typed as number.
  abs:   (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<bigint | number> => sqlExpr(`ABS(${resolveArg(col, quoteFn)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<bigint | number> => sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<bigint | number> => sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
  round: (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>, decimals?: number): SQLExpr<bigint | number> => sqlExpr(decimals !== undefined ? `ROUND(${resolveArg(col, quoteFn)}, ${decimals})` : `ROUND(${resolveArg(col, quoteFn)})`),
  // SQLite's POWER() always returns REAL regardless of input type
  power: (base: FilterCols<TColEntries, number> | SQLExpr<number | bigint>, exp: number | SQLExpr<number | bigint>): SQLExpr<number> => sqlExpr(`POWER(${resolveArg(base, quoteFn)}, ${typeof exp === 'number' ? exp : exp.sql})`),
  sqrt:  (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<number> => sqlExpr(`SQRT(${resolveArg(col, quoteFn)})`),
  mod:   (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>, divisor: number): SQLExpr<bigint | number> => sqlExpr(`MOD(${resolveArg(col, quoteFn)}, ${divisor})`),
  sign:  (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<bigint | number> => sqlExpr(`SIGN(${resolveArg(col, quoteFn)})`),
  exp:   (col: FilterCols<TColEntries, number> | SQLExpr<number | bigint>): SQLExpr<number> => sqlExpr(`EXP(${resolveArg(col, quoteFn)})`),
  // ── Math (SQLite 3.35+) ──────────────────────────────────────────────────
  // SQLite RANDOM() returns a 64-bit signed integer — always bigint
  random: (): SQLExpr<bigint> => sqlExpr('RANDOM()'),
  log:   (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG(${resolveArg(x, quoteFn)})`),
  log2:  (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG2(${resolveArg(x, quoteFn)})`),
  log10: (x: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`LOG10(${resolveArg(x, quoteFn)})`),
  // ── Type coercion ────────────────────────────────────────────────────────
  cast: <T extends keyof SqliteCastTypeMap>(
    expr: ColName<TColEntries> | SQLExpr<unknown>,
    type: T
  ): SQLExpr<SqliteCastTypeMap[T]> => {
    if (!SQLITE_CAST_TYPES.has(type as string)) throw new Error(`cast: invalid cast type '${String(type)}'`);
    return sqlExpr(`CAST(${resolveArg(expr, quoteFn)} AS ${type})`);
  },
});

export type DialectFns<TColEntries extends [string, unknown] = never, TCriteria extends object = object> = ReturnType<typeof sqliteContextFns<TColEntries, TCriteria>>;

/** Join methods supported by SQLite (no RIGHT JOIN or FULL JOIN). */
export const supportedJoinMethods = [
  "join", "joinUnsafeTypeEnforced", "joinUnsafeIgnoreType",
  "innerJoin", "innerJoinUnsafeTypeEnforced", "innerJoinUnsafeIgnoreType",
  "leftJoin", "leftJoinUnsafeTypeEnforced", "leftJoinUnsafeIgnoreType",
  "crossJoin", "crossJoinUnsafeTypeEnforced", "crossJoinUnsafeIgnoreType",
  "manyToManyJoin",
] as const;

/**
 * SQLite dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: || operator
 * - List aggregation: GROUP_CONCAT
 */
export const sqliteDialect: Dialect = {
  name: "sqlite",
  needsBooleanCoercion: () => true,
  quote: (name, _isAlias) => {
    if (_isAlias) return "`" + name + "`";
    return name;
  },
  quoteTableIdentifier: (name, _isAlias) => {
   if(_isAlias) return "`" + name + "`";
    return name;
  },
  quoteQualifiedColumn: (ref) => {
    if (!ref.includes(".")) return ref;
    const [table, col] = ref.split(".", 2);
    return `${table}.${col}`;
  },
  quoteOrderByClause: (clause) => {
    const parts = clause.trim().split(/\s+/);
    const colRef = parts[0] ?? "";
    const suffix = parts.slice(1).join(" ");
    const quoted = colRef.includes(".") ? (() => {
      const [table, col] = colRef.split(".", 2);
      return `${table}.${col}`;
    })() : `${colRef}`;
    return (suffix ? `${quoted} ${suffix}` : quoted);
  }
};
