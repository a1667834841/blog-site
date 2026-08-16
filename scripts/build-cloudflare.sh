#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SITE_BASE_URL:-${CF_PAGES_URL:-/}}"

echo "Building Hugo site with base URL: ${BASE_URL}"
hugo --gc --minify --baseURL "${BASE_URL}"
