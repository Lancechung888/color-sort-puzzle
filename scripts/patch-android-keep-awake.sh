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

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebSettings;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * ANDROID-KEEP-AWAKE + ANDROID-SPLASH-THEME + ANDROID-WEBVIEW-OVERSCROLL + ANDROID-WEBVIEW-TEXT-ZOOM + ANDROID-WEBVIEW-BG + ANDROID-WEBVIEW-ZOOM-LOCK + ANDROID-WEBVIEW-LONG-CLICK + ANDROID-WEBVIEW-HAPTIC-OFF + ANDROID-WEBVIEW-SCROLLBARS + ANDROID-WEBVIEW-SOUND-EFFECTS-OFF + ANDROID-WEBVIEW-MEDIA-GESTURE + ANDROID-WEBVIEW-MIXED-CONTENT + ANDROID-WEBVIEW-GEOLOCATION-OFF + ANDROID-WEBVIEW-FILE-ACCESS-OFF:
 * FLAG_KEEP_SCREEN_ON while playing; SplashScreen.installSplashScreen before
 * super.onCreate (API 31+); webView.setOverScrollMode(OVER_SCROLL_NEVER) so
 * native glow/rubber-band cannot kill mid-run play (pairs CSS overscroll-behavior:none);
 * webView.getSettings().setTextZoom(100) so system Font/Display size cannot scale tube/HUD CSS;
 * webView.setBackgroundColor(#1a1a2e) so cold start / splash handoff does not flash white;
 * setSupportZoom/setBuiltInZoomControls/setDisplayZoomControls(false) so native pinch zoom
 * cannot break the fixed portrait tube board (browser/PWA A11Y-ZOOM unchanged);
 * setOnLongClickListener(v -> true) + setLongClickable(false) so ActionMode / context menu
 * (Copy/Share/Web Search) cannot overlay mid-run despite CSS user-select:none;
 * setHapticFeedbackEnabled(false) so Android View system haptic cannot fight intentional
 * Capacitor/vibrate mid-run (game haptic() / @capacitor/haptics still on via JS).
 * setVerticalScrollBarEnabled(false) + setHorizontalScrollBarEnabled(false) so native
 * WebView scrollbar chrome cannot flash over scrollable Levels / Shop containers.
 * setSoundEffectsEnabled(false) so Android View click sounds cannot fight intentional
 * WebAudio SFX mid-run (game playSfx() / Settings Sound toggle still on via JS).
 * setMediaPlaybackRequiresUserGesture(false) so HTMLAudioElement / playSfx is not
 * blocked by sticky WebView media-gesture gates (distinct from SOUND-EFFECTS-OFF).
 * setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW) so HTTPS Capacitor origin cannot load
 * cleartext HTTP subresources (complements ANDROID-CLEARTEXT Manifest denial).
 * setGeolocationEnabled(false) so WebView cannot request GPS mid-run (no location collected;
 * complements Play Data Safety / privacy — distinct from CLEARTEXT / MIXED-CONTENT).
 * setAllowFileAccess/FromFileURLs/UniversalAccessFromFileURLs(false) so mid-run cannot
 * open file:// or escalate via file URLs (Capacitor serves https://localhost; leave
 * setAllowContentAccess alone for Cap plugins — distinct from GEOLOCATION-OFF).
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
      webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
      webView.getSettings().setTextZoom(100);
      webView.setBackgroundColor(Color.parseColor("#1a1a2e"));
      webView.getSettings().setSupportZoom(false);
      webView.getSettings().setBuiltInZoomControls(false);
      webView.getSettings().setDisplayZoomControls(false);
      webView.setOnLongClickListener(v -> true); // consume long-press
      webView.setLongClickable(false);
      webView.setHapticFeedbackEnabled(false);
      webView.setVerticalScrollBarEnabled(false);
      webView.setHorizontalScrollBarEnabled(false);
      webView.setSoundEffectsEnabled(false);
      webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
      webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
      webView.getSettings().setGeolocationEnabled(false);
      webView.getSettings().setAllowFileAccess(false);
      webView.getSettings().setAllowFileAccessFromFileURLs(false);
      webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
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
