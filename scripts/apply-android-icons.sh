#!/usr/bin/env bash
# Copy ColorTube Sort finals ICON A (+ splash) into local android/ after cap sync.
# Source of truth: native-templates/android/res/ (generated from store-assets/finals/colortube_icon_A_1024.png).
# Idempotent. No android/ → exit 0 (same pattern as patch-android-admob.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/native-templates/android/res"
DEST="$ROOT/android/app/src/main/res"

if [[ ! -d "$ROOT/android" ]]; then
  echo "[icons] no android/ yet — skip (run after npx cap add android)"
  exit 0
fi
if [[ ! -d "$SRC/mipmap-xxxhdpi" ]]; then
  echo "[icons] missing $SRC/mipmap-xxxhdpi — abort" >&2
  exit 1
fi

mkdir -p "$DEST"

# mipmaps + adaptive XML + launcher background color + splash drawables
for rel in \
  mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi \
  mipmap-anydpi-v26 \
  values \
  drawable \
  drawable-port-mdpi drawable-port-hdpi drawable-port-xhdpi drawable-port-xxhdpi drawable-port-xxxhdpi \
  drawable-land-mdpi drawable-land-hdpi drawable-land-xhdpi drawable-land-xxhdpi drawable-land-xxxhdpi
do
  if [[ -d "$SRC/$rel" ]]; then
    mkdir -p "$DEST/$rel"
    cp -f "$SRC/$rel/"* "$DEST/$rel/" 2>/dev/null || true
  fi
done

# values/ may contain only ic_launcher_background.xml — merge carefully if strings.xml exists
if [[ -f "$SRC/values/ic_launcher_background.xml" ]]; then
  cp -f "$SRC/values/ic_launcher_background.xml" "$DEST/values/ic_launcher_background.xml"
fi

# Drop stock Capacitor vector foreground so adaptive icon uses PNG mipmap foreground
if [[ -f "$DEST/../res/drawable-v24/ic_launcher_foreground.xml" ]]; then
  rm -f "$DEST/drawable-v24/ic_launcher_foreground.xml"
fi
# path fix: DEST is already .../res
if [[ -f "$ROOT/android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml" ]]; then
  rm -f "$ROOT/android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml"
fi

# Sanity: launcher must not stay tiny default (~9KB xxxhdpi)
SIZE="$(wc -c < "$DEST/mipmap-xxxhdpi/ic_launcher.png" | tr -d ' ')"
if [[ "$SIZE" -lt 20000 ]]; then
  echo "[icons] xxxhdpi ic_launcher.png still looks like stock ($SIZE bytes) — copy failed?" >&2
  exit 1
fi

echo "[icons] applied ColorTube ICON A + splash into android/app/src/main/res/ (xxxhdpi launcher ${SIZE} bytes)"
