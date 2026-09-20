#!/usr/bin/env bash
# 內測 AAB 一鍵建置：缺 JDK／SDK／android/ 時非 0 退出並說明缺什麼。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[aab:internal] 專案根目錄: $ROOT"

# --- JDK ---
if ! command -v java >/dev/null 2>&1; then
  echo "❌ 缺少 JDK：找不到 java 指令。" >&2
  echo "   請安裝 JDK 17+（例如 Temurin／OpenJDK 17），並確認 java 在 PATH。" >&2
  echo "   本腳本不會代為安裝 SDK／JDK。" >&2
  exit 1
fi

JAVA_VER_RAW="$(java -version 2>&1 | head -n 1 || true)"
echo "[aab:internal] Java: $JAVA_VER_RAW"

# 粗判 major >= 17（可選；找不到版本字串仍繼續，由 Gradle 再報錯）
if echo "$JAVA_VER_RAW" | grep -Eq 'version "1\.|[0-9]+'; then
  MAJOR="$(echo "$JAVA_VER_RAW" | sed -n 's/.*version "\([0-9]*\).*/\1/p')"
  if [[ -n "${MAJOR:-}" && "$MAJOR" -lt 17 ]]; then
    echo "❌ JDK 版本過舊（偵測 major=$MAJOR）。需要 JDK 17+。" >&2
    exit 1
  fi
fi

# --- Android SDK ---
SDK_DIR=""
if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
  SDK_DIR="$ANDROID_HOME"
elif [[ -n "${ANDROID_SDK_ROOT:-}" && -d "$ANDROID_SDK_ROOT" ]]; then
  SDK_DIR="$ANDROID_SDK_ROOT"
elif [[ -d "${HOME}/Android/Sdk" ]]; then
  SDK_DIR="${HOME}/Android/Sdk"
  export ANDROID_HOME="$SDK_DIR"
  export ANDROID_SDK_ROOT="$SDK_DIR"
fi

if [[ -z "$SDK_DIR" ]]; then
  echo "❌ 缺少 Android SDK。" >&2
  echo "   未設定 ANDROID_HOME／ANDROID_SDK_ROOT，且不存在 ~/Android/Sdk。" >&2
  echo "   請安裝 Android Studio 或 command-line tools，並匯出 ANDROID_HOME。" >&2
  echo "   目前 agent／無 SDK 環境：此失敗碼為預期；請在本機具備 SDK 後再跑。" >&2
  exit 1
fi
echo "[aab:internal] Android SDK: $SDK_DIR"

# --- Capacitor android/ ---
if [[ ! -d "$ROOT/android" ]]; then
  echo "❌ 找不到本機 android/ 目錄（已被 gitignore，需本機產生）。" >&2
  echo "   請先執行：npm run cap:add:android" >&2
  echo "   （需要已安裝 Android SDK；完成後再跑 npm run aab:internal）" >&2
  exit 1
fi
echo "[aab:internal] 找到 android/ ，開始 build:www → cap sync → AdMob patch → bundleRelease"

npm run build:www
npx cap sync
# After sync so Capacitor cannot wipe custom Manifest / strings patches.
bash "$ROOT/scripts/patch-android-admob.sh"
# Lock MainActivity to portrait (hybrid-casual; web already portrait-primary).
bash "$ROOT/scripts/patch-android-portrait.sh"
# Native keep-awake (WebView often lacks navigator.wakeLock; Settings syncs via ColorTubeNative).
bash "$ROOT/scripts/patch-android-keep-awake.sh"
# Brand-dark status/nav/window bars (override Capacitor indigo #3F51B5).
bash "$ROOT/scripts/patch-android-system-bars.sh"
# Android 12+ SplashScreen install + postSplashScreenTheme (brand cold-start handoff).
bash "$ROOT/scripts/patch-android-splash-theme.sh"
# Disable Auto Backup / cloud data extraction (in-app SAVE-BACKUP is the supported path).
bash "$ROOT/scripts/patch-android-no-backup.sh"
# Deny cleartext HTTP (HTTPS-only; AdMob/Billing/Capacitor https scheme).
bash "$ROOT/scripts/patch-android-cleartext.sh"
# Disable multi-window / freeform resize (portrait tube layout breaks in freeform).
bash "$ROOT/scripts/patch-android-resize.sh"
# Keep the portrait WebView frame fixed while the soft keyboard opens.
bash "$ROOT/scripts/patch-android-soft-input.sh"
# Brand launcher + splash from finals ICON A (cap sync may leave stock Capacitor icons).
bash "$ROOT/scripts/apply-android-icons.sh"
(
  cd android
  ./gradlew bundleRelease
)

echo "✅ AAB 建置流程已跑完。產物通常在："
echo "   android/app/build/outputs/bundle/release/app-release.aab"
echo "   （若未設定 signingConfigs，可能是 unsigned；正式上傳請依 docs/NATIVE_ACCEPTANCE.md §1 簽名。）"
