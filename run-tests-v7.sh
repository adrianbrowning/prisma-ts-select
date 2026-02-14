#!/bin/bash
set -e

echo "Starting v7 test suite (SQLite → MySQL → PostgreSQL sequentially)..."

docker compose up -d --wait mysql postgres

pnpm --filter @gcm/prisma-ts-select build

# Run v7 tests sequentially (adapter constraint)
echo ""
echo "=== Running v7-sqlite ==="
pnpm --filter @gcm/usage-v7-sqlite test
EXIT_SQLITE=$?

echo ""
echo "=== Running v7-mysql ==="
pnpm --filter @gcm/usage-v7-mysql test
EXIT_MYSQL=$?

echo ""
echo "=== Running v7-pg ==="
pnpm --filter @gcm/usage-v7-pg test
EXIT_PG=$?

docker compose down

# Report results
echo ""
echo "=== Test Results ==="
echo "SQLite: $([ $EXIT_SQLITE -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "MySQL:  $([ $EXIT_MYSQL -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "PostgreSQL: $([ $EXIT_PG -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"

[ $EXIT_SQLITE -eq 0 ] && [ $EXIT_MYSQL -eq 0 ] && [ $EXIT_PG -eq 0 ]
