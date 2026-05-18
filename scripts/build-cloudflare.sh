#!/usr/bin/env bash
set -euo pipefail

SITE_REPO="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_REPO_GIT_URL="${CONTENT_REPO_GIT_URL:-https://github.com/a1667834841/blog-content.git}"
BASE_URL="${SITE_BASE_URL:-${CF_PAGES_URL:-/}}"
WORK_DIR="$(mktemp -d)"
CONTENT_REPO_DIR="${WORK_DIR}/blog-content"

cleanup() {
  rm -rf "${WORK_DIR}"
}

trap cleanup EXIT

echo "Cloning content repository: ${CONTENT_REPO_GIT_URL}"
git clone --depth 1 "${CONTENT_REPO_GIT_URL}" "${CONTENT_REPO_DIR}"

echo "Syncing content into Hugo site"
CONTENT_REPO="${CONTENT_REPO_DIR}" SITE_REPO="${SITE_REPO}" ./scripts/sync-content.sh

echo "Building Hugo site with base URL: ${BASE_URL}"
hugo --gc --minify --baseURL "${BASE_URL}"

