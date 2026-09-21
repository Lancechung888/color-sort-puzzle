# Android native snippets（`npx cap add android` 之後）

完整 `android/` 工程**不要**強制提交進 git（本倉庫 `.gitignore` 已忽略）。  
下列片段在本機產生專案後核對即可；**優先用腳本自動補**，勿手抄遺漏。

> 2026-09-19 驗證：`npx cap add android` + `npx cap sync` **不會**自動寫入 AdMob `APPLICATION_ID`／`admob_app_id`。必須補上，否則原生 AdMob init 會因缺 APPLICATION_ID 崩潰。

## 0. 一鍵補丁（建議）

本機已有 `android/` 時：

```bash
bash scripts/patch-android-admob.sh
```

腳本會**冪等**確保：

1. `android/app/src/main/res/values/strings.xml` 有 `admob_app_id` = Google 示範 `ca-app-pub-3940256099942544~3347511713`
2. `AndroidManifest.xml` `<application>` 內有 `com.google.android.gms.ads.APPLICATION_ID` → `@string/admob_app_id`
3. `<uses-permission android:name="com.android.vending.BILLING" />`

已存在則略過；無 `android/` 時安全 exit 0。  
`npm run aab:internal`（`scripts/build-internal-aab.sh`）在 `npx cap sync` **之後**會自動再跑本腳本，並接著跑 `scripts/patch-android-portrait.sh`（MainActivity `android:screenOrientation="portrait"`）。

## 1. AdMob Application ID（不是廣告單元 ID）

`android/app/src/main/AndroidManifest.xml` 的 `<application>` 內：

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="@string/admob_app_id"/>
```

`android/app/src/main/res/values/strings.xml`：

```xml
<!-- 開發：Google 示範 App ID。正式包改成 AdMob 後台真實 App ID -->
<string name="admob_app_id">ca-app-pub-3940256099942544~3347511713</string>
```

`capacitor.config.json` → `plugins.AdMob.appIdAndroid` 與上列字串保持一致（示範 ID 階段）。正式包兩者一併替換。

## 2. Play Billing 權限

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

（`@capgo/native-purchases` + Play Billing 函式庫通常會合併進 Manifest；若缺失請手動補上或跑 §0 腳本。）


## 2b. MainActivity portrait lock（ANDROID-PORTRAIT）

Hybrid-casual tube board breaks in landscape. Web already has `orientation: portrait-primary` in `site.webmanifest`. Lock the native activity too:

`android/app/src/main/AndroidManifest.xml` 的 `.MainActivity` `<activity>`：

```xml
android:screenOrientation="portrait"
```

（`sensorPortrait`／`userPortrait` 亦可接受；prefer exact `portrait`。）

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-portrait.sh
```

`npm run aab:internal` 在 AdMob Manifest patch **之後**自動跑。`android/` 仍 gitignore；勿強制提交完整工程樹。


## 2c. MainActivity keep-awake（ANDROID-KEEP-AWAKE）

Capacitor WebView often lacks `navigator.wakeLock`. Native mid-game play should keep the screen on via `WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON`.

`MainActivity` (after patch):

- `onCreate`: default `FLAG_KEEP_SCREEN_ON` (matches Settings default On)
- `ColorTubeNative.setKeepScreenOn(boolean)` JS bridge — game Settings「Keep screen on」syncs on/off

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-keep-awake.sh
```

`npm run aab:internal` 在 portrait patch **之後**自動跑。`android/` 仍 gitignore。


## 2d. Brand-dark system bars（ANDROID-SYSTEM-BARS）

Stock Capacitor/`AppCompat` inherits Material indigo (`colorPrimary` `#3F51B5`) for status / nav bars — cold start looks like a template app, not hybrid-casual. Brand is dark `#1a1a2e` (`theme-color` / CSS `--bg-top`) + accent `#4ecdc4` (`--accent`).

Patch writes:

