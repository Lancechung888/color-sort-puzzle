#!/usr/bin/env bash
# Idempotent android:isGame=true + android:appCategory=game on <application>
# for local android/ (gitignored). Safe no-op if android/ missing or already patched.
# Hybrid-casual: tell the OS / Game Dashboard this is a game (not a generic app).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

log() { echo "[patch-android-is-game] $*"; }

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

app_m = re.search(r"<application\b([\s\S]*?)>", raw, re.I)
if not app_m:
    sys.stderr.write("ERROR: <application> not found in Manifest\n")
    sys.exit(1)

attrs = app_m.group(1)
start, end = app_m.start(1), app_m.end(1)

def has_attr(name: str, value: str) -> bool:
    return bool(
        re.search(rf'android:{name}\s*=\s*["\']{re.escape(value)}["\']', attrs, re.I)
    )

def set_attr(text: str, name: str, value: str) -> str:
    pat = rf'\s*android:{name}\s*=\s*["\'][^"\']*["\']'
    if re.search(pat, text, re.I):
        return re.sub(pat, f'\n        android:{name}="{value}"', text, count=1, flags=re.I)
    return text.rstrip() + f'\n        android:{name}="{value}"\n        '

need = []
if not has_attr("isGame", "true"):
    need.append("isGame")
if not has_attr("appCategory", "game"):
    need.append("appCategory")

if not need:
    print(
        '[patch-android-is-game] Manifest already isGame="true" + '
        'appCategory="game" — ok.'
    )
    sys.exit(0)

attrs2 = attrs
attrs2 = set_attr(attrs2, "isGame", "true")
attrs2 = set_attr(attrs2, "appCategory", "game")

new_raw = raw[:start] + attrs2 + raw[end:]
app2 = re.search(r"<application\b([\s\S]*?)>", new_raw, re.I)
assert app2 is not None
a2 = app2.group(1)
assert re.search(r'android:isGame\s*=\s*["\']true["\']', a2, re.I), "isGame insert failed"
assert re.search(
    r'android:appCategory\s*=\s*["\']game["\']', a2, re.I
), "appCategory insert failed"
open(path, "w", encoding="utf-8").write(new_raw)
print(
    '[patch-android-is-game] Patched <application>: isGame="true", '
    'appCategory="game".'
)
PY
