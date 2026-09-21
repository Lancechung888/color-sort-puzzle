#!/usr/bin/env bash
# Idempotent Android versionCode / versionName bump for local android/ (gitignored).
# Play internal testing rejects AABs whose versionCode was already used (prior upload
# shipped versionCode 1). Cap sync / fresh `cap add android` resets Capacitor defaults
# (versionCode 1, versionName "1.0") — re-apply after every sync.
# Does NOT touch AdMob test IDs / USE_TEST_ADS. Does NOT claim #7 Pass.
# ANDROID-VERSION-CODE-2
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_GRADLE="$ROOT/android/app/build.gradle"
VERSION_CODE=2
VERSION_NAME="1.0.1"

log() { echo "[patch-android-version-code] $*"; }

if [[ ! -f "$APP_GRADLE" ]]; then
  log "android/app/build.gradle not found — skip (run npx cap add android first)."
  exit 0
fi

python3 - "$APP_GRADLE" "$VERSION_CODE" "$VERSION_NAME" <<'PY'
import re
import sys

path, want_code, want_name = sys.argv[1], sys.argv[2], sys.argv[3]
raw = open(path, encoding="utf-8").read()
orig = raw
changed = []

code_pat = r"(versionCode\s+)\d+"
name_pat = r'(versionName\s+")([^"]*)(")'

m_code = re.search(code_pat, raw)
if not m_code:
    sys.stderr.write("ERROR: versionCode not found in android/app/build.gradle\n")
    sys.exit(1)
if m_code.group(0) != f"versionCode {want_code}":
    raw = re.sub(code_pat, rf"\g<1>{want_code}", raw, count=1)
    changed.append(f"versionCode → {want_code}")

m_name = re.search(name_pat, raw)
if not m_name:
    sys.stderr.write("ERROR: versionName not found in android/app/build.gradle\n")
    sys.exit(1)
if m_name.group(2) != want_name:
    raw = re.sub(name_pat, rf'\g<1>{want_name}\g<3>', raw, count=1)
    changed.append(f'versionName → "{want_name}"')

if raw != orig:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(rf"versionCode\s+{re.escape(want_code)}\b", check), "versionCode patch failed"
assert re.search(rf'versionName\s+"{re.escape(want_name)}"', check), "versionName patch failed"

if changed:
    print("[patch-android-version-code] Patched android/app/build.gradle: " + ", ".join(changed) + ".")
else:
    print(
        f'[patch-android-version-code] android/app/build.gradle already '
        f'versionCode={want_code} versionName="{want_name}" — ok.'
    )
PY

log "Done. versionCode=${VERSION_CODE} versionName=\"${VERSION_NAME}\"."
