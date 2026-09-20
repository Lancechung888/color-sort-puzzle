#!/usr/bin/env bash
# Idempotent MainActivity resizeableActivity=false for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Portrait hybrid-casual tube layout breaks in multi-window / freeform; lock resize off.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-resize] $*"; }

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
        attrs = m.group(1)
        # .MainActivity or any android:name ending in MainActivity
        if re.search(
            r'android:name\s*=\s*["\'](?:\.MainActivity|[^"\']*MainActivity)["\']',
            attrs,
            re.I,
        ):
            return m.start(1), m.end(1), attrs
    return None

found = main_activity_attrs(raw)
if found is None:
    sys.stderr.write("ERROR: MainActivity activity not found in Manifest\n")
    sys.exit(1)

start, end, attrs = found
already = re.search(
    r'android:resizeableActivity\s*=\s*["\']false["\']',
    attrs,
    re.I,
)
if already:
    print(
        "[patch-android-resize] MainActivity already "
        'resizeableActivity="false" — ok.'
    )
    sys.exit(0)

# Drop any existing resizeableActivity (wrong value), then insert false.
attrs2 = re.sub(
    r'\s*android:resizeableActivity\s*=\s*["\'][^"\']*["\']',
    "",
    attrs,
    flags=re.I,
)

# Prefer insert after screenOrientation (portrait patch), else launchMode, else append.
if re.search(r'android:screenOrientation\s*=\s*["\'][^"\']*["\']', attrs2, re.I):
    attrs2 = re.sub(
        r'(android:screenOrientation\s*=\s*["\'][^"\']*["\'])',
        r'\1\n            android:resizeableActivity="false"',
        attrs2,
        count=1,
        flags=re.I,
    )
elif re.search(r'android:launchMode\s*=\s*["\'][^"\']*["\']', attrs2, re.I):
    attrs2 = re.sub(
        r'(android:launchMode\s*=\s*["\'][^"\']*["\'])',
        r'\1\n            android:resizeableActivity="false"',
        attrs2,
        count=1,
        flags=re.I,
    )
else:
    attrs2 = (
        attrs2.rstrip()
        + '\n            android:resizeableActivity="false"\n            '
    )

new_raw = raw[:start] + attrs2 + raw[end:]
check = main_activity_attrs(new_raw)
assert check is not None
assert re.search(
    r'android:resizeableActivity\s*=\s*["\']false["\']', check[2], re.I
), "insert failed"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    '[patch-android-resize] Inserted '
    'android:resizeableActivity="false" on MainActivity.'
)
PY
