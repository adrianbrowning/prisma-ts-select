/**
 * Shared SQL functions that work identically across all supported databases.
 * These aggregate functions use standard SQL syntax.
 */
export const sharedFunctions = {
  COUNT: (...args: string[]) => `COUNT(${args.join(", ")})`,
  SUM:   (...args: string[]) => `SUM(${args.join(", ")})`,
  AVG:   (...args: string[]) => `AVG(${args.join(", ")})`,
  MIN:   (...args: string[]) => `MIN(${args.join(", ")})`,
  MAX:   (...args: string[]) => `MAX(${args.join(", ")})`,
};
