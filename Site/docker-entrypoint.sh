#!/bin/sh
set -euo pipefail

if [ -n "${APP_DIST_DIR:-}" ]; then
  dist_dir="$APP_DIST_DIR"
elif [ -d /usr/share/nginx/html ]; then
  dist_dir="/usr/share/nginx/html"
else
  dist_dir="/app/dist/flightdeck"
fi

env_file_path=${ENV_FILE_PATH:-"${dist_dir}/assets/env.js"}
mkdir -p "$(dirname "$env_file_path")"

api_base_url=${API_BASE_URL:-http://localhost:3000}

escaped_api_base_url=${api_base_url//\/\\}
escaped_api_base_url=${escaped_api_base_url//"/\"}

cat > "$env_file_path" <<EOF
(function (window) {
  window.__env = window.__env || {};
  window.__env.apiBaseUrl = "${escaped_api_base_url}";
})(window);
EOF

echo "[FlightDeck] Wrote runtime env overrides to $env_file_path"
echo "[FlightDeck] API_BASE_URL=${api_base_url}"

default_cmd() {
  if command -v nginx >/dev/null 2>&1; then
    exec nginx -g 'daemon off;'
  elif command -v http-server >/dev/null 2>&1; then
    port=${PORT:-80}
    exec http-server "$dist_dir" -p "$port" -c-1 --gzip
  else
    echo "No web server binary found. Exiting." >&2
    exit 1
  fi
}

if [ "$#" -gt 0 ]; then
  exec "$@"
else
  default_cmd
fi
