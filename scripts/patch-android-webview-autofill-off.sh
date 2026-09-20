#!/usr/bin/env bash
# Idempotent MainActivity Autofill deny for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Deny Android Autofill Framework overlays on the Capacitor WebView (API 26+)
# so mid-run tube taps are not covered by Autofill banners / focus steals.
# Distinct from LONG-CLICK (ActionMode) and HAPTIC-OFF (View haptic).
# Does NOT touch DomStorage / cookies / setAllowContentAccess / JavaScript / AdMob.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-webview-autofill-off] $*"; }

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

# --- import android.os.Build (for VERSION_CODES.O) ---
if re.search(r'import\s+android\.os\.Build\s*;', raw):
    print("[patch-android-webview-autofill-off] import android.os.Build already present — ok.")
else:
    m_imp = re.search(r'(import\s+android\.os\.Bundle\s*;\n)', raw)
    if m_imp:
        raw = raw[: m_imp.end()] + "import android.os.Build;\n" + raw[m_imp.end() :]
        changed = True
        print("[patch-android-webview-autofill-off] Added import android.os.Build.")
    else:
        m_pkg = re.search(r'(package\s+[\w.]+\s*;\n)', raw)
        if m_pkg:
            raw = raw[: m_pkg.end()] + "\nimport android.os.Build;\n" + raw[m_pkg.end() :]
            changed = True
            print("[patch-android-webview-autofill-off] Added import android.os.Build.")
        else:
            sys.stderr.write("ERROR: could not find place for import android.os.Build\n")
            sys.exit(1)

# --- import android.view.View ---
if re.search(r'import\s+android\.view\.View\s*;', raw):
    print("[patch-android-webview-autofill-off] import android.view.View already present — ok.")
else:
    m_imp = re.search(r'(import\s+android\.os\.Build\s*;\n)', raw)
    if m_imp:
        raw = raw[: m_imp.end()] + "import android.view.View;\n" + raw[m_imp.end() :]
        changed = True
        print("[patch-android-webview-autofill-off] Added import android.view.View.")
    else:
        m_web = re.search(r'(import\s+android\.webkit\.WebView\s*;\n)', raw)
        if m_web:
            raw = raw[: m_web.start()] + "import android.view.View;\n" + raw[m_web.start() :]
            changed = True
            print("[patch-android-webview-autofill-off] Added import android.view.View.")
        else:
            sys.stderr.write("ERROR: could not find place for import android.view.View\n")
            sys.exit(1)

block = (
    "      // ANDROID-WEBVIEW-AUTOFILL-OFF: deny Autofill overlays mid-run (API 26+).\n"
    "      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n"
    "        webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);\n"
    "      }\n"
)

already = re.search(
    r'setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)',
    raw,
)

if already:
    print(
        "[patch-android-webview-autofill-off] "
        "setImportantForAutofill(IMPORTANT_FOR_AUTOFILL_NO) already present — ok."
    )
else:
    # Prefer after dom-storage-on, then cascading older anchors.
    anchors = (
        (
            re.compile(
                r'(webView\.getSettings\(\)\s*\.\s*setDomStorageEnabled\s*\(\s*true\s*\)\s*;\n)',
                re.M,
            ),
            "dom-storage-on",
        ),
        (
            re.compile(
                r'(WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)\s*;\n)',
                re.M,
            ),
            "debug-off",
        ),
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
            re.compile(r'(webView\.setHapticFeedbackEnabled\s*\(\s*false\s*\)\s*;\n)', re.M),
            "haptic-off",
        ),
        (
            re.compile(r'(webView\.setLongClickable\s*\(\s*false\s*\)\s*;\n)', re.M),
            "long-click",
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
                f"[patch-android-webview-autofill-off] "
                f"Inserted autofill-off after {label}."
            )
            break
    else:
        sys.stderr.write("ERROR: could not find a WebView setup anchor in MainActivity\n")
        sys.exit(1)

if changed:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert re.search(r'import\s+android\.os\.Build\s*;', check), "import Build missing"
assert re.search(r'import\s+android\.view\.View\s*;', check), "import View missing"
assert re.search(
    r'setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)',
    check,
), "setImportantForAutofill missing after patch"
assert re.search(
    r'Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.O',
    check,
), "API 26 O guard missing after patch"
print(
    "[patch-android-webview-autofill-off] Assert ok — autofill-off present."
)
PY