- `android/app/src/main/res/values/colors.xml` — `colorPrimary`/`colorPrimaryDark`/`colorAccent`/`colorBrandBg`
- `styles.xml` — `AppTheme`, `AppTheme.NoActionBar`, `AppTheme.NoActionBarLaunch` get `android:statusBarColor` / `navigationBarColor` / `windowBackground` = `#1a1a2e` (+ `windowLightStatusBar` false where applicable)

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-system-bars.sh
```

`npm run aab:internal` 在 keep-awake patch **之後**自動跑。`android/` 仍 gitignore。


## 2e. SplashScreen handoff（ANDROID-SPLASH-THEME）

Capacitor already depends on `androidx.core:core-splashscreen` and uses `Theme.SplashScreen` for `AppTheme.NoActionBarLaunch`, but stock `MainActivity` never calls `SplashScreen.installSplashScreen(this)` **before** `super.onCreate` — on API 31+ cold start can flash white / skip the brand splash. Launch theme also needs `windowSplashScreenBackground` + `postSplashScreenTheme` → `AppTheme.NoActionBar`.

Patch ensures:

- `MainActivity.onCreate`: `SplashScreen.installSplashScreen(this)` before `super.onCreate` (also baked into `patch-android-keep-awake.sh` fresh template)
- `styles.xml` `AppTheme.NoActionBarLaunch`: `windowSplashScreenBackground=@color/colorBrandBg`, `postSplashScreenTheme=@style/AppTheme.NoActionBar`, dark light-status/nav icons off

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-splash-theme.sh
```

`npm run aab:internal` 在 system-bars patch **之後**自動跑。`android/` 仍 gitignore。


## 2f. Disable Auto Backup（ANDROID-NO-BACKUP）

Stock Capacitor sets `android:allowBackup="true"` with no rules. OS Auto Backup / device-transfer can restore WebView `localStorage` into a corrupt or stale progress blob after reinstall. In-app Settings **Backup progress** Export/Import (`SAVE-BACKUP`) is the supported backup path.

Patch ensures `<application>`:

- `android:allowBackup="false"`
- `android:fullBackupContent="@xml/backup_rules"` (empty include list)
- `android:dataExtractionRules="@xml/data_extraction_rules"` (deny cloud-backup + device-transfer)

Writes `res/xml/backup_rules.xml` + `res/xml/data_extraction_rules.xml`.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-no-backup.sh
```

`npm run aab:internal` 在 splash-theme patch **之後**自動跑。`android/` 仍 gitignore。

## 2g. Deny cleartext（ANDROID-CLEARTEXT）

Stock Capacitor / WebView may leave cleartext HTTP permitted. AdMob, Play Billing, and Capacitor loads should be HTTPS-only — deny cleartext at Manifest + `networkSecurityConfig`.

Patch ensures `<application>`:

- `android:usesCleartextTraffic="false"`
- `android:networkSecurityConfig="@xml/network_security_config"`

Writes `res/xml/network_security_config.xml` with `<base-config cleartextTrafficPermitted="false" />`.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-cleartext.sh
```

`npm run aab:internal` 在 no-backup patch **之後**自動跑。`android/` 仍 gitignore。


## 2h. Disable multi-window resize（ANDROID-RESIZE）

Portrait hybrid-casual tube layout breaks in multi-window / freeform. Lock MainActivity:

```xml
android:resizeableActivity="false"
```

（與 portrait 同屬 activity 屬性；冪等補丁。）

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-resize.sh
```

`npm run aab:internal` 在 cleartext patch **之後**自動跑。`android/` 仍 gitignore。

## 2i. Keep soft keyboard from resizing the board（ANDROID-SOFT-INPUT）

The portrait hybrid-casual tube WebView must keep its board frame when the soft keyboard opens. Set MainActivity:

```xml
android:windowSoftInputMode="adjustNothing"
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-soft-input.sh
```

`npm run aab:internal` 在 resize patch **之後**自動跑。`android/` 仍 gitignore。


## 2j. Mark as a game（ANDROID-IS-GAME）

Hybrid-casual should tell Android this is a **game**, not a generic utility app — helps Game Dashboard / system grouping.

`<application>`:

```xml
android:isGame="true"
android:appCategory="game"
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-is-game.sh
```

`npm run aab:internal` 在 soft-input patch **之後**自動跑。`android/` 仍 gitignore。


## 2k. Deny Force Dark（ANDROID-FORCE-DARK）

Android 10+ **Force Dark** can invert / wash brand-dark hybrid-casual UI (`#1a1a2e` tubes / juice / HUD) when themes parent `DayNight` or OEMs auto-apply Force Dark.

