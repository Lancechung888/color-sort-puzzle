#!/usr/bin/env bash
# Idempotent MainActivity portrait lock for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Hybrid-casual tube play must not rotate into a broken landscape layout.
# Web already declares orientation: portrait-primary in site.webmanifest.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-portrait] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

python3 - "$MANIFEST" <<'PY'
import re
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()

def main_activity_attrs(text):
    for m in re.finditer(r"<activity\b([\s\S]*?)>", text, re.I):
        if re.search(r'android:name\s*=\s*["\']\.MainActivity["\']', m.group(1)):
            return m.start(1), m.end(1), m.group(1)
    return None

found = main_activity_attrs(raw)
if found is None:
    sys.stderr.write("ERROR: .MainActivity not found in Manifest\n")
    sys.exit(1)

start, end, attrs = found
orient = re.search(
    r'android:screenOrientation\s*=\s*["\'](portrait|sensorPortrait|userPortrait)["\']',
    attrs,
)
if orient:
    print(
        f"[patch-android-portrait] MainActivity already "
        f"screenOrientation={orient.group(1)} — ok."
    )
    sys.exit(0)

attrs2 = re.sub(r'\s*android:screenOrientation\s*=\s*["\'][^"\']*["\']', "", attrs)
if re.search(r'android:launchMode\s*=\s*["\'][^"\']*["\']', attrs2):
    attrs2 = re.sub(
        r'(android:launchMode\s*=\s*["\'][^"\']*["\'])',
        r'\1\n            android:screenOrientation="portrait"',
        attrs2,
        count=1,
    )
else:
    attrs2 = (
        attrs2.rstrip()
        + '\n            android:screenOrientation="portrait"\n            '
    )

new_raw = raw[:start] + attrs2 + raw[end:]
check = main_activity_attrs(new_raw)
assert check is not None
assert re.search(
    r'android:screenOrientation\s*=\s*["\']portrait["\']', check[2]
), "insert failed"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    '[patch-android-portrait] Inserted '
    'android:screenOrientation="portrait" on .MainActivity.'
)
PY
