export * from "./types.ts";
export { sqliteDialect } from "./sqlite.ts";
export { mysqlDialect } from "./mysql.ts";
export { postgresqlDialect } from "./postgresql.ts";

import { mysqlDialect } from "./mysql.ts";
import { postgresqlDialect } from "./postgresql.ts";
import { sqliteDialect } from "./sqlite.ts";
import type { Dialect, SupportedProvider } from "./types.ts";

// Default dialect export (overwritten by generator at runtime)
export { sqliteDialect as dialect };
export { sqliteContextFns as dialectContextFns } from "./sqlite.ts";

/**
 * Get dialect configuration by provider name.
 * Defaults to SQLite if provider is not recognized.
 */
export function getDialect(provider: SupportedProvider): Dialect {
  switch (provider) {
    case "sqlite":
      return sqliteDialect;
    case "mysql":
      return mysqlDialect;
    case "postgresql":
      return postgresqlDialect;
    default:
      return sqliteDialect;
  }
}
