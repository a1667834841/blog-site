#!/usr/bin/env bash
set -euo pipefail

CONTENT_REPO="${CONTENT_REPO:-/Users/wuwenjing/Documents/blog-content}"
SITE_REPO="${SITE_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"

rsync -a --delete "$CONTENT_REPO/content/" "$SITE_REPO/content/"
rsync -a --delete "$CONTENT_REPO/static/" "$SITE_REPO/static/"
rsync -a --delete "$CONTENT_REPO/data/" "$SITE_REPO/data/"
