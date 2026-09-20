#!/usr/bin/env bash
# Idempotent MainActivity webView.setBackgroundColor(#1a1a2e) for local android/
# (gitignored). Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Cold start / splash handoff can flash white before first paint; lock WebView bg to brand.
# Capacitor config backgroundColor alone is insufficient on some devices — MainActivity is SoT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-bg] $*"; }

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

# --- import android.graphics.Color ---
if re.search(r'^\s*import\s+android\.graphics\.Color\s*;', raw, re.M):
    print("[patch-android-webview-bg] import android.graphics.Color already present — ok.")
else:
    m = list(re.finditer(r'(?m)^import\s+android\.[^;]+;\s*$', raw))
    if m:
        insert_at = m[-1].end()
        raw = raw[:insert_at] + "\nimport android.graphics.Color;" + raw[insert_at:]
    else:
        pkg = re.search(r'(?m)^package\s+[^;]+;\s*$', raw)
        if not pkg:
            sys.stderr.write("ERROR: package declaration not found\n")
            sys.exit(1)
        raw = raw[: pkg.end()] + "\n\nimport android.graphics.Color;" + raw[pkg.end() :]
    changed = True
    print("[patch-android-webview-bg] Added import android.graphics.Color.")

# --- setBackgroundColor(#1a1a2e) after WebView obtained ---
if re.search(
    r'webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;',
    raw,
):
    print(
        "[patch-android-webview-bg] setBackgroundColor(#1a1a2e) already present — ok."
    )
else:
    line = '      webView.setBackgroundColor(Color.parseColor("#1a1a2e"));\n'
    # Prefer right after setTextZoom(100) (same onStart bridge block).
    pat_zoom = re.compile(
        r'(webView\.getSettings\(\)\s*\.\s*setTextZoom\s*\(\s*100\s*\)\s*;\n)',
        re.M,
    )
    m = pat_zoom.search(raw)
    if m:
        raw = raw[: m.end()] + line + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-bg] Inserted setBackgroundColor after setTextZoom."
        )
    else:
        # Prefer right after setOverScrollMode.
        pat_over = re.compile(
            r'(webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;\n)',
            re.M,
        )
        m2 = pat_over.search(raw)
        if m2:
            raw = raw[: m2.end()] + line + raw[m2.end() :]
            changed = True
            print(
                "[patch-android-webview-bg] Inserted setBackgroundColor after "
                "setOverScrollMode."
            )
        else:
            # Prefer right after null-check on webView.
            pat_null = re.compile(
                r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n'
                r'[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
                re.M,
            )
            m3 = pat_null.search(raw)
            if m3:
                raw = raw[: m3.end()] + line + raw[m3.end() :]
                changed = True
                print(
                    "[patch-android-webview-bg] Inserted setBackgroundColor after "
                    "webView null-check."
                )
            else:
                # Fallback: after any getWebView() assignment.
                pat_assign = re.compile(
                    r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M
                )
                m4 = pat_assign.search(raw)
                if not m4:
                    sys.stderr.write(
                        "ERROR: could not find WebView webView = …getWebView() in MainActivity\n"
                    )
                    sys.exit(1)
                raw = raw[: m4.end()] + line + raw[m4.end() :]
                changed = True
                print(
                    "[patch-android-webview-bg] Inserted setBackgroundColor after "
                    "getWebView() assignment."
                )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(r'^\s*import\s+android\.graphics\.Color\s*;', check, re.M), (
    "import android.graphics.Color missing after patch"
)
assert re.search(
    r'webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;',
    check,
), "setBackgroundColor(#1a1a2e) missing after patch"
print("[patch-android-webview-bg] Assert ok — setBackgroundColor(#1a1a2e) present.")
PY