Deny it on `<application>` **and** themes:

```xml
<!-- AndroidManifest.xml <application> -->
android:forceDarkAllowed="false"

<!-- styles.xml AppTheme / AppTheme.NoActionBar / AppTheme.NoActionBarLaunch -->
<item name="android:forceDarkAllowed">false</item>
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-force-dark.sh
```

`npm run aab:internal` 在 is-game patch **之後**自動跑。`android/` 仍 gitignore。



## 2l. Keep WebView across display / font / RTL / colorMode（ANDROID-CONFIG-CHANGES）

Stock Capacitor MainActivity `configChanges` often omits **density** / **fontScale** / **layoutDirection** / **colorMode**. Those recreate the WebView mid-run when the player changes display size, font scale, RTL, or dark/light — risking in-memory pour / board state even with run-draft flush.

Ensure MainActivity:

```xml
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|density|fontScale|layoutDirection|colorMode"
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-config-changes.sh
```

`npm run aab:internal` 在 force-dark patch **之後**自動跑。`android/` 仍 gitignore。

## 2m. Display cutout shortEdges（ANDROID-CUTOUT）

Stock Capacitor themes omit `android:windowLayoutInDisplayCutoutMode` — WebView letterboxes around notches and CSS `env(safe-area-inset-*)` (SAFE-AREA-LR/TB) stays zero. Set **shortEdges** so the WebView can draw into the cutout and safe-area insets work.

```xml
<!-- styles.xml AppTheme / AppTheme.NoActionBar / AppTheme.NoActionBarLaunch -->
<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-cutout.sh
```

`npm run aab:internal` 在 config-changes patch **之後**自動跑。`android/` 仍 gitignore。

## 2n. Target SDK 36 + predictive back（ANDROID-TARGET-36）

Google Play (as of 2026-08-31) requires **new apps and updates** to target **API 36**. Stock Capacitor `variables.gradle` still ships compile/target **34**. Also set `android:enableOnBackInvokedCallback="true"` on `<application>` so Android 13+ predictive back works with CAP-APP-BACK (`App.addListener('backButton')`).

```gradle
// android/variables.gradle
compileSdkVersion = 36
targetSdkVersion = 36
// minSdkVersion stays 22
```

```xml
<!-- AndroidManifest.xml <application> -->
android:enableOnBackInvokedCallback="true"
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-target-sdk.sh
```

`npm run aab:internal` 在 cutout patch **之後**自動跑。需要本機已安裝 `platforms;android-36`（＋匹配 build-tools）。`android/` 仍 gitignore。

## 2o. Deny WebView overscroll（ANDROID-WEBVIEW-OVERSCROLL）

CSS `overscroll-behavior: none` on html/body blocks browser rubber-band, but Capacitor’s Android WebView still shows the system glow/edge effect and can steal mid-run gestures. Call `webView.setOverScrollMode(View.OVER_SCROLL_NEVER)` once the bridge WebView is ready (next to ColorTubeNative setup in `onStart`).

```java
// MainActivity.onStart — after getBridge().getWebView() null-check
webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-overscroll.sh
```

`npm run aab:internal` 在 target-sdk patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2p. Lock WebView textZoom（ANDROID-WEBVIEW-TEXT-ZOOM）

