#!/usr/bin/env bash
# Idempotent: set Play versionCode/versionName after cap sync (android/ is gitignored).
# Cap sync / fresh cap add resets defaultConfig to versionCode 1 — always re-apply before bundleRelease.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE="$ROOT/android/app/build.gradle"
VERSION_CODE="${COLOR_TUBE_VERSION_CODE:-2}"
VERSION_NAME="${COLOR_TUBE_VERSION_NAME:-1.0.1}"

log() { echo "[patch-android-version] $*"; }

if [[ ! -f "$GRADLE" ]]; then
  log "android/app/build.gradle missing — skip (run cap add android first)."
  exit 0
fi

# Replace versionCode / versionName lines inside defaultConfig (first occurrence each).
tmp="$(mktemp)"
awk -v vc="$VERSION_CODE" -v vn="$VERSION_NAME" '
  BEGIN { vc_done=0; vn_done=0 }
  /^[[:space:]]*versionCode[[:space:]]+/ && !vc_done {
    sub(/versionCode[[:space:]]+[0-9]+/, "versionCode " vc)
    vc_done=1
  }
  /^[[:space:]]*versionName[[:space:]]+/ && !vn_done {
    sub(/versionName[[:space:]]+"[^"]*"/, "versionName \"" vn "\"")
    vn_done=1
  }
  { print }
' "$GRADLE" > "$tmp"
mv "$tmp" "$GRADLE"

if grep -Eq "^[[:space:]]*versionCode[[:space:]]+${VERSION_CODE}[[:space:]]*$" "$GRADLE" \
  && grep -Eq "^[[:space:]]*versionName[[:space:]]+\"${VERSION_NAME}\"[[:space:]]*$" "$GRADLE"; then
  log "OK versionCode=${VERSION_CODE} versionName=${VERSION_NAME}"
else
  log "ERROR: failed to set versionCode/versionName in $GRADLE" >&2
  grep -n 'versionCode\|versionName' "$GRADLE" >&2 || true
  exit 1
fi
