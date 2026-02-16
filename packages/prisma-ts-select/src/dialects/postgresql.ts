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
  quoteTableIdentifier: (name: string, _isAlias: boolean) => `"${name}"`,
  quoteQualifiedColumn: (ref: string) => {
    if (!ref.includes('.')) return `"${ref}"`; // Quote unqualified column
    const [table, col] = ref.split('.', 2);
    return `"${table}"."${col}"`;
  },
  quoteOrderByClause: (clause: string) => {
    const parts = clause.trim().split(/\s+/);
    const colRef = parts[0] ?? '';
    const suffix = parts.slice(1).join(' '); // DESC/ASC
    // Inline quoting logic to avoid circular reference during construction
    const quoted = colRef.includes('.')
      ? (() => { const [table, col] = colRef.split('.', 2); return `"${table}"."${col}"`; })()
      : `"${colRef}"`;
    return suffix ? `${quoted} ${suffix}` : quoted;
  },
};
