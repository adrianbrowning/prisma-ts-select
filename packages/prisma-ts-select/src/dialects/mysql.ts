import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";

/**
 * MySQL dialect configuration.
 * - Identifier quoting: backticks
 * - String concatenation: CONCAT() function
 * - List aggregation: GROUP_CONCAT
 */
export const mysqlDialect: Dialect = {
  name: "mysql",
  quote: (id: string) => `\`${id}\``,
  functions: {
    ...sharedFunctions,
    CONCAT: (...args: string[]) => `CONCAT(${args.join(", ")})`,
    GROUP_CONCAT: (...args: string[]) => `GROUP_CONCAT(${args.join(", ")})`,
  },
};
