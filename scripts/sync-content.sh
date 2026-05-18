#!/usr/bin/env bash
set -euo pipefail

CONTENT_REPO="${CONTENT_REPO:-/Users/wuwenjing/Documents/blog-content}"
SITE_REPO="${SITE_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"

sync_dir() {
  local source_dir="$1"
  local target_dir="$2"

  mkdir -p "$target_dir"
  rm -rf "$target_dir"
  mkdir -p "$target_dir"

  if [ -d "$source_dir" ]; then
    cp -R "$source_dir"/. "$target_dir"/
  fi
}

sync_dir "$CONTENT_REPO/content" "$SITE_REPO/content"
sync_dir "$CONTENT_REPO/static" "$SITE_REPO/static"
sync_dir "$CONTENT_REPO/data" "$SITE_REPO/data"
