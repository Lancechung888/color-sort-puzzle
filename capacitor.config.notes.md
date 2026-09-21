# capacitor.config.json 說明（JSON 無法寫註解）

## AdMob App ID 現況（REAL-ADMOB-IDS · 2026-09-21）

| 平台 | App ID | 狀態 |
|------|--------|------|
| Android | `ca-app-pub-3904450574947460~6670970617` | **正式**（`initializeForTesting: false`） |
| iOS | `ca-app-pub-3940256099942544~1458002511` | **仍留 Google 示範**（尚無 iOS App／未建正式 iOS App ID；OK 暫留） |

正式 Android 單元 ID 在 `assets/js/ads.js` → `PROD_UNITS`（interstitial／rewarded）；`USE_TEST_ADS = false`。

## 過審／正式包前必換（iOS 仍待）

1. 在 AdMob 建立真實 **iOS** App 後替換 `plugins.AdMob.appIdIos`。
2. 同步替換 `assets/js/ads.js` 的 `PROD_UNITS.*.ios`。
3. `scripts/patch-android-admob.sh` 會從本 config 的 `appIdAndroid` 注入 `strings.xml` `admob_app_id`（勿再殘留 sample `3940…`）。
4. `initializeForTesting` 正式 Android 包已為 `false`。

## IAP 產品

- Play Console 一筆非消耗型產品 ID：`remove_ads`（與 `assets/js/billing.js` 常數一致）。
- 詳細步驟見 `docs/PLAY_POST_APPROVAL_CHECKLIST.md`。

**誠實邊界：** 真單元已配線 ≠ MILLION_USER_BAR **#7 Pass**。仍需實機三綠燈（interstitial、rewarded full-watch、remove_ads purchase+restore）。**勿宣稱 ship-ready。**

## backgroundColor（ANDROID-WEBVIEW-BG）

Root `backgroundColor: "#1a1a2e"` 與品牌系統列／splash 對齊，可減輕部分裝置冷啟白閃。

**注意：** 單獨設 Capacitor config **不足以**保證所有裝置不閃白——真正 source of truth 是 `MainActivity` `webView.setBackgroundColor(Color.parseColor("#1a1a2e"))`（見 `scripts/patch-android-webview-bg.sh`／`native-templates/android/README.md` §2q）。
