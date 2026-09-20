#!/usr/bin/env bash
# Idempotent android:windowLayoutInDisplayCutoutMode=shortEdges on AppTheme*
# for local android/ (gitignored). Safe no-op if android/ missing or already patched.
# Stock Capacitor themes omit cutout mode → letterboxing / zero env(safe-area-inset-*)
# on notched phones; shortEdges lets WebView draw into the cutout so SAFE-AREA CSS works.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
STYLES_XML="$ANDROID_DIR/app/src/main/res/values/styles.xml"

log() { echo "[patch-android-cutout] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$STYLES_XML" ]]; then
  log "ERROR: styles.xml missing at $STYLES_XML" >&2
  exit 1
fi

python3 - "$STYLES_XML" <<'PY'
import re
import sys

styles_path = sys.argv[1]

STYLE_NAMES = ("AppTheme", "AppTheme.NoActionBar", "AppTheme.NoActionBarLaunch")
ITEM = '<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>'

styles = open(styles_path, encoding="utf-8").read()
styles_changed = False

def style_block_span(name: str):
    return re.search(
        rf'(<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>)([\s\S]*?)(</style>)',
        styles,
        re.I,
    )

def block_has_short_edges(inner: str) -> bool:
    return bool(
        re.search(
            r'<item\s+name\s*=\s*["\']android:windowLayoutInDisplayCutoutMode["\']\s*>\s*shortEdges\s*</item>',
            inner,
            re.I,
        )
    )

def ensure_item(inner: str) -> str:
    pat = r'<item\s+name\s*=\s*["\']android:windowLayoutInDisplayCutoutMode["\']\s*>\s*[^<]*\s*</item>'
    if re.search(pat, inner, re.I):
        return re.sub(pat, ITEM, inner, count=1, flags=re.I)
    return "\n        " + ITEM + ("\n" if not inner.startswith("\n") else "") + inner

missing = []
for name in STYLE_NAMES:
    m = style_block_span(name)
    if not m:
        missing.append(name)
        continue
    inner = m.group(2)
    if block_has_short_edges(inner):
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
    styles2 = open(styles_path, encoding="utf-8").read()
    for name in STYLE_NAMES:
        m = re.search(
            rf'<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>([\s\S]*?)</style>',
            styles2,
            re.I,
        )
        assert m and block_has_short_edges(m.group(1)), f"{name} cutout mode failed"
    print(
        "[patch-android-cutout] Patched styles.xml: "
        "android:windowLayoutInDisplayCutoutMode=shortEdges on "
        "AppTheme / NoActionBar / NoActionBarLaunch."
    )
else:
    print(
        "[patch-android-cutout] styles.xml already shortEdges "
        "on AppTheme* — ok."
    )
PY
