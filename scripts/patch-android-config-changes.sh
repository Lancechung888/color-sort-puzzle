#!/usr/bin/env bash
# Idempotent MainActivity android:configChanges expand for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Stock Capacitor omits density|fontScale|layoutDirection|colorMode — those recreate
# the WebView mid-run (display size / font / RTL / dark-light) and can drop in-memory
# pour state even when run-draft flush exists. Keep WebView alive across those.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-config-changes] $*"; }

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

REQUIRED = (
    "orientation",
    "keyboardHidden",
    "keyboard",
    "screenSize",
    "locale",
    "smallestScreenSize",
    "screenLayout",
    "uiMode",
    "density",
    "fontScale",
    "layoutDirection",
    "colorMode",
)
TARGET = "|".join(REQUIRED)

def main_activity_attrs(text):
    for m in re.finditer(r"<activity\b([\s\S]*?)>", text, re.I):
        attrs = m.group(1)
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
m = re.search(r'android:configChanges\s*=\s*["\']([^"\']*)["\']', attrs, re.I)
if m:
    current = [p for p in m.group(1).split("|") if p]
    have = {p.lower() for p in current}
    missing = [p for p in REQUIRED if p.lower() not in have]
    if not missing:
        print(
            "[patch-android-config-changes] MainActivity already has "
            "density|fontScale|layoutDirection|colorMode (+stock) — ok."
        )
        sys.exit(0)
    # Merge: keep order of REQUIRED as canonical list (superset of stock + extras).
    attrs2 = re.sub(
        r'android:configChanges\s*=\s*["\'][^"\']*["\']',
        f'android:configChanges="{TARGET}"',
        attrs,
        count=1,
        flags=re.I,
    )
else:
    # No configChanges at all — insert after android:name.
    attrs2 = re.sub(
        r'(android:name\s*=\s*["\'][^"\']*["\'])',
        rf'\1\n            android:configChanges="{TARGET}"',
        attrs,
        count=1,
        flags=re.I,
    )

new_raw = raw[:start] + attrs2 + raw[end:]
found2 = main_activity_attrs(new_raw)
assert found2 is not None
_, _, a2 = found2
m2 = re.search(r'android:configChanges\s*=\s*["\']([^"\']*)["\']', a2, re.I)
assert m2, "configChanges insert failed"
have2 = {p.lower() for p in m2.group(1).split("|") if p}
for p in REQUIRED:
    assert p.lower() in have2, f"missing {p} after patch"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    "[patch-android-config-changes] Patched MainActivity configChanges: "
    f"{TARGET}."
)
PY