Android system **Font size** / **Display size** still scales Capacitor WebView text via `WebSettings` `textZoom` even when `configChanges` includes `fontScale` (that only prevents Activity recreate). Tube board / HUD CSS breaks when `textZoom ≠ 100`. Lock once the bridge WebView is ready (next to overscroll / ColorTubeNative in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (near setOverScrollMode)
webView.getSettings().setTextZoom(100);
```

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-text-zoom.sh
```

`npm run aab:internal` 在 webview-overscroll patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2q. Lock WebView background（ANDROID-WEBVIEW-BG）

Cold start／splash 交接前，Capacitor Android WebView 預設白底會閃一下。與 ANDROID-SPLASH-THEME／ANDROID-SYSTEM-BARS 搭配，把 bridge WebView 背景鎖成品牌 `#1a1a2e`（在 `onStart`、`setTextZoom` 之後）：

```java
import android.graphics.Color;
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after setTextZoom)
webView.setBackgroundColor(Color.parseColor("#1a1a2e"));
```

`capacitor.config.json` 可設 root `backgroundColor: "#1a1a2e"` 作輔助，但部分裝置仍不足——**MainActivity `setBackgroundColor` 才是 source of truth**。

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-bg.sh
```

`npm run aab:internal` 在 webview-text-zoom patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。


## 2r. Lock native WebView pinch zoom（ANDROID-WEBVIEW-ZOOM-LOCK）

Browser／PWA **A11Y-ZOOM** keeps viewport pinchable for accessibility. The **native** Capacitor WebView is different: pinch / built-in zoom scales the whole fixed portrait tube board and breaks HUD layout. Lock gesture zoom once the bridge WebView is ready (after `setBackgroundColor`／`setTextZoom` in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after setBackgroundColor)
webView.getSettings().setSupportZoom(false);
webView.getSettings().setBuiltInZoomControls(false);
webView.getSettings().setDisplayZoomControls(false);
```

Distinct from **ANDROID-WEBVIEW-TEXT-ZOOM** (`setTextZoom(100)` = system Font／Display size). This only denies WebView *gesture* zoom.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-zoom-lock.sh
```

`npm run aab:internal` 在 webview-bg patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2s. Deny native WebView long-press ActionMode（ANDROID-WEBVIEW-LONG-CLICK）

CSS `user-select: none` is not enough on Capacitor WebView: a long-press on HUD／labels can still open the native ActionMode overlay (Copy／Share／Web Search) mid-run. Consume long-press once the bridge WebView is ready (prefer after zoom-lock in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after setDisplayZoomControls)
webView.setOnLongClickListener(v -> true); // consume long-press
webView.setLongClickable(false);
```

`import android.view.View;` is already present for OVER_SCROLL；patch adds it if missing.

Distinct from **ANDROID-WEBVIEW-ZOOM-LOCK** (gesture zoom) and **ANDROID-WEBVIEW-TEXT-ZOOM** (system Font／Display). This only denies the long-press context menu.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-long-click.sh
```

`npm run aab:internal` 在 webview-zoom-lock patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2t. Deny native WebView system haptic（ANDROID-WEBVIEW-HAPTIC-OFF）

After **ANDROID-WEBVIEW-LONG-CLICK**, a long-press can still fire Android View **system haptic** (`View.performHapticFeedback`) even when the ActionMode menu is consumed. That buzz fights the game's intentional Capacitor／vibrate vocabulary mid-run. Disable native View haptic once the bridge WebView is ready (prefer after `setLongClickable(false)` in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after setLongClickable)
webView.setHapticFeedbackEnabled(false);
```

Distinct from **ANDROID-WEBVIEW-LONG-CLICK** (ActionMode／context menu) and from game `haptic()`／`@capacitor/haptics` (still on via JS／Settings Haptics toggle). This only denies the **system** View haptic channel.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-haptic-off.sh
```

`npm run aab:internal` 在 webview-long-click patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2u. Deny native WebView scrollbars（ANDROID-WEBVIEW-SCROLLBARS）

Stock Capacitor WebView scrollbars can flash OS chrome over the scrollable Levels grid and Shop modal. After **ANDROID-WEBVIEW-HAPTIC-OFF**, deny both native scrollbar directions while leaving container scrolling enabled (CSS hides the web/PWA chrome too):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (after haptic-off)
webView.setVerticalScrollBarEnabled(false);
webView.setHorizontalScrollBarEnabled(false);
```

Distinct from **ANDROID-WEBVIEW-OVERSCROLL** (glow／rubber-band); this only hides scrollbar chrome, so scrolling still works. CSS `scrollbar-width: none`／`::-webkit-scrollbar` covers `.levels-grid` and `.modal-shop`.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-scrollbars.sh
```

`npm run aab:internal` 在 haptic-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。


## 2v. Deny native WebView system click sounds（ANDROID-WEBVIEW-SOUND-EFFECTS-OFF）

After **ANDROID-WEBVIEW-SCROLLBARS**, taps can still fire Android View **system click sounds** (`View.playSoundEffect`), which fight the game's intentional WebAudio SFX mid-run. Disable native View sound effects once the bridge WebView is ready (prefer after scrollbar guards in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after scrollbars)
webView.setSoundEffectsEnabled(false);
```

Distinct from **ANDROID-WEBVIEW-HAPTIC-OFF** (system View haptic／vibrate) and from game `playSfx()`／WebAudio (still on via JS／Settings Sound toggle). This only denies the **system** View click-sound channel.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-sound-effects-off.sh
```

`npm run aab:internal` 在 webview-scrollbars patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。


## 2w. Allow HTML media without sticky gesture（ANDROID-WEBVIEW-MEDIA-GESTURE）

After **ANDROID-WEBVIEW-SOUND-EFFECTS-OFF**, Android WebView default `mediaPlaybackRequiresUserGesture=true` can still block／silence mid-run HTML media. Game SFX uses `HTMLAudioElement` via `new Audio()` in `assets/js/game.js` (`playSfx`). Allow intentional HTML media／SFX once the bridge WebView is ready (prefer after sound-effects-off in `onStart`):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after sound-effects-off)
webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
```

Distinct from **ANDROID-WEBVIEW-SOUND-EFFECTS-OFF** (`setSoundEffectsEnabled(false)` = deny Android View system click sounds). This *allows* intentional HTML media／SFX without sticky gesture gates; Settings Sound toggle still gates `playSfx()` in JS.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-media-gesture.sh
```

`npm run aab:internal` 在 webview-sound-effects-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2x. Deny WebView mixed content（ANDROID-WEBVIEW-MIXED-CONTENT）

After **ANDROID-WEBVIEW-MEDIA-GESTURE**, Capacitor WebView may still allow mixed HTTP/HTTPS (compatibility mode). Pair with **ANDROID-CLEARTEXT** (Manifest `usesCleartextTraffic=false` + `networkSecurityConfig`) by denying mixed content at `WebSettings` so an HTTPS Capacitor origin cannot load cleartext subresources mid-run:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after media-gesture)
webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
```

Requires `import android.webkit.WebSettings;`. Distinct from **ANDROID-CLEARTEXT** (Manifest / networkSecurityConfig) — this is the bridge WebView API gate.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-mixed-content.sh
```

`npm run aab:internal` 在 webview-media-gesture patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。


## 2y. Deny WebView geolocation（ANDROID-WEBVIEW-GEOLOCATION-OFF）

After **ANDROID-WEBVIEW-MIXED-CONTENT**, stock WebView may still leave geolocation enabled. ColorTube Sort collects **no location** (Play Data Safety / privacy). Deny at `WebSettings` so Capacitor cannot prompt for GPS mid-run:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after mixed-content)
webView.getSettings().setGeolocationEnabled(false);
```

Distinct from **ANDROID-CLEARTEXT** / **ANDROID-WEBVIEW-MIXED-CONTENT** (network/cleartext) — this only denies the geolocation channel.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-geolocation-off.sh
```

`npm run aab:internal` 在 webview-mixed-content patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2z. Deny WebView file access（ANDROID-WEBVIEW-FILE-ACCESS-OFF）

After **ANDROID-WEBVIEW-GEOLOCATION-OFF**, stock WebView may still allow `file://` / file-URL access. ColorTube Sort serves **https://localhost** via Capacitor and does **not** need WebView filesystem access. Deny at `WebSettings` so mid-run cannot open `file://` or escalate via file URLs (Play Data Safety / privacy):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after geolocation-off)
webView.getSettings().setAllowFileAccess(false);
webView.getSettings().setAllowFileAccessFromFileURLs(false);
webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
```

Do **not** set `setAllowContentAccess(false)` — leave content access alone (safer for Cap plugins).

Distinct from **ANDROID-CLEARTEXT** / **ANDROID-WEBVIEW-MIXED-CONTENT** (network/cleartext) and **ANDROID-WEBVIEW-GEOLOCATION-OFF** (GPS) — this only denies the filesystem / file-URL channel.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-file-access-off.sh
```

`npm run aab:internal` 在 webview-geolocation-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2aa. Deny WebView JS windows / multi-window（ANDROID-WEBVIEW-JS-WINDOWS-OFF）

After **ANDROID-WEBVIEW-FILE-ACCESS-OFF**, stock WebView may still leave `setSupportMultipleWindows` / `setJavaScriptCanOpenWindowsAutomatically` open. ColorTube Sort is a **single-WebView** hybrid-casual game (Capacitor **https://localhost**); mid-run must **not** spawn popup / secondary windows (focus steal, phishing surface). Deny both at `WebSettings`:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after file-access-off)
webView.getSettings().setSupportMultipleWindows(false);
webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
```

Do **not** disable JavaScript itself. Do **not** touch DomStorage / content access / cookies (AdMob later).

Distinct from **ANDROID-WEBVIEW-FILE-ACCESS-OFF** (filesystem / file-URL) — this only denies multi-window / `window.open` style popups.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-js-windows-off.sh
```

`npm run aab:internal` 在 webview-file-access-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2ab. Enable WebView Safe Browsing（ANDROID-WEBVIEW-SAFE-BROWSING）

After **ANDROID-WEBVIEW-JS-WINDOWS-OFF**, stock WebView may leave `setSafeBrowsingEnabled` unset/off. ColorTube Sort is a **single-WebView** hybrid-casual game (Capacitor **https://localhost**); enable Android WebView Safe Browsing so phishing / known-bad URLs are blocked at `WebSettings` (API 26+ method; minSdk 22 — fine on modern WebView):

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after js-windows-off)
webView.getSettings().setSafeBrowsingEnabled(true);
```

Do **not** disable JavaScript. Do **not** touch DomStorage / content access / cookies (AdMob later).

Distinct from **ANDROID-WEBVIEW-JS-WINDOWS-OFF** (multi-window / `window.open`) — this only enables Safe Browsing threat blocking.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-safe-browsing.sh
```

`npm run aab:internal` 在 webview-js-windows-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2ac. Deny WebView WebDatabase / Web SQL（ANDROID-WEBVIEW-DATABASE-OFF）

After **ANDROID-WEBVIEW-SAFE-BROWSING**, stock WebView may leave `setDatabaseEnabled` true/default. ColorTube Sort is a **single-WebView** hybrid-casual game; deny deprecated **Web SQL / WebDatabase**. Game progress uses **DomStorage / localStorage** — leave DomStorage **ENABLED**:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after safe-browsing)
webView.getSettings().setDatabaseEnabled(false);
```

Do **not** disable DomStorage. Do **not** touch cookies / `setAllowContentAccess` / JavaScript.

Distinct from **ANDROID-WEBVIEW-SAFE-BROWSING** (threat blocking) — this only denies WebDatabase/Web SQL.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-database-off.sh
```

`npm run aab:internal` 在 webview-safe-browsing patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2ad. Deny WebView algorithmic darkening（ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF）

After **ANDROID-WEBVIEW-DATABASE-OFF**, Android 13+ (API 33) WebView can still **algorithmically darken** HTML even when app theme / `<application>` has `forceDarkAllowed="false"` (**ANDROID-FORCE-DARK**). Deny at **WebSettings** so brand-dark `#1a1a2e` tubes / juice / HUD stay intact:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after database-off)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
  webView.getSettings().setAlgorithmicDarkeningAllowed(false);
}
```

Distinct from **ANDROID-FORCE-DARK** — that is a **theme / application attribute** (`android:forceDarkAllowed="false"`); this is a **WebSettings** API 33+ call. Both are needed.

Do **not** touch DomStorage / cookies / `setAllowContentAccess` / JavaScript.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-algorithmic-dark-off.sh
```

