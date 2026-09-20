#!/usr/bin/env bash
# Idempotent MainActivity webView.setOverScrollMode(OVER_SCROLL_NEVER) for local android/
# (gitignored). Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Pairs with CSS overscroll-behavior:none — native glow/rubber-band can still kill mid-run play.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-overscroll] $*"; }

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

# --- import android.view.View ---
if re.search(r'^\s*import\s+android\.view\.View\s*;', raw, re.M):
    print("[patch-android-webview-overscroll] import android.view.View already present — ok.")
else:
    # Insert after last android.* import if any, else after package.
    m = list(re.finditer(r'(?m)^import\s+android\.[^;]+;\s*$', raw))
    if m:
        insert_at = m[-1].end()
        raw = raw[:insert_at] + "\nimport android.view.View;" + raw[insert_at:]
    else:
        pkg = re.search(r'(?m)^package\s+[^;]+;\s*$', raw)
        if not pkg:
            sys.stderr.write("ERROR: package declaration not found\n")
            sys.exit(1)
        raw = raw[: pkg.end()] + "\n\nimport android.view.View;" + raw[pkg.end() :]
    changed = True
    print("[patch-android-webview-overscroll] Added import android.view.View.")

# --- setOverScrollMode(OVER_SCROLL_NEVER) after WebView obtained ---
if re.search(
    r'webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;', raw
):
    print(
        "[patch-android-webview-overscroll] setOverScrollMode(OVER_SCROLL_NEVER) "
        "already present — ok."
    )
else:
    # Prefer right after null-check on webView (ColorTubeNative / keep-awake path).
    pat_null = re.compile(
        r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n'
        r'[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
        re.M,
    )
    m = pat_null.search(raw)
    line = "      webView.setOverScrollMode(View.OVER_SCROLL_NEVER);\n"
    if m:
        raw = raw[: m.end()] + line + raw[m.end() :]
        changed = True
        print(
            "[patch-android-webview-overscroll] Inserted setOverScrollMode after "
            "webView null-check."
        )
    else:
        # Fallback: after any getWebView() assignment.
        pat_assign = re.compile(
            r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M
        )
        m2 = pat_assign.search(raw)
        if not m2:
            sys.stderr.write(
                "ERROR: could not find WebView webView = …getWebView() in MainActivity\n"
            )
            sys.exit(1)
        raw = raw[: m2.end()] + line + raw[m2.end() :]
        changed = True
        print(
            "[patch-android-webview-overscroll] Inserted setOverScrollMode after "
            "getWebView() assignment."
        )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(r'^\s*import\s+android\.view\.View\s*;', check, re.M), (
    "import android.view.View missing after patch"
)
assert re.search(
    r'webView\.setOverScrollMode\s*\(\s*View\.OVER_SCROLL_NEVER\s*\)\s*;', check
), "setOverScrollMode(OVER_SCROLL_NEVER) missing after patch"
print("[patch-android-webview-overscroll] Assert ok — OVER_SCROLL_NEVER present.")
PY
