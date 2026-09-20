#!/usr/bin/env bash
# Idempotent android:forceDarkAllowed=false on <application> + theme items
# for local android/ (gitignored). Safe no-op if android/ missing or already patched.
# Hybrid-casual brand-dark UI (#1a1a2e tubes/juice/HUD) must not be rewritten by
# Android 10+ Force Dark on DayNight / some OEM skins.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
STYLES_XML="$ANDROID_DIR/app/src/main/res/values/styles.xml"

log() { echo "[patch-android-force-dark] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

if [[ ! -f "$STYLES_XML" ]]; then
  log "ERROR: styles.xml missing at $STYLES_XML" >&2
  exit 1
fi

python3 - "$MANIFEST" "$STYLES_XML" <<'PY'
import re
import sys

manifest_path, styles_path = sys.argv[1], sys.argv[2]

# --- Manifest <application> android:forceDarkAllowed="false" ---
raw = open(manifest_path, encoding="utf-8").read()
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

manifest_changed = False
if not has_attr("forceDarkAllowed", "false"):
    attrs2 = set_attr(attrs, "forceDarkAllowed", "false")
    raw = raw[:start] + attrs2 + raw[end:]
    app2 = re.search(r"<application\b([\s\S]*?)>", raw, re.I)
    assert app2 is not None
    assert re.search(
        r'android:forceDarkAllowed\s*=\s*["\']false["\']', app2.group(1), re.I
    ), "forceDarkAllowed insert failed"
    open(manifest_path, "w", encoding="utf-8").write(raw)
    manifest_changed = True
    print(
        '[patch-android-force-dark] Patched <application>: '
        'forceDarkAllowed="false".'
    )
else:
    print(
        '[patch-android-force-dark] Manifest already '
        'forceDarkAllowed="false" — ok.'
    )

# --- styles.xml: forceDarkAllowed=false on AppTheme* ---
STYLE_NAMES = ("AppTheme", "AppTheme.NoActionBar", "AppTheme.NoActionBarLaunch")
ITEM = '<item name="android:forceDarkAllowed">false</item>'

styles = open(styles_path, encoding="utf-8").read()
styles_changed = False

def style_block_span(name: str):
    m = re.search(
        rf'(<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>)([\s\S]*?)(</style>)',
        styles,
        re.I,
    )
    return m

def block_has_force_dark(inner: str) -> bool:
    return bool(
        re.search(
            r'<item\s+name\s*=\s*["\']android:forceDarkAllowed["\']\s*>\s*false\s*</item>',
            inner,
            re.I,
        )
    )

def ensure_item(inner: str) -> str:
    # Replace wrong value if present; else insert before </style> content end.
    pat = r'<item\s+name\s*=\s*["\']android:forceDarkAllowed["\']\s*>\s*[^<]*\s*</item>'
    if re.search(pat, inner, re.I):
        return re.sub(pat, ITEM, inner, count=1, flags=re.I)
    # Insert after opening, before first child or at end of inner
    return "\n        " + ITEM + ("\n" if not inner.startswith("\n") else "") + inner

missing = []
for name in STYLE_NAMES:
    m = style_block_span(name)
    if not m:
        missing.append(name)
        continue
    inner = m.group(2)
    if block_has_force_dark(inner):
        continue
    new_inner = ensure_item(inner)
    styles = styles[: m.start(2)] + new_inner + styles[m.end(2) :]
    styles_changed = True

if missing:
    sys.stderr.write(
        "ERROR: styles.xml missing style(s): " + ", ".join(missing) + "\n"
    )
    sys.exit(1)

if styles_changed:
    open(styles_path, "w", encoding="utf-8").write(styles)
    # Verify
    styles2 = open(styles_path, encoding="utf-8").read()
    for name in STYLE_NAMES:
        m = re.search(
            rf'<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>([\s\S]*?)</style>',
            styles2,
            re.I,
        )
        assert m and block_has_force_dark(m.group(1)), f"{name} forceDarkAllowed failed"
    print(
        "[patch-android-force-dark] Patched styles.xml: "
        "android:forceDarkAllowed=false on AppTheme / NoActionBar / NoActionBarLaunch."
    )
else:
    print(
        "[patch-android-force-dark] styles.xml already forceDarkAllowed=false "
        "on AppTheme* — ok."
    )

if not manifest_changed and not styles_changed:
    print("[patch-android-force-dark] Nothing to change — already patched.")
PY