`npm run aab:internal` 在 webview-database-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2ae. Deny WebView remote debugging（ANDROID-WEBVIEW-DEBUG-OFF）

After **ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF**, Capacitor / Chromium WebView may still allow **Chrome remote debugging** (`chrome://inspect`) on devices. Deny at the **static** `WebView` class so production installs cannot be inspected:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after algorithmic-dark)
// ANDROID-WEBVIEW-DEBUG-OFF: deny Chrome remote WebView debugging.
WebView.setWebContentsDebuggingEnabled(false);
```

Always `false` for a predictable hybrid-casual ship path (simpler than `BuildConfig.DEBUG` gating). Static class call — **not** an instance method.

Distinct from **ANDROID-WEBVIEW-SAFE-BROWSING** (phishing / known-bad URL block) and **ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF** (API 33+ algorithmic darkening).

Do **not** disable JavaScript. Do **not** touch DomStorage / cookies / `setAllowContentAccess` / AdMob.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-debug-off.sh
```

`npm run aab:internal` 在 webview-algorithmic-dark-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2af. Ensure DomStorage / localStorage（ANDROID-WEBVIEW-DOM-STORAGE-ON）

After **ANDROID-WEBVIEW-DEBUG-OFF**, some OEM WebView builds may leave DomStorage off or flip defaults. ColorTube Sort **save progress** uses **localStorage / DomStorage** — explicitly enable so saves cannot silently break:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after debug-off)
// ANDROID-WEBVIEW-DOM-STORAGE-ON: ensure DomStorage/localStorage for save progress.
webView.getSettings().setDomStorageEnabled(true);
```

Distinct from **ANDROID-WEBVIEW-DATABASE-OFF** — that **denies** deprecated Web SQL / WebDatabase; DomStorage must stay **ON**. Do **not** call `setDatabaseEnabled(true)`. Do **not** touch cookies / `setAllowContentAccess` / JavaScript / AdMob.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-dom-storage-on.sh
```

