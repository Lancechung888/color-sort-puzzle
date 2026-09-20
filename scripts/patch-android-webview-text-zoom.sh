#!/usr/bin/env bash
# Idempotent MainActivity webView.getSettings().setTextZoom(100) for local android/
# (gitignored). Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Android system Font size / Display size still scales WebView text via WebSettings textZoom
# even when configChanges includes fontScale (that only prevents Activity recreate).
# Games lock textZoom=100 so tube board / HUD CSS stays correct.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-text-zoom] $*"; }

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

# --- setTextZoom(100) after WebView obtained ---
if re.search(
    r'webView\.getSettings\(\)\s*\.\s*setTextZoom\s*\(\s*100\s*\)\s*;', raw
):
    print(
        "[patch-android-webview-text-zoom] setTextZoom(100) already present — ok."
    )
else:
    line = "      webView.getSettings().setTextZoom(100);\n"
    # Prefer right after setOverScrollMode (same onStart bridge block).
    pat_over = re.compile(
        r'(webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;\n)',
        re.M,
    )
    m = pat_over.search(raw)
    if m:
        raw = raw[: m.end()] + line + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-text-zoom] Inserted setTextZoom(100) after "
            "setOverScrollMode."
        )
    else:
        # Prefer right after null-check on webView (ColorTubeNative / keep-awake path).
        pat_null = re.compile(
            r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n'
            r'[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
            re.M,
        )
        m2 = pat_null.search(raw)
        if m2:
            raw = raw[: m2.end()] + line + raw[m2.end() :]
            changed = True
            print(
                "[patch-android-webview-text-zoom] Inserted setTextZoom(100) after "
                "webView null-check."
            )
        else:
            # Fallback: after any getWebView() assignment.
            pat_assign = re.compile(
                r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M
            )
            m3 = pat_assign.search(raw)
            if not m3:
                sys.stderr.write(
                    "ERROR: could not find WebView webView = …getWebView() in MainActivity\n"
                )
                sys.exit(1)
            raw = raw[: m3.end()] + line + raw[m3.end() :]
            changed = True
            print(
                "[patch-android-webview-text-zoom] Inserted setTextZoom(100) after "
                "getWebView() assignment."
            )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.getSettings\(\)\s*\.\s*setTextZoom\s*\(\s*100\s*\)\s*;', check
), "setTextZoom(100) missing after patch"
print("[patch-android-webview-text-zoom] Assert ok — setTextZoom(100) present.")
PY
