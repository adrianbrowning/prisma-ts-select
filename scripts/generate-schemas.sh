#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/schema.template.prisma"
TARGET_DIR="${1:-$SCRIPT_DIR/../packages/usage/prisma}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: Template not found at $TEMPLATE"
  exit 1
fi

mkdir -p "$TARGET_DIR"

# SQLite
sed -e 's/{{PROVIDER}}/sqlite/g' \
    -e 's|{{URL}}|file:./data.db|g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.sqlite.prisma"

# MySQL
sed -e 's/{{PROVIDER}}/mysql/g' \
    -e 's|{{URL}}|mysql://root:test@localhost:3306/prisma_test|g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.mysql.prisma"

# PostgreSQL
sed -e 's/{{PROVIDER}}/postgresql/g' \
    -e 's|{{URL}}|postgresql://postgres:test@localhost:5432/prisma_test|g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.postgresql.prisma"

echo "✓ Generated schemas in $TARGET_DIR"
