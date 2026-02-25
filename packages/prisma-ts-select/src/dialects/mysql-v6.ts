import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {FilterCols, ColName} from "./shared.js";
import {mysqlContextFns, mysqlDialect} from "./mysql.js";

export type { IntervalUnit } from "./mysql.js";
export { mysqlDialect };

/**
 * MySQL Prisma v6 context fns.
 * Overrides COUNT/LENGTH/ABS/CEIL/FLOOR/MOD/SIGN to return `bigint | number`:
 * node-mysql2 in Prisma v6 returns bigint for SQL INTEGER results.
 */
export const mysqlV6ContextFns = <TColEntries extends [string, unknown] = never, TCriteria extends object = object>(
  quoteFn: (ref: string) => string,
  condFn: (criteria: TCriteria) => string,
) => ({
  ...mysqlContextFns<TColEntries, TCriteria>(quoteFn, condFn),
  countAll:      (): SQLExpr<bigint> => sqlExpr('COUNT(*)'),
  count:         (col: ColName<TColEntries> | '*'): SQLExpr<bigint> =>
    sqlExpr(col === '*' ? 'COUNT(*)' : `COUNT(${quoteFn(col)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<bigint> =>
    sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  length: (col: FilterCols<TColEntries, string> | SQLExpr<string>): SQLExpr<bigint> =>
    sqlExpr(`LENGTH(${resolveArg(col, quoteFn)})`),
  abs:   (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> =>
    sqlExpr(`ABS(${resolveArg(col, quoteFn)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> =>
    sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> =>
    sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
  mod:   (col: FilterCols<TColEntries, number> | SQLExpr<number>, divisor: number): SQLExpr<bigint | number> =>
    sqlExpr(`MOD(${resolveArg(col, quoteFn)}, ${divisor})`),
  sign:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<bigint | number> =>
    sqlExpr(`SIGN(${resolveArg(col, quoteFn)})`),
});

export type DialectFns<TColEntries extends [string, unknown] = never, TCriteria extends object = object> = ReturnType<typeof mysqlV6ContextFns<TColEntries, TCriteria>>;
