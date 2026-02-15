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
  quote: (identifier: string) => string;
  functions: FunctionRegistry;

  // Dialect-specific behavior methods
  needsBooleanCoercion: () => boolean;
  quoteTableIdentifier: (name: string, isAlias: boolean) => string;
};

export const SUPPORTED_PROVIDERS = ["sqlite", "mysql", "postgresql"] as const;
export type SupportedProvider = typeof SUPPORTED_PROVIDERS[keyof typeof SUPPORTED_PROVIDERS];
