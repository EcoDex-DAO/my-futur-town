#!/bin/sh
# Disposable local PostGIS only. Does not read Supabase credentials or expose ports.
set -eu
cd "$(dirname "$0")/.."
container="mft-db-check-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
# Trust authentication is limited to this isolated throwaway container.
docker run -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgis/postgis:16-3.5 >/dev/null
attempt=0
until docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then echo 'PostGIS startup timed out' >&2; exit 1; fi
  sleep 1
done
docker cp supabase/migrations/202611050001_reference_and_scenarios.sql "$container":/tmp/migration.sql
docker cp scripts/test-database.sql "$container":/tmp/test.sql
docker exec "$container" psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/test.sql
