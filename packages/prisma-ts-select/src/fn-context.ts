// SelectFnContext, buildContext moved to extend.ts
// Re-export sql-expr primitives for any consumers that imported from here.
export { lit, sqlExpr, resolveArg } from "./sql-expr.js";
export type { SQLExpr, LitToType } from "./sql-expr.js";
