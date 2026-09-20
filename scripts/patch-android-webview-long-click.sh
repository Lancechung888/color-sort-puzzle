#!/usr/bin/env bash
# Idempotent MainActivity long-click guard for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Native WebView ActionMode / context menu (Copy / Share / Web Search) can still
# fire on HUD/labels despite CSS user-select:none — consume long-press once.
# Distinct from ANDROID-WEBVIEW-ZOOM-LOCK (gesture zoom) and TEXT-ZOOM.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-long-click] $*"; }

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

# Ensure View import (OVER_SCROLL already uses View; add if somehow missing).
if not re.search(r'import\s+android\.view\.View\s*;', raw):
    # Prefer after WindowManager or before WebView import.
    m_imp = re.search(r'(import\s+android\.view\.WindowManager\s*;\n)', raw)
    if m_imp:
        raw = raw[: m_imp.end()] + "import android.view.View;\n" + raw[m_imp.end() :]
        changed = True
        print("[patch-android-webview-long-click] Added import android.view.View.")
    else:
        m_web = re.search(r'(import\s+android\.webkit\.WebView\s*;\n)', raw)
        if m_web:
            raw = raw[: m_web.start()] + "import android.view.View;\n" + raw[m_web.start() :]
            changed = True
            print("[patch-android-webview-long-click] Added import android.view.View.")
        else:
            sys.stderr.write("ERROR: could not find place for import android.view.View\n")
            sys.exit(1)

block = (
    "      webView.setOnLongClickListener(v -> true); // consume long-press\n"
    "      webView.setLongClickable(false);\n"
)

already = re.search(
    r'webView\.setOnLongClickListener\s*\(\s*v\s*->\s*true\s*\)\s*;', raw
) and re.search(r'webView\.setLongClickable\s*\(\s*false\s*\)\s*;', raw)

if already:
    print(
        "[patch-android-webview-long-click] setOnLongClickListener/setLongClickable "
        "already present — ok."
    )
else:
    # Prefer right after zoom-lock block (setDisplayZoomControls).
    pat_zoom = re.compile(
        r'(webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;\n)',
        re.M,
    )
    m = pat_zoom.search(raw)
    if m:
        raw = raw[: m.end()] + block + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-long-click] Inserted long-click guard after "
            "setDisplayZoomControls."
        )
    else:
        pat_support = re.compile(
            r'(webView\.getSettings\(\)\s*\.\s*setSupportZoom\s*\(\s*false\s*\)\s*;\n'
            r'(?:[ \t]*webView\.getSettings\(\)\s*\.\s*setBuiltInZoomControls\s*\(\s*false\s*\)\s*;\n)?'
            r'(?:[ \t]*webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;\n)?)',
            re.M,
        )
        m_z = pat_support.search(raw)
        if m_z:
            raw = raw[: m_z.end()] + block + raw[m_z.end() :]
            changed = True
            print(
                "[patch-android-webview-long-click] Inserted long-click guard after "
                "zoom-lock lines."
            )
        else:
            pat_bg = re.compile(
                r'(webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;\n)',
                re.M,
            )
            m2 = pat_bg.search(raw)
            if m2:
                raw = raw[: m2.end()] + block + raw[m2.end() :]
                changed = True
                print(
                    "[patch-android-webview-long-click] Inserted long-click guard after "
                    "setBackgroundColor."
                )
            else:
                pat_text = re.compile(
                    r'(webView\.getSettings\(\)\s*\.\s*setTextZoom\s*\(\s*100\s*\)\s*;\n)',
                    re.M,
                )
                m3 = pat_text.search(raw)
                if m3:
                    raw = raw[: m3.end()] + block + raw[m3.end() :]
                    changed = True
                    print(
                        "[patch-android-webview-long-click] Inserted long-click guard after "
                        "setTextZoom."
                    )
                else:
                    pat_over = re.compile(
                        r'(webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;\n)',
                        re.M,
                    )
                    m4 = pat_over.search(raw)
                    if m4:
                        raw = raw[: m4.end()] + block + raw[m4.end() :]
                        changed = True
                        print(
                            "[patch-android-webview-long-click] Inserted long-click guard after "
                            "setOverScrollMode."
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
                                "[patch-android-webview-long-click] Inserted long-click guard after "
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
                                "[patch-android-webview-long-click] Inserted long-click guard after "
                                "getWebView() assignment."
                            )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'webView\.setOnLongClickListener\s*\(\s*v\s*->\s*true\s*\)\s*;', check
), "setOnLongClickListener(v -> true) missing after patch"
assert re.search(
    r'webView\.setLongClickable\s*\(\s*false\s*\)\s*;', check
), "setLongClickable(false) missing after patch"
assert re.search(
    r'import\s+android\.view\.View\s*;', check
), "import android.view.View missing after patch"
print(
    "[patch-android-webview-long-click] Assert ok — long-click guard present."
)
PY
