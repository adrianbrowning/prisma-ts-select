import type { Dialect } from "./dialects/types.js";
import { lit as _lit, type LitToType, type SQLExpr } from "./sql-expr.js";

type LitValue = string | number | boolean | null;

/**
 * Runtime context passed to `select()` callbacks.
 * Provides typed SQL function builders scoped to the current query's tables/fields.
 * Extend via module augmentation for UDFs (deferred to UDF issue).
 */
export type SelectFnContext<_TSources, _TFields> = {
  /** Build a SQL literal from a JS value. */
  lit: <T extends LitValue>(v: T) => SQLExpr<LitToType<T>>;
};

/** Builds the runtime context object for a given dialect. */
export function buildContext<TSources, TFields>(
  _dialect: Dialect
): SelectFnContext<TSources, TFields> {
  return { lit: _lit };
}
