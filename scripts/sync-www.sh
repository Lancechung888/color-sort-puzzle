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

echo "Synced index.html + assets/ → www/"
