#!/usr/bin/env bash
# Sync static web assets into www/ for Capacitor (webDir).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW="$ROOT/www"

mkdir -p "$WWW"
# Clean previous sync (keep www/ itself)
find "$WWW" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

cp "$ROOT/index.html" "$WWW/index.html"
cp -R "$ROOT/assets" "$WWW/assets"
if [[ -f "$ROOT/site.webmanifest" ]]; then
  cp "$ROOT/site.webmanifest" "$WWW/site.webmanifest"
fi
if [[ -f "$ROOT/sw.js" ]]; then
  cp "$ROOT/sw.js" "$WWW/sw.js"
fi

echo "Synced index.html + assets/ (incl. maskable icons) + site.webmanifest + sw.js → www/"
