#!/bin/bash
set -e

# Enable BuildKit for cache mounts
export DOCKER_BUILDKIT=1

# Start shared databases first
echo ""
echo "=== Starting shared databases ==="
docker compose -f docker-compose.test-isolated.yml up -d mysql postgres

# Wait for databases to be healthy and accepting connections
echo "Waiting for databases to be ready..."

echo -n "Waiting for MySQL... "
for i in {1..60}; do
  if docker compose -f docker-compose.test-isolated.yml exec -T mysql mysqladmin ping -h localhost -ptest --silent 2>/dev/null; then
    echo "ready!"
    break
  fi
  sleep 1
  if [ $i -eq 60 ]; then echo "timeout!"; exit 1; fi
done

echo -n "Waiting for PostgreSQL... "
for i in {1..60}; do
  if docker compose -f docker-compose.test-isolated.yml exec -T postgres pg_isready -U postgres 2>/dev/null | grep -q "accepting connections"; then
    echo "ready!"
    break
  fi
  sleep 1
  if [ $i -eq 60 ]; then echo "timeout!"; exit 1; fi
done

# Create test databases
echo "Creating test databases..."
docker compose -f docker-compose.test-isolated.yml exec -T mysql mysql -uroot -ptest -e "CREATE DATABASE IF NOT EXISTS prisma_v6_test; CREATE DATABASE IF NOT EXISTS prisma_v7_test;" 2>/dev/null
docker compose -f docker-compose.test-isolated.yml exec -T postgres psql -U postgres -c "CREATE DATABASE prisma_v6_test;" 2>/dev/null || true
docker compose -f docker-compose.test-isolated.yml exec -T postgres psql -U postgres -c "CREATE DATABASE prisma_v7_test;" 2>/dev/null || true

# Array to track test container names
declare -a TEST_CONTAINERS=()

# Function to build image and start test immediately
build_and_test() {
  local service=$1
  echo ""
  echo "=== Building $service ==="
  docker compose -f docker-compose.test-isolated.yml build "$service"

  echo "=== Starting $service tests in background ==="
  docker compose -f docker-compose.test-isolated.yml up -d "$service"
  TEST_CONTAINERS+=("$service")
}

# Build and start tests sequentially (but tests run in parallel)
build_and_test "test-v6-sqlite"
build_and_test "test-v6-mysql"
build_and_test "test-v6-pg"
build_and_test "test-v7-sqlite"
build_and_test "test-v7-mysql"
build_and_test "test-v7-pg"

echo ""
echo "=== All images built, waiting for tests to complete ==="
echo "Running tests: ${TEST_CONTAINERS[*]}"

# Wait for all test containers to finish
docker compose -f docker-compose.test-isolated.yml wait "${TEST_CONTAINERS[@]}"

# Collect exit codes
EXIT_CODE=0
for service in "${TEST_CONTAINERS[@]}"; do
  SERVICE_EXIT=$(docker inspect "$service" --format='{{.State.ExitCode}}' 2>/dev/null || echo "1")
  if [ "$SERVICE_EXIT" != "0" ]; then
    echo "✗ $service failed (exit code: $SERVICE_EXIT)"
    EXIT_CODE=1
  else
    echo "✓ $service passed"
  fi
done

echo ""
echo "=== Cleaning up ==="
docker compose -f docker-compose.test-isolated.yml down

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "=== All tests PASSED ✓ ==="
else
  echo ""
  echo "=== Some tests FAILED ✗ ==="
fi

exit $EXIT_CODE
