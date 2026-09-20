#!/usr/bin/env bash
# Idempotent MainActivity third-party cookies deny for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Deny third-party cookies on the Capacitor WebView so ad/tracker iframes cannot
# set 3P cookies mid-run. First-party cookies / DomStorage remain available.
# Distinct from CLEARTEXT / MIXED-CONTENT / GEOLOCATION / FILE-ACCESS / AUTOFILL.
# Does NOT touch DomStorage / setAllowContentAccess / JavaScript / AdMob / Autofill.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-third-party-cookies-off] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MAIN_JAVA" ]]; then
  log "ERROR: MainActivity.java missing at $MAIN_JAVA" >&2
  exit 1
fi

python3 - "$MAIN_JAVA" <<'INNERPY'
import re
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()
changed = False

if re.search(r"import\s+android\.webkit\.CookieManager\s*;", raw):
    print("[patch-android-webview-third-party-cookies-off] import CookieManager already present — ok.")
else:
    m_web = re.search(r"(import\s+android\.webkit\.WebView\s*;\n)", raw)
    if m_web:
        raw = raw[: m_web.start()] + "import android.webkit.CookieManager;\n" + raw[m_web.start() :]
        changed = True
        print("[patch-android-webview-third-party-cookies-off] Added import CookieManager.")
    else:
        m_ws = re.search(r"(import\s+android\.webkit\.WebSettings\s*;\n)", raw)
        if m_ws:
            raw = raw[: m_ws.start()] + "import android.webkit.CookieManager;\n" + raw[m_ws.start() :]
            changed = True
            print("[patch-android-webview-third-party-cookies-off] Added import CookieManager.")
        else:
            m_pkg = re.search(r"(package\s+[\w.]+\s*;\n)", raw)
            if m_pkg:
                raw = raw[: m_pkg.end()] + "\nimport android.webkit.CookieManager;\n" + raw[m_pkg.end() :]
                changed = True
                print("[patch-android-webview-third-party-cookies-off] Added import CookieManager.")
            else:
                sys.stderr.write("ERROR: could not find place for import CookieManager\n")
                sys.exit(1)

block = (
    "      // ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF: deny 3P cookies (minSdk 22).\n"
    "      CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);\n"
)

already = re.search(
    r"CookieManager\s*\.\s*getInstance\s*\(\s*\)\s*\.\s*setAcceptThirdPartyCookies\s*\(\s*webView\s*,\s*false\s*\)",
    raw,
)

if already:
    print(
        "[patch-android-webview-third-party-cookies-off] "
        "setAcceptThirdPartyCookies(webView, false) already present — ok."
    )
else:
    anchors = (
        (
            re.compile(
                r"(if\s*\(\s*Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.O\s*\)\s*\{\n"
                r"[ \t]*webView\.setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)\s*;\n"
                r"[ \t]*\}\n)",
                re.M,
            ),
            "autofill-off",
        ),
        (
            re.compile(
                r"(webView\.getSettings\(\)\s*\.\s*setDomStorageEnabled\s*\(\s*true\s*\)\s*;\n)",
                re.M,
            ),
            "dom-storage-on",
        ),
        (
            re.compile(
                r"(WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)\s*;\n)",
                re.M,
            ),
            "debug-off",
        ),
        (
            re.compile(
                r"(WebView\s+webView\s*=\s*getBridge\(\)\.getWebView\(\)\s*;\n[ \t]*if\s*\(\s*webView\s*==\s*null\s*\)\s*return\s*;\n)",
                re.M,
            ),
            "webView null-check",
        ),
        (
            re.compile(r"(WebView\s+webView\s*=\s*[^;]+getWebView\(\)\s*;\s*)", re.M),
            "getWebView assignment",
        ),
    )
    for pattern, label in anchors:
        match = pattern.search(raw)
        if match:
            raw = raw[: match.end()] + block + raw[match.end() :]
            changed = True
            print(
                f"[patch-android-webview-third-party-cookies-off] "
                f"Inserted third-party-cookies-off after {label}."
            )
            break
    else:
        sys.stderr.write("ERROR: could not find a WebView setup anchor in MainActivity\n")
        sys.exit(1)

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(r"import\s+android\.webkit\.CookieManager\s*;", check), "import CookieManager missing"
assert re.search(
    r"CookieManager\s*\.\s*getInstance\s*\(\s*\)\s*\.\s*setAcceptThirdPartyCookies\s*\(\s*webView\s*,\s*false\s*\)",
    check,
), "setAcceptThirdPartyCookies missing after patch"
print(
    "[patch-android-webview-third-party-cookies-off] Assert ok — third-party-cookies-off present."
)
INNERPY
