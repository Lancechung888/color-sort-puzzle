#!/usr/bin/env bash
# Idempotent brand-dark system bars (status / nav / window) for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Capacitor/AppCompat defaults inherit Material indigo (#3F51B5) from @capacitor/android
# library colors; cold start / status / nav look stock. Brand is dark #1a1a2e (theme-color /
# --bg-top) + accent #4ecdc4 (--accent).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
VALUES_DIR="$ANDROID_DIR/app/src/main/res/values"
COLORS_XML="$VALUES_DIR/colors.xml"
STYLES_XML="$VALUES_DIR/styles.xml"

log() { echo "[patch-android-system-bars] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -d "$VALUES_DIR" ]]; then
  log "ERROR: values/ missing at $VALUES_DIR" >&2
  exit 1
fi

python3 - "$COLORS_XML" "$STYLES_XML" <<'PY'
import os
import re
import sys

colors_path, styles_path = sys.argv[1], sys.argv[2]

BRAND = "#1a1a2e"
BRAND_DARK = "#121225"
ACCENT = "#4ecdc4"

DESIRED_COLORS = f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- ANDROID-SYSTEM-BARS: brand dark (overrides Capacitor indigo #3F51B5). -->
    <color name="colorPrimary">{BRAND}</color>
    <color name="colorPrimaryDark">{BRAND_DARK}</color>
    <color name="colorAccent">{ACCENT}</color>
    <color name="colorBrandBg">{BRAND}</color>
</resources>
'''

DESIRED_STYLES = f'''<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- Base application theme. ANDROID-SYSTEM-BARS: brand dark status/nav/window. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">{BRAND}</item>
        <item name="android:navigationBarColor">{BRAND}</item>
        <item name="android:windowBackground">{BRAND}</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:statusBarColor">{BRAND}</item>
        <item name="android:navigationBarColor">{BRAND}</item>
        <item name="android:windowBackground">{BRAND}</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>


    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:statusBarColor">{BRAND}</item>
        <item name="android:navigationBarColor">{BRAND}</item>
        <item name="android:windowBackground">{BRAND}</item>
    </style>
</resources>
'''

def colors_ok(raw: str) -> bool:
    def color_val(name: str) -> str | None:
        m = re.search(
            rf'<color\b[^>]*\bname\s*=\s*["\']{name}["\'][^>]*>\s*([^<\s]+)\s*</color>',
            raw,
            re.I,
        )
        if not m:
            m = re.search(
                rf'<color\b[^>]*\bname\s*=\s*["\']{name}["\'][^>]*>\s*([^<\s]+)\s*</color>',
                raw,
                re.I,
            )
        return m.group(1).strip() if m else None

    return (
        color_val("colorPrimary") == BRAND
        and color_val("colorPrimaryDark") == BRAND_DARK
        and color_val("colorAccent") == ACCENT
        and color_val("colorBrandBg") == BRAND
    )


def style_has_bars(block: str) -> bool:
    """True if status/nav/windowBackground are brand dark (#1a1a2e or @color/colorBrandBg / colorPrimary)."""
    def item(name: str) -> str | None:
        m = re.search(
            rf'<item\s+name\s*=\s*["\']{re.escape(name)}["\']\s*>\s*([^<\s]+)\s*</item>',
            block,
            re.I,
        )
        return m.group(1).strip() if m else None

    ok_vals = {BRAND, "@color/colorBrandBg", "@color/colorPrimary"}
    sb = item("android:statusBarColor")
    nb = item("android:navigationBarColor")
    wb = item("android:windowBackground")
    return sb in ok_vals and nb in ok_vals and wb in ok_vals


def styles_ok(raw: str) -> bool:
    # Extract each named style block (non-greedy until next style or end).
    def style_block(name: str) -> str | None:
        m = re.search(
            rf'<style\b[^>]*\bname\s*=\s*["\']{re.escape(name)}["\'][^>]*>([\s\S]*?)</style>',
            raw,
            re.I,
        )
        return m.group(0) if m else None

    for name in ("AppTheme", "AppTheme.NoActionBar", "AppTheme.NoActionBarLaunch"):
        block = style_block(name)
        if not block or not style_has_bars(block):
            return False
    return True


colors_raw = open(colors_path, encoding="utf-8").read() if os.path.isfile(colors_path) else ""
styles_raw = open(styles_path, encoding="utf-8").read() if os.path.isfile(styles_path) else ""

c_ok = colors_ok(colors_raw) if colors_raw else False
s_ok = styles_ok(styles_raw) if styles_raw else False

if c_ok and s_ok:
    print(
        "[patch-android-system-bars] colors.xml + styles.xml already brand dark "
        f"({BRAND}) status/nav/window — ok."
    )
    sys.exit(0)

os.makedirs(os.path.dirname(colors_path), exist_ok=True)
open(colors_path, "w", encoding="utf-8").write(DESIRED_COLORS)
open(styles_path, "w", encoding="utf-8").write(DESIRED_STYLES)
print(
    "[patch-android-system-bars] Wrote brand colors.xml + styles.xml "
    f"(statusBarColor/navigationBarColor/windowBackground={BRAND})."
)
PY
