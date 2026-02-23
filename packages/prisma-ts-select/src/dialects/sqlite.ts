import type {Dialect} from "./types.js";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";

// Prisma v6 stores DateTime as integer ms, v7 as ISO text in SQLite.
// CASE normalizes both to a date string; SQLExpr args (e.g. now()) pass through unchanged.
const dateArg = <TCol extends string>(col: TCol | SQLExpr<Date>, quoteFn: (ref: string) => string): string => {
  if (typeof col !== 'string') return col.sql;
  const ref = quoteFn(col);
  return `CASE WHEN typeof(${ref}) = 'integer' THEN datetime(${ref}/1000, 'unixepoch') ELSE ${ref} END`;
};

export const sqliteContextFns = <TCol extends string = string>(quoteFn: (ref: string) => string) => ({
  avg: (col: TCol | SQLExpr<number>): SQLExpr<number> => sqlExpr(`AVG(${resolveArg(col, quoteFn)})`),
  sum: (col: TCol | SQLExpr<number>): SQLExpr<number> => sqlExpr(`SUM(${resolveArg(col, quoteFn)})`),
  groupConcat: (col: TCol, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? `, '${sep.replace(/'/g, "''")}'` : ''})`),
  total: (col: TCol): SQLExpr<number> => sqlExpr(`TOTAL(${quoteFn(col)})`),
  concat: (...args: Array<TCol | SQLExpr<string>>): SQLExpr<string> =>
    sqlExpr(args.map(a => resolveArg(a, quoteFn)).join(' || ')),
  substr: (col: TCol | SQLExpr<string>, start: number, len?: number): SQLExpr<string> =>
    sqlExpr(`SUBSTR(${resolveArg(col, quoteFn)}, ${start}${len !== undefined ? `, ${len}` : ''})`),
  instr: (col: TCol | SQLExpr<string>, substr: string): SQLExpr<number> =>
    sqlExpr(`INSTR(${resolveArg(col, quoteFn)}, '${substr.replace(/'/g, "''")}')`),
  char: (...codes: number[]): SQLExpr<string> =>
    sqlExpr(`CHAR(${codes.join(', ')})`),
  hex: (col: TCol | SQLExpr<string>): SQLExpr<string> =>
    sqlExpr(`HEX(${resolveArg(col, quoteFn)})`),
  unicode: (col: TCol | SQLExpr<string>): SQLExpr<number> =>
    sqlExpr(`UNICODE(${resolveArg(col, quoteFn)})`),
  // DateTime overrides
  now:       (): SQLExpr<Date> => sqlExpr(`datetime('now')`),
  curDate:   (): SQLExpr<Date> => sqlExpr(`date('now')`),
  year:      (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%Y', ${dateArg(col, quoteFn)})`),
  month:     (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%m', ${dateArg(col, quoteFn)})`),
  day:       (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%d', ${dateArg(col, quoteFn)})`),
  hour:      (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%H', ${dateArg(col, quoteFn)})`),
  minute:    (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%M', ${dateArg(col, quoteFn)})`),
  second:    (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('%S', ${dateArg(col, quoteFn)})`),
  // SQLite-only DateTime fns
  strftime:  (fmt: string, col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`strftime('${fmt.replace(/'/g, "''")}', ${dateArg(col, quoteFn)})`),
  julianday: (col: TCol | SQLExpr<Date>): SQLExpr<number> => sqlExpr(`julianday(${dateArg(col, quoteFn)})`),
  date:      (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`date(${dateArg(col, quoteFn)})`),
  datetime:  (col: TCol | SQLExpr<Date>): SQLExpr<string> => sqlExpr(`datetime(${dateArg(col, quoteFn)})`),
});

export type DialectFns<TCol extends string = string> = ReturnType<typeof sqliteContextFns<TCol>>;

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
