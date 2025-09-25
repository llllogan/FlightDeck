#!/bin/sh
set -euo pipefail

APP_DIST_DIR=${APP_DIST_DIR:-/app/dist/flightdeck}
ENV_FILE_PATH="${APP_DIST_DIR}/assets/env.js"

mkdir -p "$(dirname "$ENV_FILE_PATH")"

API_BASE_URL=${API_BASE_URL:-http://localhost:3000}

export ENV_FILE_PATH
export API_BASE_URL

node <<'NODE'
const fs = require('fs');
const path = process.env.ENV_FILE_PATH;
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

function escapeJsString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const content = `(function (window) {
  window.__env = window.__env || {};
  window.__env.apiBaseUrl = '${escapeJsString(apiBaseUrl)}';
})(window);
`;

fs.writeFileSync(path, content, { encoding: 'utf-8' });
NODE

PORT=${PORT:-80}

exec http-server "$APP_DIST_DIR" -p "$PORT" -c-1 --gzip
