#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/../packages/usage/tests"
TARGET_DIR="$SCRIPT_DIR/../packages/usage-v7/tests"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: Source directory not found at $SOURCE_DIR"
  exit 1
fi

# Remove old tests if they exist
if [[ -d "$TARGET_DIR" ]]; then
  rm -rf "$TARGET_DIR"
fi

# Copy all test files
cp -r "$SOURCE_DIR" "$TARGET_DIR"

echo "✓ Synced tests from $SOURCE_DIR to $TARGET_DIR"
