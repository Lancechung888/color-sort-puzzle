#!/usr/bin/env bash
# Idempotent MainActivity WebSettings zoom lock for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Native WebView pinch / built-in zoom breaks the fixed portrait tube board.
# Distinct from A11Y-ZOOM (browser/PWA viewport stays pinchable) and from
# ANDROID-WEBVIEW-TEXT-ZOOM (system Font/Display textZoom=100).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-zoom-lock] $*"; }

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

block = (
    "      webView.getSettings().setSupportZoom(false);\n"
    "      webView.getSettings().setBuiltInZoomControls(false);\n"
    "      webView.getSettings().setDisplayZoomControls(false);\n"
)

already = (
    re.search(r'webView\.getSettings\(\)\s*\.\s*setSupportZoom\s*\(\s*false\s*\)\s*;', raw)
    and re.search(
        r'webView\.getSettings\(\)\s*\.\s*setBuiltInZoomControls\s*\(\s*false\s*\)\s*;',
        raw,
    )
    and re.search(
        r'webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;',
        raw,
    )
)

if already:
    print(
        "[patch-android-webview-zoom-lock] supportZoom/builtIn/displayZoom "
        "already present — ok."
    )
else:
    # Prefer right after setBackgroundColor (#1a1a2e) — same onStart bridge block.
    pat_bg = re.compile(
        r'(webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;\n)',
        re.M,
    )
    m = pat_bg.search(raw)
    if m:
        raw = raw[: m.end()] + block + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-zoom-lock] Inserted zoom lock after "
            "setBackgroundColor."
        )
    else:
        pat_zoom = re.compile(
            r'(webView\.getSettings\(\)\s*\.\s*setTextZoom\s*\(\s*100\s*\)\s*;\n)',
            re.M,
        )
        m2 = pat_zoom.search(raw)
        if m2:
            raw = raw[: m2.end()] + block + raw[m2.end() :]
            changed = True
            print(
                "[patch-android-webview-zoom-lock] Inserted zoom lock after "
                "setTextZoom."
            )
        else:
            pat_over = re.compile(
                r'(webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;\n)',
                re.M,
            )
            m3 = pat_over.search(raw)
            if m3:
                raw = raw[: m3.end()] + block + raw[m3.end() :]
                changed = True
                print(
                    "[patch-android-webview-zoom-lock] Inserted zoom lock after "
                    "setOverScrollMode."
                )
            else:
                pat_null = re.compile(
                    r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n'
                    r'[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
                    re.M,
                )
                m4 = pat_null.search(raw)
                if m4:
                    raw = raw[: m4.end()] + block + raw[m4.end() :]
                    changed = True
                    print(
                        "[patch-android-webview-zoom-lock] Inserted zoom lock after "
                        "webView null-check."
                    )
                else:
                    pat_assign = re.compile(
                        r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M
                    )
                    m5 = pat_assign.search(raw)
                    if not m5:
                        sys.stderr.write(
                            "ERROR: could not find WebView webView = …getWebView() "
                            "in MainActivity\n"
                        )
                        sys.exit(1)
                    raw = raw[: m5.end()] + block + raw[m5.end() :]
                    changed = True
                    print(
                        "[patch-android-webview-zoom-lock] Inserted zoom lock after "
                        "getWebView() assignment."
                    )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setSupportZoom\s*\(\s*false\s*\)\s*;', check
), "setSupportZoom(false) missing after patch"
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setBuiltInZoomControls\s*\(\s*false\s*\)\s*;',
    check,
), "setBuiltInZoomControls(false) missing after patch"
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;',
    check,
), "setDisplayZoomControls(false) missing after patch"
print(
    "[patch-android-webview-zoom-lock] Assert ok — supportZoom/builtIn/display "
    "zoom lock present."
)
PY
