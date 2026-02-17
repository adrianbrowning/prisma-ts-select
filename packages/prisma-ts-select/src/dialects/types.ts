// SQL function signature - takes string args, returns SQL string
type SQLFn = (...args: string[]) => string;

/**
 * Function registry for SQL dialect-specific functions.
 * Each dialect implements these functions according to its SQL syntax.
 */
export type FunctionRegistry = {
  // Aggregate functions (common across all dialects)
  COUNT: SQLFn;
  SUM: SQLFn;
  AVG: SQLFn;
  MIN: SQLFn;
  MAX: SQLFn;

  // String functions (dialect-specific implementations)
  CONCAT: SQLFn;
  GROUP_CONCAT: SQLFn; // Maps to STRING_AGG on PostgreSQL

  // Window functions (scaffolded for future use)
  ROW_NUMBER?: SQLFn;
  RANK?: SQLFn;
  DENSE_RANK?: SQLFn;
  LAG?: SQLFn;
  LEAD?: SQLFn;
};

/**
 * SQL dialect configuration.
 * Defines how identifiers are quoted and which SQL functions are available.
 */
export type Dialect = {
  name: "sqlite" | "mysql" | "postgresql";
  quote: (identifier: string, isAlias?: boolean) => string;
  functions: FunctionRegistry;

  /**
   * Indicates if this dialect requires SQL-layer coercion for Boolean fields.
   *
   * SQLite and MySQL store BOOLEAN columns as INTEGER (0/1), requiring CASE expressions
   * to convert to true/false at the SQL layer. PostgreSQL natively stores BOOLEAN values,
   * so no coercion is needed.
   *
   * @returns true if dialect needs boolean coercion (SQLite, MySQL), false otherwise (PostgreSQL)
   *
   * @example
   * // SQLite/MySQL: wraps boolean columns with CASE
   * SELECT CASE WHEN published = 1 THEN true ELSE false END FROM Post
   *
   * // PostgreSQL: no wrapping needed
   * SELECT published FROM Post
   */
  needsBooleanCoercion: () => boolean;

  /**
   * Quotes table identifiers according to dialect-specific rules.
   *
   * Different dialects have different quoting requirements for table names vs. aliases:
   * - **PostgreSQL**: Quotes table names with double quotes ("User"), but aliases are unquoted
   * - **SQLite/MySQL**: No quoting needed for table identifiers or aliases
   *
   * @param name - The table name or alias to quote
   * @param isAlias - Whether this identifier is a table alias (affects PostgreSQL quoting)
   * @returns Properly quoted identifier for this dialect
   *
   * @example
   * // PostgreSQL
   * quoteTableIdentifier("User", false)  // Returns: "User" (quoted table)
   * quoteTableIdentifier("u", true)      // Returns: u (unquoted alias)
   *
   * // SQLite/MySQL
   * quoteTableIdentifier("User", false)  // Returns: User (no quoting)
   * quoteTableIdentifier("u", true)      // Returns: u (no quoting)
   */
  quoteTableIdentifier: (name: string, isAlias: boolean) => string;

  /**
   * Quotes qualified column references (Table.column syntax).
   *
   * PostgreSQL requires double-quoted identifiers for qualified column references
   * in JOIN ON, WHERE, GROUP BY, and ORDER BY clauses.
   *
   * @param ref - Column reference, either qualified (Table.column) or unqualified (column)
   * @returns Quoted reference for this dialect
   *
   * @example
   * // PostgreSQL
   * quoteQualifiedColumn("User.id")  // Returns: "User"."id"
   * quoteQualifiedColumn("id")       // Returns: id (no quoting for unqualified)
   *
   * // SQLite/MySQL
   * quoteQualifiedColumn("User.id")  // Returns: User.id (unchanged)
   */
  quoteQualifiedColumn: (ref: string) => string;

  /**
   * Quotes ORDER BY clauses including direction (ASC/DESC).
   *
   * Handles qualified column references plus optional ASC/DESC suffix.
   *
   * @param clause - ORDER BY clause like "User.name DESC" or "id"
   * @returns Quoted clause for this dialect
   *
   * @example
   * // PostgreSQL
   * quoteOrderByClause("User.name DESC")  // Returns: "User"."name" DESC
   * quoteOrderByClause("id")              // Returns: id
   *
   * // SQLite/MySQL
   * quoteOrderByClause("User.name DESC")  // Returns: User.name DESC (unchanged)
   */
  quoteOrderByClause: (clause: string) => string;
};

export const SUPPORTED_PROVIDERS = ["sqlite", "mysql", "postgresql"] as const;
export type SupportedProvider = typeof SUPPORTED_PROVIDERS[keyof typeof SUPPORTED_PROVIDERS];
