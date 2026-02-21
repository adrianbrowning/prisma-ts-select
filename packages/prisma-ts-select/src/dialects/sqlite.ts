import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";
import {sqlExpr, type SQLExpr} from "../sql-expr.js";

export const sqliteContextFns = (quoteFn: (ref: string) => string) => ({
  groupConcat: (col: string, sep?: string): SQLExpr<string> =>
    sqlExpr(`GROUP_CONCAT(${quoteFn(col)}${sep !== undefined ? `, '${sep.replace(/'/g, "''")}'` : ''})`),
  total: (col: string): SQLExpr<number> => sqlExpr(`TOTAL(${quoteFn(col)})`),
});

export type DialectFns = ReturnType<typeof sqliteContextFns>;

/**
 * SQLite dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: || operator
 * - List aggregation: GROUP_CONCAT
 */
export const sqliteDialect: Dialect = {
  name: "sqlite",
  quote: (name, _isAlias) => {
    if (_isAlias) return "`" + name + "`";
    return name;
  },
  functions: {
    ...sharedFunctions,
    CONCAT: (...args) => args.join(" || "),
    GROUP_CONCAT: (...args) => `GROUP_CONCAT(${args.join(", ")})`
  },
  needsBooleanCoercion: () => true,
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
