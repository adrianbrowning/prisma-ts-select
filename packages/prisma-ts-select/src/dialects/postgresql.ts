import type {Dialect} from "./types.js";
import {sharedFunctions} from "./shared.js";

/**
 * PostgreSQL dialect configuration.
 * - Identifier quoting: double quotes
 * - String concatenation: CONCAT() function
 * - List aggregation: STRING_AGG (PostgreSQL equivalent of GROUP_CONCAT)
 */
export const postgresqlDialect: Dialect = {
  name: "postgresql",
  quote: (id: string) => `"${id}"`,
  functions: {
    ...sharedFunctions,
    CONCAT: (...args: string[]) => `CONCAT(${args.join(", ")})`,
    GROUP_CONCAT: (...args: string[]) => `STRING_AGG(${args.join(", ")})`,
  },
  needsBooleanCoercion: () => false,
  quoteTableIdentifier: (name: string, isAlias: boolean) => isAlias ? name : `"${name}"`,
};