`npm run aab:internal` 在 webview-debug-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。

## 2ag. Deny WebView Autofill overlays（ANDROID-WEBVIEW-AUTOFILL-OFF）

After **ANDROID-WEBVIEW-DOM-STORAGE-ON**, Android **Autofill Framework** (API 26+) can draw banners / steal focus over the Capacitor WebView mid-run. ColorTube Sort has **no forms** — deny Autofill on the bridge WebView:

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after dom-storage-on)
// ANDROID-WEBVIEW-AUTOFILL-OFF: deny Autofill overlays mid-run (API 26+).
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
  webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
}
```

Requires `import android.os.Build;` and `import android.view.View;` (already present for OVER_SCROLL_NEVER / algorithmic-dark).

Distinct from **ANDROID-WEBVIEW-LONG-CLICK** (ActionMode / context menu) and **ANDROID-WEBVIEW-HAPTIC-OFF** (View system haptic). Do **not** touch DomStorage / cookies / `setAllowContentAccess` / JavaScript / AdMob.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-autofill-off.sh
```

`npm run aab:internal` 在 webview-dom-storage-on patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。


## 2ah. Deny WebView third-party cookies（ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF）

After **ANDROID-WEBVIEW-AUTOFILL-OFF**, deny **third-party cookies** on the Capacitor bridge WebView so ad/tracker iframes cannot set 3P cookies mid-run. First-party cookies and DomStorage/localStorage stay available for Capacitor / save progress. Aligns with Data Safety / privacy (no account).

