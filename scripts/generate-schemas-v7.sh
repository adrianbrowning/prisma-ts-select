#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/schema-v7.template.prisma"
TARGET_DIR="${1:-$SCRIPT_DIR/../packages/usage-v7/prisma}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: Template not found at $TEMPLATE"
  exit 1
fi

mkdir -p "$TARGET_DIR"

# SQLite
sed -e 's/{{PROVIDER}}/sqlite/g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.sqlite.prisma"

# MySQL
sed -e 's/{{PROVIDER}}/mysql/g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.mysql.prisma"

# PostgreSQL
sed -e 's/{{PROVIDER}}/postgresql/g' \
    "$TEMPLATE" > "$TARGET_DIR/schema.postgresql.prisma"

echo "✓ Generated v7 schemas in $TARGET_DIR"
