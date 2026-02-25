import type {Decimal} from "@prisma/client/runtime/client";
import {resolveArg, sqlExpr, type SQLExpr} from "../sql-expr.js";
import type {FilterCols, ColName} from "./shared.js";
import {postgresqlContextFns, postgresqlDialect} from "./postgresql.js";

export type { PgExtractField, PgDateTruncUnit } from "./postgresql.js";
export { postgresqlDialect };

/**
 * PostgreSQL Prisma v7 context fns.
 * Overrides:
 * - COUNT* → bigint (node-postgres in Prisma v7 returns bigint for SQL integer results)
 * - CEIL/FLOOR of numeric literal → Decimal (PostgreSQL returns `numeric` for CEIL/FLOOR(numeric))
 */
export const postgresqlV7ContextFns = <TColEntries extends [string, unknown] = never>(
  quoteFn: (ref: string) => string,
) => ({
  ...postgresqlContextFns<TColEntries>(quoteFn),
  countAll:      (): SQLExpr<bigint> => sqlExpr('COUNT(*)'),
  count:         (col: ColName<TColEntries> | '*'): SQLExpr<bigint> =>
    sqlExpr(col === '*' ? 'COUNT(*)' : `COUNT(${quoteFn(col)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<bigint> =>
    sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number | Decimal> =>
    sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number | Decimal> =>
    sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
});

export type DialectFns<TColEntries extends [string, unknown] = never, _TCriteria extends object = object> = ReturnType<typeof postgresqlV7ContextFns<TColEntries>>;
