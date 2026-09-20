#!/usr/bin/env bash
# Idempotent MainActivity FLAG_KEEP_SCREEN_ON + ColorTubeNative JS bridge for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
# Capacitor WebView often lacks navigator.wakeLock; native flag keeps mid-game screen on.
# JS Settings "Keep screen on" calls ColorTubeNative.setKeepScreenOn(boolean).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MAIN_JAVA="$ANDROID_DIR/app/src/main/java/com/lancechung/colortubesort/MainActivity.java"

log() { echo "[patch-android-keep-awake] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MAIN_JAVA" ]]; then
  log "ERROR: MainActivity.java missing at $MAIN_JAVA" >&2
  exit 1
fi

python3 - "$MAIN_JAVA" <<'PY'
import sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()

NEEDLES = (
    "FLAG_KEEP_SCREEN_ON",
    "ColorTubeNative",
    "setKeepScreenOn",
)
if all(n in raw for n in NEEDLES):
    print("[patch-android-keep-awake] MainActivity already has FLAG_KEEP_SCREEN_ON + ColorTubeNative — ok.")
    sys.exit(0)

desired = '''package com.lancechung.colortubesort;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * ANDROID-KEEP-AWAKE + ANDROID-SPLASH-THEME: FLAG_KEEP_SCREEN_ON while playing;
 * SplashScreen.installSplashScreen before super.onCreate (API 31+).
 * Web Screen Wake Lock is unreliable in Capacitor WebView; Settings toggles via ColorTubeNative.
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // ANDROID-SPLASH-THEME: must run before super.onCreate (API 31+).
    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);
    // Default on until JS syncs save.keepAwake (matches WAKE-LOCK default).
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  }

  @Override
  public void onStart() {
    super.onStart();
    try {
      if (getBridge() == null) return;
      WebView webView = getBridge().getWebView();
      if (webView == null) return;
      webView.addJavascriptInterface(new KeepAwakeBridge(), "ColorTubeNative");
    } catch (Throwable ignored) {
      // Bridge not ready — default FLAG from onCreate still applies.
    }
  }

  private class KeepAwakeBridge {
    @JavascriptInterface
    public void setKeepScreenOn(final boolean on) {
      runOnUiThread(
          new Runnable() {
            @Override
            public void run() {
              if (on) {
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
              } else {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
              }
            }
          });
    }
  }
}
'''

open(path, "w", encoding="utf-8").write(desired)
print("[patch-android-keep-awake] Wrote MainActivity FLAG_KEEP_SCREEN_ON + ColorTubeNative.setKeepScreenOn.")
PY
