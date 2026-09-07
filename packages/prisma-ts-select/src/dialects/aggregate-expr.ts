import type { SQLExpr } from "../sql-expr.ts";
import type { ColName } from "./shared.ts";

/**
 * A SQL aggregate expression carrying aggregate-local clauses.
 * `orderBy` appends an aggregate ORDER BY term to the ones already present; successive `filter`
 * calls AND their conditions together rather than replacing the previous one.
 * Both return a new expression — instances are immutable.
 */
export type AggregateExpr<T, TColEntries extends [string, unknown], TCriteria extends object> = SQLExpr<T> & {
  orderBy: (col: ColName<TColEntries>, dir?: "ASC" | "DESC") => AggregateExpr<T, TColEntries, TCriteria>;
  filter: (criteria: TCriteria) => AggregateExpr<T, TColEntries, TCriteria>;
};

/**
 * The aggregate-local clauses, rendered. Named fields rather than positional strings: the two are
 * both `string` but not interchangeable, so a swapped template would otherwise compile silently.
 */
export type AggClauses = {
  /** ` ORDER BY <terms>` — leading space included — or `""` when unordered. */
  orderBySql: string;
  /**
   * The filter condition SQL, or `""` when unfiltered. Dialects with native support wrap it in
   * ` FILTER (WHERE <cond>)`; MySQL compiles it to `CASE WHEN <cond> THEN <arg> END`.
   */
  filterCond: string;
};

/** Renders the aggregate call. Dialects own clause placement and filter compilation. */
export type AggBuildSql = (clauses: AggClauses) => string;

/** An ORDER BY term, kept unrendered so the dialect quoter applies to the column alone. */
type OrderTerm = { col: string; dir?: "ASC" | "DESC"; };

/** Dialect wiring, bound once per context; the same for every aggregate the context builds. */
type AggWiring<TCriteria extends object> = {
  quoteOrderBy: (clause: string) => string;
  condFn: (criteria: TCriteria) => string;
};

/** Per-aggregate configuration: the SQL template plus an optional dialect ORDER BY guard. */
type AggShape = {
  buildSql: AggBuildSql;
  validateOrderBy?: (col: string) => void;
};

/** Accumulated aggregate-local clauses. Conditions are compiled on the way in, never re-compiled. */
type AggState = {
  orders: ReadonlyArray<OrderTerm>;
  conds: ReadonlyArray<string>;
};

const EMPTY_STATE: AggState = { orders: [], conds: [] };

function aggExprNode<T, TColEntries extends [string, unknown], TCriteria extends object>(
  wiring: AggWiring<TCriteria>,
  shape: AggShape,
  state: AggState
): AggregateExpr<T, TColEntries, TCriteria> {
  // Only the last node of a chain is ever read, so render on demand and remember the result.
  let rendered: string | undefined;
  const getSql = (): string => {
    if (rendered === undefined) {
      const { orders, conds } = state;
      const terms = orders.map(({ col, dir }) => wiring.quoteOrderBy(dir ? `${col} ${dir}` : col));
      // A single condition renders bare; only a chain needs parens to survive the AND join.
      const filterCond = conds.length > 1 ? conds.map(c => `(${c})`).join(" AND ") : (conds[0] ?? "");
      rendered = shape.buildSql({ orderBySql: terms.length > 0 ? ` ORDER BY ${terms.join(", ")}` : "", filterCond });
    }
    return rendered;
  };

  return {
    get sql() { return getSql(); },
    toString() { return getSql(); },
    orderBy(col, dir) {
      shape.validateOrderBy?.(col);
      return aggExprNode<T, TColEntries, TCriteria>(wiring, shape, { orders: [ ...state.orders, { col, dir }], conds: state.conds });
    },
    filter(criteria) {
      // Compiled here, not at render: `.filter({})` must fail on the offending call, not later.
      const compiled = wiring.condFn(criteria);
      if (!compiled) throw new Error("filter: criteria compiled to an empty condition — pass at least one predicate");
      return aggExprNode<T, TColEntries, TCriteria>(wiring, shape, { orders: state.orders, conds: [ ...state.conds, compiled ] });
    },
  };
}

/**
 * Binds the dialect wiring once per context and returns the constructor each aggregate fn calls
 * with its own SQL template. Binding here is what keeps the column/criteria type parameters —
 * and so `orderBy`/`filter` narrowing — intact at every aggregate without a cast.
 *
 * @param quoteOrderBy dialect quoter, applied to each ORDER BY term at render time.
 * @param condFn compiles a criteria object to a condition; run once per `filter` call.
 */
export function createAggExpr<TColEntries extends [string, unknown], TCriteria extends object>(
  quoteOrderBy: (clause: string) => string,
  condFn: (criteria: TCriteria) => string
): <T>(buildSql: AggBuildSql, validateOrderBy?: (col: string) => void) => AggregateExpr<T, TColEntries, TCriteria> {
  const wiring: AggWiring<TCriteria> = { quoteOrderBy, condFn };
  return <T>(buildSql: AggBuildSql, validateOrderBy?: (col: string) => void) =>
    aggExprNode<T, TColEntries, TCriteria>(wiring, { buildSql, validateOrderBy }, EMPTY_STATE);
}
