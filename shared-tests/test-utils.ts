import assert from "node:assert";
import { dialect } from '#dialect';

/**
 * Assert SQL equality with dialect-aware quote normalization.
 * PostgreSQL uses double quotes, SQLite/MySQL use backticks.
 */
export function expectSQL(actual: string, expected: string): void {
  if (dialect.name === "postgresql") {
    // Replace backticks with double quotes for PostgreSQL
    expected = expected.replaceAll("`", '"');
  }

  assert.strictEqual(actual, expected);
}