```java
// MainActivity.onStart — after getBridge().getWebView() null-check (prefer after autofill-off)
// ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF: deny 3P cookies (minSdk 22).
CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
```

Requires `import android.webkit.CookieManager;`.

Distinct from **ANDROID-CLEARTEXT** / **ANDROID-WEBVIEW-MIXED-CONTENT** (network cleartext), **ANDROID-WEBVIEW-GEOLOCATION-OFF**, **ANDROID-WEBVIEW-FILE-ACCESS-OFF**, and **ANDROID-WEBVIEW-AUTOFILL-OFF**. Do **not** disable first-party cookies. Do **not** touch DomStorage / `setAllowContentAccess` / JavaScript / AdMob.

一鍵補丁（冪等；無 `android/` 時 exit 0）：

```bash
bash scripts/patch-android-webview-third-party-cookies-off.sh
```

`npm run aab:internal` 在 webview-autofill-off patch **之後**、icons **之前**自動跑。`android/` 仍 gitignore。



## 2ai. Play Billing Library ≥8.0.0（ANDROID-BILLING-CLIENT-8）

Play Console rejects internal/production AABs that still ship **Google Play Billing Library 6.2.1** (declared by `@capgo/native-purchases@6.0.42`). Capgo **7+/8+** already depend on billing **8.x**, but those majors require **Capacitor ≥7 / ≥8**. This project stays on **Capacitor 6**, so we **do not** bump the npm major — instead an idempotent patch:

