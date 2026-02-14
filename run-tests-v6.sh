#!/bin/bash
set -e

echo "Starting v6 test suite (SQLite + MySQL + PostgreSQL in parallel)..."

docker compose up -d --wait mysql postgres

pnpm --filter @gcm/prisma-ts-select build

# Run all v6 tests in parallel (SQLite doesn't need DB service)
pnpm --filter @gcm/usage-v6-sqlite test &
PID_SQLITE=$!

pnpm --filter @gcm/usage-v6-mysql test &
PID_MYSQL=$!

pnpm --filter @gcm/usage-v6-pg test &
PID_PG=$!

# Wait for all tests
wait $PID_SQLITE
EXIT_SQLITE=$?

wait $PID_MYSQL
EXIT_MYSQL=$?

wait $PID_PG
EXIT_PG=$?

docker compose down

# Report results
echo ""
echo "=== Test Results ==="
echo "SQLite: $([ $EXIT_SQLITE -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "MySQL:  $([ $EXIT_MYSQL -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "PostgreSQL: $([ $EXIT_PG -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"

# Exit with failure if any test failed
[ $EXIT_SQLITE -eq 0 ] && [ $EXIT_MYSQL -eq 0 ] && [ $EXIT_PG -eq 0 ]
