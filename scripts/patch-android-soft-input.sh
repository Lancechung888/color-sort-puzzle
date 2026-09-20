#!/usr/bin/env bash
# Idempotent MainActivity windowSoftInputMode=adjustNothing for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Keep the portrait hybrid-casual tube WebView from resizing when the soft keyboard opens.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-soft-input] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

python3 - "$MANIFEST" <<'PY2'
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
    r'android:windowSoftInputMode\s*=\s*["\']adjustNothing["\']',
    attrs,
    re.I,
)
if already:
    print(
        "[patch-android-soft-input] MainActivity already "
        'windowSoftInputMode="adjustNothing" — ok.'
    )
    sys.exit(0)

# Drop any existing windowSoftInputMode (wrong value), then insert adjustNothing.
attrs2 = re.sub(
    r'\s*android:windowSoftInputMode\s*=\s*["\'][^"\']*["\']',
    "",
    attrs,
    flags=re.I,
)

# Prefer insert after resizeableActivity, then screenOrientation, then launchMode, else append.
inserted = False
for attr_name in ("resizeableActivity", "screenOrientation", "launchMode"):
    pattern = rf'(android:{attr_name}\s*=\s*["\'][^"\']*["\'])'
    if re.search(pattern, attrs2, re.I):
        attrs2 = re.sub(
            pattern,
            r'\1\n            android:windowSoftInputMode="adjustNothing"',
            attrs2,
            count=1,
            flags=re.I,
        )
        inserted = True
        break
if not inserted:
    attrs2 = (
        attrs2.rstrip()
        + '\n            android:windowSoftInputMode="adjustNothing"\n            '
    )

new_raw = raw[:start] + attrs2 + raw[end:]
check = main_activity_attrs(new_raw)
assert check is not None
assert re.search(
    r'android:windowSoftInputMode\s*=\s*["\']adjustNothing["\']', check[2], re.I
), "insert failed"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    '[patch-android-soft-input] Inserted '
    'android:windowSoftInputMode="adjustNothing" on MainActivity.'
)
PY2
