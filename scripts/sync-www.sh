#!/usr/bin/env bash
# Sync static web assets into www/ (Capacitor webDir) and docs/play/ (GitHub Pages demo).
# Single source of truth: root index.html + assets/ + site.webmanifest + sw.js.
# Do NOT maintain a divergent fork of game.js under docs/play.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW="$ROOT/www"
PLAY="$ROOT/docs/play"

sync_playable() {
  local dest="$1"
  local label="$2"
  mkdir -p "$dest"
  # Clean previous sync (keep dest itself)
  find "$dest" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

  cp "$ROOT/index.html" "$dest/index.html"
  cp -R "$ROOT/assets" "$dest/assets"
  if [[ -f "$ROOT/site.webmanifest" ]]; then
    cp "$ROOT/site.webmanifest" "$dest/site.webmanifest"
  fi
  if [[ -f "$ROOT/sw.js" ]]; then
    cp "$ROOT/sw.js" "$dest/sw.js"
  fi
  echo "Synced index.html + assets/ + site.webmanifest + sw.js → ${label}"
}

sync_playable "$WWW" "www/"
sync_playable "$PLAY" "docs/play/"
