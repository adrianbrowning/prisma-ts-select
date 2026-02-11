import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";

/**
 * SQLite dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: || operator
 * - List aggregation: GROUP_CONCAT
 */
export const sqliteDialect: Dialect = {
  name: "sqlite",
  quote: (id: string) => `\`${id}\``,
  functions: {
    ...sharedFunctions,
    CONCAT: (...args: string[]) => args.join(" || "),
    GROUP_CONCAT: (...args: string[]) => `GROUP_CONCAT(${args.join(", ")})`,
  },
};
