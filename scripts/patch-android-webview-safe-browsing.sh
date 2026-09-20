#!/usr/bin/env bash
# Idempotent MainActivity Safe Browsing guard for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Stock WebView may leave setSafeBrowsingEnabled unset/off. ColorTube Sort is
# a single-WebView hybrid-casual game (Capacitor https://localhost); enable
# Android WebView Safe Browsing so phishing / known-bad URLs are blocked.
# API 26+ WebSettings method (minSdk 22 — fine on modern WebView). Does NOT
# disable JavaScript. Does NOT touch DomStorage / content access / cookies
# (AdMob later). Distinct from JS-WINDOWS-OFF / FILE-ACCESS-OFF / GEOLOCATION-OFF.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-safe-browsing] $*"; }

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

block = "      webView.getSettings().setSafeBrowsingEnabled(true);\n"

already = re.search(
    r'webView\.getSettings\(\)\s*\.\s*setSafeBrowsingEnabled\s*\(\s*true\s*\)\s*;',
    raw,
)

if already:
    print(
        "[patch-android-webview-safe-browsing] setSafeBrowsingEnabled(true) "
        "already present — ok."
    )
else:
    anchors = (
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setJavaScriptCanOpenWindowsAutomatically\s*\(\s*false\s*\)\s*;\n)', re.M), "js-windows-off can-open"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setSupportMultipleWindows\s*\(\s*false\s*\)\s*;\n)', re.M), "js-windows-off multi-window"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setAllowUniversalAccessFromFileURLs\s*\(\s*false\s*\)\s*;\n)', re.M), "file-access-off universal"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setAllowFileAccessFromFileURLs\s*\(\s*false\s*\)\s*;\n)', re.M), "file-access-off from-file-urls"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setAllowFileAccess\s*\(\s*false\s*\)\s*;\n)', re.M), "file-access-off"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setGeolocationEnabled\s*\(\s*false\s*\)\s*;\n)', re.M), "geolocation-off"),
        (re.compile(r'(webView\.getSettings\(\)\s*\.\s*setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)\s*;\n)', re.M), "mixed-content"),
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
                f"[patch-android-webview-safe-browsing] Inserted safe-browsing after {label}."
            )
            break
    else:
        sys.stderr.write("ERROR: could not find a WebView setup anchor in MainActivity\n")
        sys.exit(1)

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setSafeBrowsingEnabled\s*\(\s*true\s*\)\s*;',
    check,
), "setSafeBrowsingEnabled(true) missing after patch"
print(
    "[patch-android-webview-safe-browsing] Assert ok — safe-browsing present."
)
PY
