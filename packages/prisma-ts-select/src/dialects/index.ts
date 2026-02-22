export * from "./types.js";
export {sqliteDialect} from "./sqlite.js";
export {mysqlDialect} from "./mysql.js";
export {postgresqlDialect} from "./postgresql.js";

import type {Dialect, SupportedProvider} from "./types.js";
import {sqliteDialect} from "./sqlite.js";
import {mysqlDialect} from "./mysql.js";
import {postgresqlDialect} from "./postgresql.js";

// Default dialect export (overwritten by generator at runtime)
export {sqliteDialect as dialect};
export {sqliteContextFns as dialectContextFns} from "./sqlite.js";

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
