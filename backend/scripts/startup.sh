#!/usr/bin/env bash
set -e

echo "=== Lethathamo Startup ==="

# Read Postgres credentials from Docker secrets if available
PG_USER="$(cat /run/secrets/healthcheck_user 2>/dev/null || echo "$POSTGRES_USER")"
PG_PASS="$(cat /run/secrets/healthcheck_password 2>/dev/null || echo "")"
export PGPASSWORD="$PG_PASS"
PG_HOST="${POSTGRES_HOST:-storage-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_DB="${POSTGRES_DB:-lto}"

# Wait for PostgreSQL to be reachable (up to 30 seconds)
echo "Waiting for PostgreSQL at ${PG_HOST}:${PG_PORT}..."
RETRIES=15
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -q 2>/dev/null || [ "$RETRIES" -eq 0 ]; do
  sleep 2
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -eq 0 ]; then
  echo "WARNING: PostgreSQL did not become ready in time. Proceeding anyway (migrations may fail)..."
else
  echo "PostgreSQL is ready."
fi

# Run database migrations
echo "Running Alembic migrations..."
alembic upgrade head
echo "Migrations complete."

# Start the application (pass through any extra args, e.g. --reload)
echo "Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" "${@}"
