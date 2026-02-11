#!/usr/bin/env bash
set -e

# Usage: ./scripts/test-local.sh [db] [version]
# Example: ./scripts/test-local.sh sqlite 6
# Example: ./scripts/test-local.sh mysql 7

DB=${1:-sqlite}
VERSION=${2:-6}

if [[ "$VERSION" == "6" ]]; then
  PKG="usage"
else
  PKG="usage-v7"
fi

echo "🧪 Testing Prisma v$VERSION + $DB in packages/$PKG"
echo ""

# Start Docker services if needed
if [[ "$DB" != "sqlite" ]]; then
  echo "📦 Starting Docker services..."
  docker-compose up -d
  
  # Wait for services
  if [[ "$DB" == "mysql" ]]; then
    echo "⏳ Waiting for MySQL..."
    for i in {1..30}; do
      if mysqladmin ping -h 127.0.0.1 -P 3306 -uroot -ptest --silent 2>/dev/null; then
        echo "✓ MySQL ready"
        break
      fi
      sleep 1
    done
  elif [[ "$DB" == "postgresql" ]]; then
    echo "⏳ Waiting for PostgreSQL..."
    for i in {1..30}; do
      if pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1; then
        echo "✓ PostgreSQL ready"
        break
      fi
      sleep 1
    done
  fi
  echo ""
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
PRISMA_PROVIDER=$DB pnpm --filter @gcm/$PKG gen:$DB

# Reset database
echo "🗃️  Resetting database..."
PRISMA_PROVIDER=$DB PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="automated test script" \
  pnpm --filter @gcm/$PKG p:r

# TypeScript check
echo "📝 TypeScript check..."
PRISMA_PROVIDER=$DB pnpm --filter @gcm/$PKG test:ts

# Run tests
echo "🧪 Running tests..."
PRISMA_PROVIDER=$DB pnpm --filter @gcm/$PKG test

echo ""
echo "✅ All tests complete for v$VERSION + $DB"
