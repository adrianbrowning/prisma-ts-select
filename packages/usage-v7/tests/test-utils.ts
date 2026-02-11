import assert from "node:assert";

/**
 * Assert SQL equality with dialect-aware quote normalization.
 * PostgreSQL uses double quotes, SQLite/MySQL use backticks.
 */
export function expectSQL(actual: string, expected: string): void {
  const provider = process.env.PRISMA_PROVIDER;

  if (provider === "postgresql") {
    // Replace backticks with double quotes for PostgreSQL
    expected = expected.replaceAll("`", '"');
  }

  assert.strictEqual(actual, expected);
}
