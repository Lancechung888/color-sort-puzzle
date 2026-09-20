#!/usr/bin/env bash
# Idempotent MainActivity WebView remote-debug deny for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Deny Chrome remote WebView debugging (chrome://inspect) on production devices.
# Static call on android.webkit.WebView class — always false for predictable
# hybrid-casual ship path (simpler than BuildConfig.DEBUG gating).
# Distinct from ANDROID-WEBVIEW-SAFE-BROWSING (phishing URL block) and
# ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF (API 33+ darkening).
# Does NOT disable JavaScript. Does NOT touch DomStorage / cookies /
# setAllowContentAccess / AdMob.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-debug-off] $*"; }

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
    "      // ANDROID-WEBVIEW-DEBUG-OFF: deny Chrome remote WebView debugging.\n"
    "      WebView.setWebContentsDebuggingEnabled(false);\n"
)

already = re.search(
    r'WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)\s*;',
    raw,
)

if already:
    print(
        "[patch-android-webview-debug-off] "
        "setWebContentsDebuggingEnabled(false) already present — ok."
    )
else:
    # Prefer after algorithmic-dark TIRAMISU if-block, then cascading older anchors.
    anchors = (
        (
            re.compile(
                r'(if\s*\(\s*Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.TIRAMISU\s*\)\s*\{\n'
                r'[ \t]*webView\.getSettings\(\)\s*\.\s*setAlgorithmicDarkeningAllowed\s*\(\s*false\s*\)\s*;\n'
                r'[ \t]*\}\n)',
                re.M,
            ),
            "algorithmic-dark TIRAMISU block",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setAlgorithmicDarkeningAllowed\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "algorithmic-dark line",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setDatabaseEnabled\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "database-off",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setSafeBrowsingEnabled\s*\(\s*true\s*\)\s*;\n)',
                re.M,
            ),
            "safe-browsing",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setJavaScriptCanOpenWindowsAutomatically\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "js-windows-off can-open",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setSupportMultipleWindows\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "js-windows-off multi-window",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setAllowUniversalAccessFromFileURLs\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "file-access-off universal",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setAllowFileAccessFromFileURLs\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "file-access-off from-file-urls",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setAllowFileAccess\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "file-access-off",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setGeolocationEnabled\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "geolocation-off",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)\s*;\n)',
                re.M,
            ),
            "mixed-content",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setMediaPlaybackRequiresUserGesture\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "media-gesture",
        ),
        (
            re.compile(r'(webView\.setSoundEffectsEnabled\s*\(\s*false\s*\)\s*;\n)', re.M),
            "sound-effects-off",
        ),
        (
            re.compile(r'(webView\.setHorizontalScrollBarEnabled\s*\(\s*false\s*\)\s*;\n)', re.M),
            "scrollbars",
        ),
        (
            re.compile(r'(webView\.setVerticalScrollBarEnabled\s*\(\s*false\s*\)\s*;\n)', re.M),
            "vertical-scrollbar",
        ),
        (
            re.compile(r'(webView\.setHapticFeedbackEnabled\s*\(\s*false\s*\)\s*;\n)', re.M),
            "haptic-off",
        ),
        (
            re.compile(r'(webView\.setLongClickable\s*\(\s*false\s*\)\s*;\n)', re.M),
            "long-click",
        ),
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setDisplayZoomControls\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "zoom",
        ),
        (
            re.compile(
                r'(webView\.setBackgroundColor\s*\(\s*Color\.parseColor\s*\(\s*"#1a1a2e"\s*\)\s*\)\s*;\n)',
                re.M,
            ),
            "background",
        ),
        (
            re.compile(
                r'(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)',
                re.M,
            ),
            "webView null-check",
        ),
        (
            re.compile(r'(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)', re.M),
            "getWebView assignment",
        ),
    )
    for pattern, label in anchors:
        match = pattern.search(raw)
        if match:
            raw = raw[: match.end()] + block + raw[match.end() :]
            changed = True
            print(
                f"[patch-android-webview-debug-off] "
                f"Inserted debug-off after {label}."
            )
            break
    else:
        sys.stderr.write("ERROR: could not find a WebView setup anchor in MainActivity\n")
        sys.exit(1)

# Ensure import android.webkit.WebView (MainActivity already uses WebView type).
if "import android.webkit.WebView;" not in raw:
    m = re.search(r'(import android\.webkit\.WebSettings;\n)', raw)
    if m:
        raw = raw[: m.end()] + "import android.webkit.WebView;\n" + raw[m.end() :]
        changed = True
        print("[patch-android-webview-debug-off] Added import android.webkit.WebView.")
    else:
        m2 = re.search(r'(package [^\n]+;\n\n)', raw)
        if m2:
            raw = raw[: m2.end()] + "import android.webkit.WebView;\n" + raw[m2.end() :]
            changed = True
            print(
                "[patch-android-webview-debug-off] "
                "Added import android.webkit.WebView (after package)."
            )

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(
    r'WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)\s*;',
    check,
), "setWebContentsDebuggingEnabled(false) missing after patch"
print(
    "[patch-android-webview-debug-off] Assert ok — debug-off present."
)
PY
