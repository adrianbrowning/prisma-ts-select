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
  needsBooleanCoercion: () => true,
  quoteTableIdentifier: (name: string, _isAlias: boolean) => `\`${name}\``,
  quoteQualifiedColumn: (ref: string) => {
    if (!ref.includes('.')) return `\`${ref}\``;
    const [table, col] = ref.split('.', 2);
    return `\`${table}\`.\`${col}\``;
  },
  quoteOrderByClause: (clause: string) => {
    const parts = clause.trim().split(/\s+/);
    const colRef = parts[0] ?? '';
    const suffix = parts.slice(1).join(' ');
    const quoted = colRef.includes('.')
      ? (() => { const [table, col] = colRef.split('.', 2); return `\`${table}\`.\`${col}\``; })()
      : `\`${colRef}\``;
    return suffix ? `${quoted} ${suffix}` : quoted;
  },
};