1. Rewrites `node_modules/@capgo/native-purchases/android/build.gradle` `billing_version` → **8.3.0**
2. Migrates `NativePurchasesPlugin.java` to Billing **8** APIs:
   - `enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())` (no-arg removed in 8.0)
   - `ProductDetailsResponseListener.onProductDetailsResponse(..., QueryProductDetailsResult)` + `getProductDetailsList()`
3. Forces `com.android.billingclient:billing:8.3.0` via `android/app/build.gradle` `resolutionStrategy` (local `android/` is gitignored)
4. Bumps `android/variables.gradle` `minSdkVersion` → **23** (Billing 8 requirement; Cap6 default was 22)

**Cap go purchases JS API unchanged** (same `@capgo/native-purchases@^6.0.42`). Does **not** flip `USE_TEST_ADS` or invent real AdMob IDs.

一鍵補丁（冪等；無 plugin 時 exit 0）：

```bash
bash scripts/patch-android-billing-8.sh
```

`npm run aab:internal` 在 `npx cap sync` **之後**、AdMob Manifest patch **之前**自動跑（sync 會還原 `node_modules` 連結的 plugin 樹，必須每次重補）。

## 4. Launcher icon + splash (finals ICON A)

Stock `npx cap add android` leaves the **default Capacitor** launcher. Brand assets live in:

`native-templates/android/res/` (from `store-assets/finals/colortube_icon_A_1024.png`)

Apply after every `cap sync`:

```bash
bash scripts/apply-android-icons.sh
```

`npm run aab:internal` runs this automatically after the AdMob Manifest patch.

## 3. 建置提醒

```bash
npm i
npm run build:www
npx cap add android   # 僅第一次
npx cap sync
bash scripts/patch-android-admob.sh   # 或依賴 aab:internal 內建呼叫
# 設定簽章後
cd android && ./gradlew bundleRelease
# 或一鍵：npm run aab:internal
```

**本機前置（本 packaging box 已就緒）：**

- JDK 17：`JAVA_HOME=/home/box/sdk/jdk-17.0.20.1+1`
- Android SDK：`ANDROID_HOME=/home/box/sdk/android`
- 其他機器：自行安裝 JDK 17+ 與 SDK，並匯出 `JAVA_HOME`／`ANDROID_HOME`（或寫 `android/local.properties` 的 `sdk.dir`）。

缺 JDK／SDK 則 Gradle 無法跑（見 `docs/NATIVE_PACK_READY.md`）。**Manifest 仍須經本腳本／本文件補丁**——SDK 就緒 ≠ AdMob 已可 init。

## 4. Release 簽章（摘要）

1. `keytool` 建立 upload keystore（勿提交 `.jks`／密碼）。
2. 本機 `android/keystore.properties`（建議加入忽略）指向 keystore。
3. 在 `android/app/build.gradle` 接上 `signingConfigs.release` → `buildTypes.release`。
4. `./gradlew bundleRelease` → 上傳 Play **內部測試**。

產品 ID `remove_ads` 須先在 Play Console 建立並啟用；內部測試＋License testers。詳見 `docs/PLAY_POST_APPROVAL_CHECKLIST.md`。完整就緒勾選：`docs/NATIVE_PACK_READY.md`。

## 5. 可驗收文件與一鍵 AAB

- 測試 ID 階段驗收說明（簽名／缺 SDK 行為／打勾清單）：[`docs/NATIVE_ACCEPTANCE.md`](../../docs/NATIVE_ACCEPTANCE.md)
- 本機一鍵內測 AAB：`npm run aab:internal`（→ `scripts/build-internal-aab.sh`；sync 後自動 patch AdMob；無 JDK／SDK／android/ 時明確非 0 失敗）
- 測 ID 配線自檢（不需 `android/`）：`npm run native:check`

**誠實邊界：** 本模板＋腳本只保證測試 App ID 寫進 Manifest，**不**宣稱 ship-ready、**不**把 #7 AdMob 標 Pass；正式單元與 `remove_ads` 實機 Billing 仍待 Play 過審。
