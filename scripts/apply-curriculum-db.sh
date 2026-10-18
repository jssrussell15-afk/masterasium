#!/usr/bin/env bash
# Load every migration into a local Postgres database. Does not touch hosted Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${PGDATABASE:-masterasium_curriculum_test}"

psql_base() {
  if [[ -n "${PGHOST:-}" ]]; then
    psql -v ON_ERROR_STOP=1 "$@"
  else
    sudo -u postgres psql -v ON_ERROR_STOP=1 "$@"
  fi
}

if [[ -z "${PGHOST:-}" ]]; then
  psql_base -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DB}' and pid <> pg_backend_pid();" >/dev/null || true
  psql_base -d postgres -c "drop database if exists ${DB};"
  psql_base -d postgres -c "create database ${DB};"
fi

psql_base -d "$DB" -f "$ROOT/supabase/tests/auth_stub.sql"

while IFS= read -r file; do
  echo "Applying ${file#"$ROOT"/}"
  psql_base -d "$DB" -f "$file"
done < <(find "$ROOT/supabase/migrations" -maxdepth 1 -name '*.sql' | sort)
