import { sqlExpr } from "../sql-expr.ts";
import type { SQLExpr } from "../sql-expr.ts";
import type { ColName } from "./shared.ts";

/**
 * A SQL aggregate expression carrying aggregate-local clauses.
 * `orderBy` appends an aggregate ORDER BY term, `filter` restricts the aggregated rows.
 * Both return a new expression — instances are immutable.
 */
export type AggregateExpr<T, TColEntries extends [string, unknown], TCriteria extends object> = SQLExpr<T> & {
  orderBy: (col: ColName<TColEntries>, dir?: "ASC" | "DESC") => AggregateExpr<T, TColEntries, TCriteria>;
  filter: (criteria: TCriteria) => AggregateExpr<T, TColEntries, TCriteria>;
};

/**
 * Renders the aggregate call. Dialects own clause placement and filter compilation.
 * @param orderBySql ` ORDER BY <terms>`, or `""` when unordered.
 * @param filterCond the filter condition SQL, or `""` when unfiltered. Dialects with native
 *   support append ` FILTER (WHERE <cond>)`; MySQL compiles it to `CASE WHEN <cond> THEN <arg> END`.
 */
export type AggBuildSql = (orderBySql: string, filterCond: string) => string;

export function createAggExpr<T>(
  buildSql: AggBuildSql,
  quoteOrderBy: (clause: string) => string,
  condFn: (criteria: object) => string,
  orders: Array<string> = [],
  filterCriteria?: object
): AggregateExpr<T, [string, unknown], object> {
  const sql = buildSql(
    orders.length > 0 ? ` ORDER BY ${orders.join(", ")}` : "",
    filterCriteria ? condFn(filterCriteria) : ""
  );

  return {
    ...sqlExpr<T>(sql),
    orderBy(col: string, dir?: "ASC" | "DESC") {
      const term = quoteOrderBy(dir ? `${col} ${dir}` : col);
      return createAggExpr<T>(buildSql, quoteOrderBy, condFn, [ ...orders, term ], filterCriteria);
    },
    filter(criteria: object) {
      return createAggExpr<T>(buildSql, quoteOrderBy, condFn, orders, criteria);
    },
  };
}
