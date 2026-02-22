#!/bin/bash
set -e

echo "Starting v7 test suite (SQLite + MySQL + PostgreSQL in parallel)..."

docker compose up -d --wait mysql postgres

pnpm --filter prisma-ts-select build

# Run all v7 tests in parallel (SQLite doesn't need DB service)
echo ""
echo "=== Running v7-sqlite ==="
pnpm --filter usage-sqlite-v7 gen
pnpm --filter usage-sqlite-v7 p:r
pnpm --filter usage-sqlite-v7 lint:ts
pnpm --filter usage-sqlite-v7 test &
PID_SQLITE=$!

echo ""
echo "=== Running v7-mysql ==="
pnpm --filter usage-mysql-v7 gen
pnpm --filter usage-mysql-v7 p:r
pnpm --filter usage-mysql-v7 lint:ts
pnpm --filter usage-mysql-v7 test &
PID_MYSQL=$!

echo ""
echo "=== Running v7-pg ==="
pnpm --filter usage-pg-v7 gen
pnpm --filter usage-pg-v7 p:r
pnpm --filter usage-pg-v7 lint:ts
pnpm --filter usage-pg-v7 test &
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

[ $EXIT_SQLITE -eq 0 ] && [ $EXIT_MYSQL -eq 0 ] && [ $EXIT_PG -eq 0 ]
