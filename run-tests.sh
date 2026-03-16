#!/usr/bin/env bash
# Usage:
#   ./run-tests.sh                                    # all 6 packages
#   ./run-tests.sh --version 6                        # v6 only (sqlite + mysql + pg)
#   ./run-tests.sh --db sqlite                        # sqlite only (v6 + v7)
#   ./run-tests.sh --version 6 --db sqlite            # sqlite-v6 only
#   ./run-tests.sh --skip-build                       # skip prisma-ts-select build step
#   ./run-tests.sh --reset-db                         # run p:r before tests (reset + seed)
#   ./run-tests.sh --seed-only                        # spin up DBs + seed, then exit
#   ./run-tests.sh --test './tests/core/foo.spec.ts'  # run specific file/glob (skips lint:ts)

# ── Argument parsing ──────────────────────────────────────────────────────────
VERSION=""
DB=""
SKIP_BUILD=false
RESET_DB=false
SEED_ONLY=false
TEST_PATTERN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --version)    VERSION="$2";      shift 2 ;;
    --db)         DB="$2";           shift 2 ;;
    --skip-build) SKIP_BUILD=true;   shift ;;
    --reset-db)   RESET_DB=true;     shift ;;
    --seed-only)  SEED_ONLY=true;    shift ;;
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

# ── Branch-isolated DB name ───────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "local")
BRANCH_DB=$(echo "$BRANCH" | sed 's|[^a-zA-Z0-9]|_|g' | tr '[:upper:]' '[:lower:]' | cut -c1-62)
# versions get isolated DBs (avoids shared connection pool exhaustion)
BRANCH_DB_V6="${BRANCH_DB}_v6"
BRANCH_DB_V7="${BRANCH_DB}_v7"
MYSQL_URL_V6="mysql://root:test@localhost:3306/${BRANCH_DB_V6}"
MYSQL_URL_V7="mysql://root:test@localhost:3306/${BRANCH_DB_V7}"
PG_URL_V6="postgresql://postgres:test@localhost:5432/${BRANCH_DB_V6}?schema=public"
PG_URL_V7="postgresql://postgres:test@localhost:5432/${BRANCH_DB_V7}?schema=public"

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
  # Collect only the compose services we actually need
  declare -a COMPOSE_SERVICES=()
  for db in "${DBS[@]}"; do
    [[ "$db" == "mysql" ]] && COMPOSE_SERVICES+=("mysql")
    [[ "$db" == "pg" ]]    && COMPOSE_SERVICES+=("postgres")
  done

  RUNNING=$(docker compose ps --services --filter status=running 2>/dev/null || echo "")
  NEED_START=false
  for svc in "${COMPOSE_SERVICES[@]}"; do
    echo "$RUNNING" | grep -q "^${svc}$" || NEED_START=true
  done

  if ! $NEED_START; then
    echo "Docker services already running, skipping startup."
  else
    # Stop any other Docker containers holding required ports before starting
    declare -A PORT_MAP=([postgres]=5432 [mysql]=3306)
    for svc in "${COMPOSE_SERVICES[@]}"; do
      port="${PORT_MAP[$svc]}"
      [[ -z "$port" ]] && continue
      conflicting=$(docker ps --filter "publish=${port}" --format "{{.Names}}" 2>/dev/null)
      if [[ -n "$conflicting" ]]; then
        echo "Stopping conflicting container(s) on port ${port}: ${conflicting}"
        docker stop $conflicting
      fi
    done

    echo "Starting Docker services..."
    docker compose up -d --wait "${COMPOSE_SERVICES[@]}" || { echo "Docker failed to start" >&2; exit 1; }
    DOCKER_STARTED_BY_US=true
  fi

  echo "Branch DBs: ${BRANCH_DB_V6}, ${BRANCH_DB_V7}"
  for db in "${DBS[@]}"; do
    for ver in "${VERSIONS[@]}"; do
      branch_db_ver="BRANCH_DB_V${ver}"
      if [[ "$db" == "mysql" ]]; then
        docker compose exec -T mysql mysql -uroot -ptest -e "CREATE DATABASE IF NOT EXISTS \`${!branch_db_ver}\`;"
      elif [[ "$db" == "pg" ]]; then
        docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE \"${!branch_db_ver}\";" 2>/dev/null || true
      fi
    done
  done
fi

cleanup() {
  if $DOCKER_STARTED_BY_US; then
    echo ""
    echo "Stopping Docker services..."
    docker compose down
  fi
}
trap cleanup EXIT

$SEED_ONLY && RESET_DB=true

if $SKIP_BUILD; then
  echo "Skipping build (--skip-build)."
else
  echo "Building prisma-ts-select..."
  pnpm --filter prisma-ts-select build
fi

# ── Pre-reset shared DBs (mysql/pg: once per version) ─────────────────────────
if $RESET_DB; then
  for db in "${DBS[@]}"; do
    if [[ "$db" == "mysql" || "$db" == "pg" ]]; then
      for ver in "${VERSIONS[@]}"; do
        pkg="usage-${db}-v${ver}"
        url_var="${db^^}_URL_V${ver}"
        echo "Resetting ${db} DB (v${ver}) via ${pkg}..."
        DATABASE_URL="${!url_var}" pnpm --filter "${pkg}" p:r || { echo "p:r failed for ${pkg}" >&2; exit 1; }
      done
    fi
  done
fi

if $SEED_ONLY; then
  for ver in "${VERSIONS[@]}"; do
    for db in "${DBS[@]}"; do
      [[ "$db" == "mysql" || "$db" == "pg" ]] && continue  # already seeded above
      pkg="usage-${db}-v${ver}"
      echo "Seeding ${pkg}..."
      pnpm --filter "${pkg}" p:r || { echo "p:r failed for ${pkg}" >&2; exit 1; }
    done
  done
  echo "Seed complete."
  exit 0
fi

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
      MYSQL_URL_VAR="MYSQL_URL_V${ver}"
      PG_URL_VAR="PG_URL_V${ver}"
      [[ "$db" == "mysql" ]] && export DATABASE_URL="${!MYSQL_URL_VAR}"
      [[ "$db" == "pg" ]]    && export DATABASE_URL="${!PG_URL_VAR}"
      pnpm --filter "${pkg}" gen
      # sqlite: each version has its own file — reset per package
      # mysql/pg: shared server — already reset once above
      [[ "$db" == "sqlite" ]] && $RESET_DB && pnpm --filter "${pkg}" p:r
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
