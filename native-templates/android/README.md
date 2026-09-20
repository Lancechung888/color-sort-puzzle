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
