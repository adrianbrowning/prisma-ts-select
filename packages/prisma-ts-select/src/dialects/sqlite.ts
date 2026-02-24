import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {FilterCols, ColName} from "./shared.js";

// Prisma v6 stores DateTime as integer ms, v7 as ISO text in SQLite.
// CASE normalizes both to a date string; SQLExpr args (e.g. now()) pass through unchanged.
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
  sum: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  groupConcat: (col: ColName<TColEntries>, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? `, '${sep.replace(/'/g, "''")}'` : ''})`),
  total: (col: ColName<TColEntries>): SQLExpr<number> => sqlExpr(`TOTAL(${quoteFn(col)})`),
  concat: (...args: [FilterCols<TColEntries, string> | SQLExpr<string>, ...Array<FilterCols<TColEntries, string> | SQLExpr<string>>]): SQLExpr<string> => {
    if (args.length === 0) throw new Error('concat: requires at least one argument');
    return sqlExpr(args.map(a => resolveArg(a, quoteFn)).join(' || '));
  },
  substr: (col: FilterCols<TColEntries, string> | SQLExpr<string>, start: number, len?: number): SQLExpr<string> =>
    sqlExpr(`SUBSTR(${resolveArg(col, quoteFn)}, ${start}${len !== undefined ? `, ${len}` : ''})`),
  instr: (col: FilterCols<TColEntries, string> | SQLExpr<string>, substr: string): SQLExpr<number> =>
    sqlExpr(`INSTR(${resolveArg(col, quoteFn)}, '${substr.replace(/'/g, "''")}')`),
  char: (...codes: number[]): SQLExpr<string> =>
    sqlExpr(`CHAR(${codes.join(', ')})`),
  hex: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`HEX(${resolveArg(col, quoteFn)})`),
  unicode: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<number> =>
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
    sqlExpr(`IFNULL(${resolveArg(col as string | SQLExpr<any>, quoteFn)}, ${fallback.sql})`),
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
});

export type DialectFns<TColEntries extends [string, unknown] = never, TCriteria extends object = object> = ReturnType<typeof sqliteContextFns<TColEntries, TCriteria>>;

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
