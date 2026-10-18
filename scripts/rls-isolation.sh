#!/usr/bin/env bash
# Apply migrations to a throwaway local database and check parent isolation.
# Does not connect to hosted Supabase and does not print secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGDATABASE="${PGDATABASE:-masterasium_rls_test}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed, so the local isolation script did not run."
  exit 0
fi

bash "$ROOT/scripts/apply-curriculum-db.sh"

if [[ -n "${PGHOST:-}" ]]; then
  psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f "$ROOT/supabase/tests/rls_isolation.sql"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f "$ROOT/supabase/tests/rls_isolation.sql"
fi
echo "RLS isolation checks passed."
