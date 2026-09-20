#!/usr/bin/env bash
# Idempotent compileSdkVersion/targetSdkVersion=36 + enableOnBackInvokedCallback
# for local android/ (gitignored). Safe no-op if android/ missing or already patched.
# Play (as of 2026-08-31) requires new apps/updates target API 36.
# enableOnBackInvokedCallback pairs with CAP-APP-BACK predictive back.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
VARS_GRADLE="$ANDROID_DIR/variables.gradle"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-target-sdk] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$VARS_GRADLE" ]]; then
  log "ERROR: variables.gradle missing at $VARS_GRADLE" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

# --- variables.gradle: compileSdkVersion + targetSdkVersion = 36 (leave minSdk) ---
python3 - "$VARS_GRADLE" <<'PY'
import re
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()
changed = False

def set_sdk(text: str, name: str, value: int) -> tuple[str, bool]:
    pat = rf'({re.escape(name)}\s*=\s*)(\d+)'
    m = re.search(pat, text)
    if not m:
        sys.stderr.write(f"ERROR: {name} not found in variables.gradle\n")
        sys.exit(1)
    if m.group(2) == str(value):
        return text, False
    return re.sub(pat, rf'\g<1>{value}', text, count=1), True

raw2, c1 = set_sdk(raw, "compileSdkVersion", 36)
raw2, c2 = set_sdk(raw2, "targetSdkVersion", 36)
changed = c1 or c2

if changed:
    open(path, "w", encoding="utf-8").write(raw2)
    check = open(path, encoding="utf-8").read()
    assert re.search(r'compileSdkVersion\s*=\s*36\b', check), "compileSdk patch failed"
    assert re.search(r'targetSdkVersion\s*=\s*36\b', check), "targetSdk patch failed"
    print(
        "[patch-android-target-sdk] Patched variables.gradle: "
        "compileSdkVersion=36, targetSdkVersion=36."
    )
else:
    print(
        "[patch-android-target-sdk] variables.gradle already "
        "compile/target=36 — ok."
    )
PY

# --- AndroidManifest.xml: enableOnBackInvokedCallback=true on <application> ---
python3 - "$MANIFEST" <<'PY'
import re
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()

app_m = re.search(r"<application\b([\s\S]*?)>", raw, re.I)
if not app_m:
    sys.stderr.write("ERROR: <application> not found in Manifest\n")
    sys.exit(1)

attrs = app_m.group(1)
start, end = app_m.start(1), app_m.end(1)

if re.search(
    r'android:enableOnBackInvokedCallback\s*=\s*["\']true["\']', attrs, re.I
):
    print(
        '[patch-android-target-sdk] Manifest already '
        'enableOnBackInvokedCallback="true" — ok.'
    )
    sys.exit(0)

pat = r'\s*android:enableOnBackInvokedCallback\s*=\s*["\'][^"\']*["\']'
if re.search(pat, attrs, re.I):
    attrs2 = re.sub(
        pat,
        '\n        android:enableOnBackInvokedCallback="true"',
        attrs,
        count=1,
        flags=re.I,
    )
else:
    attrs2 = (
        attrs.rstrip()
        + '\n        android:enableOnBackInvokedCallback="true"\n        '
    )

new_raw = raw[:start] + attrs2 + raw[end:]
app2 = re.search(r"<application\b([\s\S]*?)>", new_raw, re.I)
assert app2 is not None
assert re.search(
    r'android:enableOnBackInvokedCallback\s*=\s*["\']true["\']',
    app2.group(1),
    re.I,
), "enableOnBackInvokedCallback insert failed"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    '[patch-android-target-sdk] Patched <application>: '
    'enableOnBackInvokedCallback="true".'
)
PY
