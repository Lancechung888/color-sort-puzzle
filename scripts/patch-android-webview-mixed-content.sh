#!/usr/bin/env bash
# Idempotent MainActivity mixed-content guard for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Default WebView may allow MIXED_CONTENT_COMPATIBILITY_MODE / always_allow,
# which can load cleartext HTTP subresources from an HTTPS Capacitor origin.
# Distinct from ANDROID-CLEARTEXT (Manifest usesCleartextTraffic=false +
# networkSecurityConfig) — this is the WebSettings API gate on the bridge WebView.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-mixed-content] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MAIN_JAVA" ]]; then
  log "ERROR: MainActivity.java missing at $MAIN_JAVA" >&2
  exit 1
fi

python3 - "$MAIN_JAVA" <<'PY'
import re
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()
changed = False

# Ensure WebSettings import (needed for MIXED_CONTENT_NEVER_ALLOW constant).
if not re.search(r'import\s+android\.webkit\.WebSettings\s*;', raw):
    m = re.search(r'(import\s+android\.webkit\.WebView\s*;\n)', raw)
    if m:
        raw = raw[: m.end()] + "import android.webkit.WebSettings;\n" + raw[m.end() :]
        changed = True
        print("[patch-android-webview-mixed-content] Added import android.webkit.WebSettings.")
    else:
        # Fallback: after any android.webkit import
        m2 = re.search(r'(import\s+android\.webkit\.[^;]+;\n)', raw)
        if m2:
            raw = raw[: m2.end()] + "import android.webkit.WebSettings;\n" + raw[m2.end() :]
            changed = True
            print("[patch-android-webview-mixed-content] Added import android.webkit.WebSettings (fallback).")
        else:
            sys.stderr.write("ERROR: could not find android.webkit import anchor\n")
            sys.exit(1)

block = "      webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);\n"

already = re.search(
    r'webView\.getSettings\(\)\s*\.\s*setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)\s*;',
    raw,
)

if already:
    print(
        "[patch-android-webview-mixed-content] setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW) "
        "already present — ok."
    )
else:
    anchors = (
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setMediaPlaybackRequiresUserGesture\s*\(\s*false\s*\)\s*;\n)', re.M), "media-gesture"),
        (re.compile(r'(webView\.setSoundEffectsEnabled\s*\(\s*false\s*\)\s*;\n)', re.M), "sound-effects-off"),
        (re.compile(r'(webView\.setHorizontalScrollBarEnabled\s*\(\s*false\s*\)\s*;\n)', re.M), "scrollbars"),
        (re.compile(r'(webView\.setVerticalScrollBarEnabled\s*\(\s*false\s*\)\s*;\n)', re.M), "vertical-scrollbar"),
        (re.compile(r'(webView\.setHapticFeedbackEnabled\s*\(\s*false\s*\)\s*;\n)', re.M), "haptic-off"),
        (re.compile(r'(webView\.setLongClickable\s*\(\s*false\s*\)\s*;\n)', re.M), "long-click"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;\n)', re.M), "zoom"),
        (re.compile(r'(webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;\n)', re.M), "background"),
        (re.compile(r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)', re.M), "webView null-check"),
        (re.compile(r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M), "getWebView assignment"),
    )
    for pattern, label in anchors:
        match = pattern.search(raw)
        if match:
            raw = raw[: match.end()] + block + raw[match.end() :]
            changed = True
            print(
                f"[patch-android-webview-mixed-content] Inserted mixed-content after {label}."
            )
            break
    else:
        sys.stderr.write("ERROR: could not find a WebView setup anchor in MainActivity\n")
        sys.exit(1)

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)\s*;',
    check,
), "setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW) missing after patch"
assert re.search(
    r'import\s+android\.webkit\.WebSettings\s*;',
    check,
), "import android.webkit.WebSettings missing after patch"
print(
    "[patch-android-webview-mixed-content] Assert ok — mixed-content present."
)
PY
