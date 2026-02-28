#!/usr/bin/env bash
# Usage:
#   ./run-tests.sh                                    # all 6 packages
#   ./run-tests.sh --version 6                        # v6 only (sqlite + mysql + pg)
#   ./run-tests.sh --db sqlite                        # sqlite only (v6 + v7)
#   ./run-tests.sh --version 6 --db sqlite            # sqlite-v6 only
#   ./run-tests.sh --skip-build                       # skip prisma-ts-select build step
#   ./run-tests.sh --test './tests/core/foo.spec.ts'  # run specific file/glob (skips lint:ts)

# ── Argument parsing ──────────────────────────────────────────────────────────
VERSION=""
DB=""
SKIP_BUILD=false
TEST_PATTERN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --version)    VERSION="$2";      shift 2 ;;
    --db)         DB="$2";           shift 2 ;;
    --skip-build) SKIP_BUILD=true;   shift ;;
    --test)       TEST_PATTERN="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

if [[ -n "$VERSION" && "$VERSION" != "6" && "$VERSION" != "7" ]]; then
  echo "Error: --version must be 6 or 7" >&2; exit 1
fi
if [[ -n "$DB" && "$DB" != "sqlite" && "$DB" != "mysql" && "$DB" != "pg" ]]; then
  echo "Error: --db must be sqlite, mysql, or pg" >&2; exit 1
fi

# ── Build package matrix ──────────────────────────────────────────────────────
VERSIONS=("6" "7")
DBS=("sqlite" "mysql" "pg")
[[ -n "$VERSION" ]] && VERSIONS=("$VERSION")
[[ -n "$DB" ]]      && DBS=("$DB")

# ── Setup ─────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d-%H%M)
mkdir -p test-results

# Determine if any selected dbs need docker
NEED_DOCKER=false
for db in "${DBS[@]}"; do
  [[ "$db" == "mysql" || "$db" == "pg" ]] && NEED_DOCKER=true && break
done

# Track whether WE started docker (so we only stop it if we started it)
DOCKER_STARTED_BY_US=false

if $NEED_DOCKER; then
  # Check if services are already running
  RUNNING=$(docker compose ps --services --filter status=running 2>/dev/null || echo "")
  if echo "$RUNNING" | grep -q "mysql" && echo "$RUNNING" | grep -q "postgres"; then
    echo "Docker services already running, skipping startup."
  else
    echo "Starting Docker services..."
    docker compose up -d --wait mysql postgres
    DOCKER_STARTED_BY_US=true
  fi
fi

cleanup() {
  if $DOCKER_STARTED_BY_US; then
    echo ""
    echo "Stopping Docker services..."
    docker compose down
  fi
}
trap cleanup EXIT

if $SKIP_BUILD; then
  echo "Skipping build (--skip-build)."
else
  echo "Building prisma-ts-select..."
  pnpm --filter prisma-ts-select build
fi

# ── Pre-reset shared DBs (mysql/pg: once per DB, not once per version) ────────
for db in "${DBS[@]}"; do
  if [[ "$db" == "mysql" || "$db" == "pg" ]]; then
    ver="${VERSIONS[0]}"
    pkg="usage-${db}-v${ver}"
    echo "Resetting ${db} DB via ${pkg}..."
    pnpm --filter "${pkg}" p:r || { echo "p:r failed for ${pkg}" >&2; exit 1; }
  fi
done

# ── Launch packages in parallel ───────────────────────────────────────────────
declare -a PIDS=()
declare -a PKG_DBS=()
declare -a PKG_VERS=()
declare -a LOG_PATHS=()

echo ""
for ver in "${VERSIONS[@]}"; do
  for db in "${DBS[@]}"; do
    pkg="usage-${db}-v${ver}"
    log="test-results/${TIMESTAMP}-${db}-v${ver}.log"

    echo "  → Starting ${pkg}..."
    (
      set -e
      pnpm --filter "${pkg}" gen
      # sqlite: each version has its own file — reset per package
      # mysql/pg: shared server — already reset once above
      [[ "$db" == "sqlite" ]] && pnpm --filter "${pkg}" p:r
      if [[ -n "$TEST_PATTERN" ]]; then
        (cd "packages/${pkg}" && node \
          --import ../../shared-tests/client-resolver.mjs \
          --import ../../shared-tests/test-setup.mjs \
          --test "${TEST_PATTERN}")
      else
        pnpm --filter "${pkg}" lint:ts
        pnpm --filter "${pkg}" test
      fi
    ) > "${log}" 2>&1 &

    PIDS+=($!)
    PKG_DBS+=("$db")
    PKG_VERS+=("v${ver}")
    LOG_PATHS+=("$log")
  done
done

echo ""
echo "Running ${#PIDS[@]} package(s) in parallel..."

# ── Collect exit codes ────────────────────────────────────────────────────────
declare -a EXITS=()
for pid in "${PIDS[@]}"; do
  wait "$pid"
  EXITS+=($?)
done

# ── Summary table ─────────────────────────────────────────────────────────────
echo ""
echo "Results:"
printf "%-8s | %-7s | %-9s | %s\n" "db" "version" "pass/fail" "test results path"
printf "%-8s-+-%-7s-+-%-9s-+-%s\n" "--------" "-------" "---------" "-------------------------------------"

OVERALL=0
for i in "${!EXITS[@]}"; do
  db="${PKG_DBS[$i]}"
  ver="${PKG_VERS[$i]}"
  log="${LOG_PATHS[$i]}"
  exit_code="${EXITS[$i]}"

  if [[ "$exit_code" -eq 0 ]]; then
    status="✅"
  else
    status="❌"
    OVERALL=1
  fi

  printf "%-8s | %-7s | %-9s | %s\n" "$db" "$ver" "$status" "$log"
done

echo ""
[[ $OVERALL -eq 0 ]] && echo "All tests passed ✓" || echo "Some tests failed ✗"

exit $OVERALL
