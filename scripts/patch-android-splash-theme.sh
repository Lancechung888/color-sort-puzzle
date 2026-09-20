#!/usr/bin/env bash
# Idempotent Android 12+ SplashScreen handoff for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
#
# Capacitor ships androidx.core:core-splashscreen + Theme.SplashScreen launch
# theme, but stock MainActivity never calls SplashScreen.installSplashScreen()
# before super.onCreate — cold start can flash white / skip brand splash on API 31+.
# Also ensure AppTheme.NoActionBarLaunch has windowSplashScreenBackground +
# postSplashScreenTheme → AppTheme.NoActionBar, and light-nav icons off on dark bars.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
STYLES_XML="$ANDROID_DIR/app/src/main/res/values/styles.xml"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-splash-theme] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$STYLES_XML" ]]; then
  log "ERROR: styles.xml missing at $STYLES_XML" >&2
  exit 1
fi

if [[ ! -f "$MAIN_JAVA" ]]; then
  log "ERROR: MainActivity.java missing at $MAIN_JAVA" >&2
  exit 1
fi

python3 - "$STYLES_XML" "$MAIN_JAVA" <<'PY'
import re
import sys

styles_path, main_path = sys.argv[1], sys.argv[2]
BRAND = "#1a1a2e"

styles = open(styles_path, encoding="utf-8").read()
main = open(main_path, encoding="utf-8").read()
styles_changed = False
main_changed = False


def style_block(raw: str, name: str) -> tuple[int, int, str] | None:
    m = re.search(
        rf'<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>([\s\S]*?)</style>',
        raw,
        re.I,
    )
    if not m:
        return None
    return m.start(), m.end(), m.group(0)


def ensure_item(block: str, name: str, value: str) -> str:
    """Set or insert <item name="…">value</item> inside a style block."""
    pat = rf'(<item\s+name\s*=\s*["\']{re.escape(name)}["\']\s*>)\s*[^<\s]+\s*(</item>)'
    if re.search(pat, block, re.I):
        return re.sub(pat, rf"\1{value}\2", block, count=1, flags=re.I)
    # Insert before closing </style>
    return re.sub(
        r"</style>\s*$",
        f'        <item name="{name}">{value}</item>\n    </style>',
        block,
        count=1,
        flags=re.I,
    )


def launch_ok(block: str) -> bool:
    return (
        re.search(
            r'<item\s+name\s*=\s*["\']postSplashScreenTheme["\']\s*>\s*@style/AppTheme\.NoActionBar\s*</item>',
            block,
            re.I,
        )
        is not None
        and re.search(
            r'<item\s+name\s*=\s*["\']windowSplashScreenBackground["\']\s*>\s*(?:@color/colorBrandBg|@color/colorPrimary|#1a1a2e)\s*</item>',
            block,
            re.I,
        )
        is not None
    )


# --- styles: AppTheme.NoActionBarLaunch splash attrs ---
launch = style_block(styles, "AppTheme.NoActionBarLaunch")
if launch is None:
    sys.stderr.write("ERROR: AppTheme.NoActionBarLaunch missing in styles.xml\n")
    sys.exit(1)

ls, le, lblock = launch
if not launch_ok(lblock):
    lblock = ensure_item(lblock, "windowSplashScreenBackground", "@color/colorBrandBg")
    lblock = ensure_item(lblock, "postSplashScreenTheme", "@style/AppTheme.NoActionBar")
    # Keep status/nav/window brand dark (may already exist from SYSTEM-BARS).
    lblock = ensure_item(lblock, "android:statusBarColor", BRAND)
    lblock = ensure_item(lblock, "android:navigationBarColor", BRAND)
    lblock = ensure_item(lblock, "android:windowBackground", BRAND)
    lblock = ensure_item(lblock, "android:windowLightStatusBar", "false")
    lblock = ensure_item(lblock, "android:windowLightNavigationBar", "false")
    styles = styles[:ls] + lblock + styles[le:]
    styles_changed = True

# --- styles: light nav icons off on dark bars (AppTheme + NoActionBar) ---
for name in ("AppTheme", "AppTheme.NoActionBar"):
    found = style_block(styles, name)
    if found is None:
        continue
    s, e, block = found
    if not re.search(
        r'<item\s+name\s*=\s*["\']android:windowLightNavigationBar["\']\s*>\s*false\s*</item>',
        block,
        re.I,
    ):
        block = ensure_item(block, "android:windowLightNavigationBar", "false")
        styles = styles[:s] + block + styles[e:]
        styles_changed = True
        # re-find next with updated string offsets — restart loop safely by rewriting from scratch each time
        # (small file; re-parse after each mutation)
        # Actually offsets stale after first mutation — re-read style_block from updated styles each iteration.
        # We already updated `styles`; next iteration uses fresh style_block(styles, name). OK if we
        # don't reuse old offsets. Good.

if styles_changed:
    open(styles_path, "w", encoding="utf-8").write(styles)
    print(
        "[patch-android-splash-theme] Updated styles.xml "
        "(postSplashScreenTheme + windowSplashScreenBackground + light-nav false)."
    )
else:
    print("[patch-android-splash-theme] styles.xml splash theme already ok.")

# --- MainActivity: SplashScreen.installSplashScreen(this) before super.onCreate ---
has_install = "SplashScreen.installSplashScreen" in main
has_import = "androidx.core.splashscreen.SplashScreen" in main

if has_install and has_import:
    print("[patch-android-splash-theme] MainActivity already installs SplashScreen — ok.")
else:
    if not has_import:
        # After package / after last android.* import / before BridgeActivity import
        if re.search(r"import\s+androidx\.core\.splashscreen\.SplashScreen\s*;", main):
            pass
        elif re.search(r"import\s+com\.getcapacitor\.BridgeActivity\s*;", main):
            main = re.sub(
                r"(import\s+com\.getcapacitor\.BridgeActivity\s*;)",
                "import androidx.core.splashscreen.SplashScreen;\n\\1",
                main,
                count=1,
            )
        else:
            main = re.sub(
                r"(package\s+[\w.]+\s*;\s*)",
                "\\1\nimport androidx.core.splashscreen.SplashScreen;\n",
                main,
                count=1,
            )
        main_changed = True

    if not has_install:
        # Insert before first super.onCreate(
        if not re.search(r"super\.onCreate\s*\(", main):
            sys.stderr.write("ERROR: super.onCreate( not found in MainActivity\n")
            sys.exit(1)

        def _inject_splash(m: re.Match) -> str:
            spaces = m.group(1).lstrip("\r\n")
            return (
                f"\n{spaces}// ANDROID-SPLASH-THEME: must run before super.onCreate (API 31+).\n"
                f"{spaces}SplashScreen.installSplashScreen(this);\n"
                f"{spaces}super.onCreate("
            )

        main = re.sub(
            r"(\n[ \t]*)super\.onCreate\s*\(",
            _inject_splash,
            main,
            count=1,
        )
        main_changed = True

    # Tag class javadoc if keep-awake comment present
    if "ANDROID-SPLASH-THEME" not in main and "ANDROID-KEEP-AWAKE" in main:
        main = main.replace(
            "ANDROID-KEEP-AWAKE:",
            "ANDROID-KEEP-AWAKE + ANDROID-SPLASH-THEME:",
            1,
        )
        main_changed = True

    open(main_path, "w", encoding="utf-8").write(main)
    print(
        "[patch-android-splash-theme] MainActivity: SplashScreen.installSplashScreen before super.onCreate."
    )

if not styles_changed and has_install and has_import:
    print("[patch-android-splash-theme] already patched — ok.")
PY
