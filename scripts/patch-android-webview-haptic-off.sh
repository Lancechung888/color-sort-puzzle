#!/usr/bin/env bash
# Idempotent MainActivity haptic-feedback guard for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# After LONG-CLICK, long-press can still trigger Android View system haptic
# (View.performHapticFeedback), which fights intentional Capacitor/vibrate mid-run.
# Distinct from ANDROID-WEBVIEW-LONG-CLICK (ActionMode menu) and from game
# haptic() / @capacitor/haptics (still on via JS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-haptic-off] $*"; }

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

block = "      webView.setHapticFeedbackEnabled(false);\n"

already = re.search(
    r'webView\.setHapticFeedbackEnabled\s*\(\s*false\s*\)\s*;', raw
)

if already:
    print(
        "[patch-android-webview-haptic-off] setHapticFeedbackEnabled(false) "
        "already present — ok."
    )
else:
    # Prefer right after long-click block (setLongClickable(false)).
    pat_long = re.compile(
        r'(webView\.setLongClickable\s*\(\s*false\s*\)\s*;\n)',
        re.M,
    )
    m = pat_long.search(raw)
    if m:
        raw = raw[: m.end()] + block + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-haptic-off] Inserted haptic-off after "
            "setLongClickable."
        )
    else:
        pat_listener = re.compile(
            r'(webView\.setOnLongClickListener\s*\(\s*v\s*->\s*true\s*\)\s*;'
            r'[^\n]*\n'
            r'(?:[ \t]*webView\.setLongClickable\s*\(\s*false\s*\)\s*;\n)?)',
            re.M,
        )
        m2 = pat_listener.search(raw)
        if m2:
            raw = raw[: m2.end()] + block + raw[m2.end() :]
            changed = True
            print(
                "[patch-android-webview-haptic-off] Inserted haptic-off after "
                "long-click listener."
            )
        else:
            pat_zoom = re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            )
            m3 = pat_zoom.search(raw)
            if m3:
                raw = raw[: m3.end()] + block + raw[m3.end() :]
                changed = True
                print(
                    "[patch-android-webview-haptic-off] Inserted haptic-off after "
                    "setDisplayZoomControls."
                )
            else:
                pat_bg = re.compile(
                    r'(webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;\n)',
                    re.M,
                )
                m4 = pat_bg.search(raw)
                if m4:
                    raw = raw[: m4.end()] + block + raw[m4.end() :]
                    changed = True
                    print(
                        "[patch-android-webview-haptic-off] Inserted haptic-off after "
                        "setBackgroundColor."
                    )
                else:
                    pat_null = re.compile(
                        r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n'
                        r'[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
                        re.M,
                    )
                    m5 = pat_null.search(raw)
                    if m5:
                        raw = raw[: m5.end()] + block + raw[m5.end() :]
                        changed = True
                        print(
                            "[patch-android-webview-haptic-off] Inserted haptic-off after "
                            "webView null-check."
                        )
                    else:
                        pat_assign = re.compile(
                            r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)',
                            re.M,
                        )
                        m6 = pat_assign.search(raw)
                        if not m6:
                            sys.stderr.write(
                                "ERROR: could not find WebView webView = …getWebView() "
                                "in MainActivity\n"
                            )
                            sys.exit(1)
                        raw = raw[: m6.end()] + block + raw[m6.end() :]
                        changed = True
                        print(
                            "[patch-android-webview-haptic-off] Inserted haptic-off after "
                            "getWebView() assignment."
                        )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.setHapticFeedbackEnabled\s*\(\s*false\s*\)\s*;', check
), "setHapticFeedbackEnabled(false) missing after patch"
print(
    "[patch-android-webview-haptic-off] Assert ok — haptic-off present."
)
PY
