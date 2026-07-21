import type { Decimal } from "@prisma/client/runtime/client";
import { resolveArg, sqlExpr, DISTINCT_BRAND } from "../sql-expr.ts";
import type { SQLExpr } from "../sql-expr.ts";
// Re-exported for generated extend-v*.d.ts — required by type system, do not remove
export { DISTINCT_BRAND };
import { postgresqlContextFns, postgresqlDialect } from "./postgresql.ts";
import type { FilterCols, ColName } from "./shared.ts";

export type { PgExtractField, PgDateTruncUnit } from "./postgresql.ts";
export { postgresqlDialect };

/**
 * PostgreSQL Prisma v7 context fns.
 * Overrides:
 * - COUNT* → bigint (node-postgres in Prisma v7 returns bigint for SQL integer results)
 * - CEIL/FLOOR of numeric literal → Decimal (PostgreSQL returns `numeric` for CEIL/FLOOR(numeric))
 */
export const postgresqlV7ContextFns = <TColEntries extends [string, unknown] = never>(
  quoteFn: (ref: string) => string
) => ({
  ...postgresqlContextFns<TColEntries>(quoteFn),
  countAll:      (): SQLExpr<bigint> => sqlExpr("COUNT(*)"),
  count:         (col: ColName<TColEntries> | "*" | SQLExpr<unknown>): SQLExpr<bigint> =>
    sqlExpr(col === "*" ? "COUNT(*)" : `COUNT(${resolveArg(col as string | SQLExpr<unknown>, quoteFn)})`),
  countDistinct: (col: ColName<TColEntries>): SQLExpr<bigint> =>
    sqlExpr(`COUNT(DISTINCT ${quoteFn(col)})`),
  ceil:  (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number | Decimal> =>
    sqlExpr(`CEIL(${resolveArg(col, quoteFn)})`),
  floor: (col: FilterCols<TColEntries, number> | SQLExpr<number>): SQLExpr<number | Decimal> =>
    sqlExpr(`FLOOR(${resolveArg(col, quoteFn)})`),
});

export type DialectFns<TColEntries extends [string, unknown] = never, _TCriteria extends object = object> = ReturnType<typeof postgresqlV7ContextFns<TColEntries>>;
