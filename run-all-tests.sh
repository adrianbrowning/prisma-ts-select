#!/bin/bash
set -e

echo "Running complete test suite (v6 + v7)..."

./run-tests-v6.sh
V6_EXIT=$?

./run-tests-v7.sh
V7_EXIT=$?

echo ""
echo "======================================"
echo "  Complete Test Suite Results"
echo "======================================"
echo "Prisma v6: $([ $V6_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "Prisma v7: $([ $V7_EXIT -eq 0 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "======================================"

[ $V6_EXIT -eq 0 ] && [ $V7_EXIT -eq 0 ]
