#!/bin/sh
# Disposable local PostGIS only. No Supabase credentials or exposed ports.
set -eu
cd "$(dirname "$0")/.."
postgis_schema="${1:-public}"
case "$postgis_schema" in public|extensions) ;; *) echo 'Usage: sh scripts/test-database.sh [public|extensions]' >&2; exit 2 ;; esac
container="mft-db-check-$$"
migrations_list="$(mktemp)"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "$migrations_list"
}
trap cleanup EXIT
# Trust is limited to this isolated throwaway container, never to a hosted DB.
docker run -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgis/postgis:16-3.5 >/dev/null
attempt=0
until docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then echo 'PostGIS startup timed out' >&2; exit 1; fi
  sleep 1
done
# template0 avoids inheriting the image's PostGIS schema so both layouts are tested.
docker exec "$container" createdb -U postgres -T template0 mft_test
for migration in supabase/migrations/*.sql; do
  [ -f "$migration" ] || { echo 'No migrations found' >&2; exit 1; }
  printf '\\i /tmp/migrations/%s\n' "$(basename "$migration")" >> "$migrations_list"
done
docker cp supabase/migrations "$container":/tmp/migrations
docker cp "$migrations_list" "$container":/tmp/apply-migrations.sql
docker cp scripts/test-database.sql "$container":/tmp/test.sql
docker cp scripts/supabase-preflight.sql "$container":/tmp/preflight.sql
docker exec "$container" psql -U postgres -d mft_test -v ON_ERROR_STOP=1 -v "postgis_schema=$postgis_schema" -f /tmp/test.sql
