#!/usr/bin/env bash
# Make Sail (uid 1000) and host user (uid 1001) share write access to hot paths.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE_FILE="${COMPOSE_FILE:-compose.sail.yaml}"
vendor/bin/sail exec -u root laravel.test bash -lc '
for path in /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/public/build /var/www/html/node_modules /var/www/html/vendor/pestphp/pest/.temp; do
  [ -e "$path" ] || continue
  chown -R 1001:1000 "$path" || true
  chmod -R ug+rwX "$path" || true
  if command -v setfacl >/dev/null 2>&1; then
    setfacl -R -m u:1000:rwX -m u:1001:rwX "$path" || true
    setfacl -R -d -m u:1000:rwX -m u:1001:rwX "$path" || true
  fi
done
echo "dev permissions refreshed"
'
