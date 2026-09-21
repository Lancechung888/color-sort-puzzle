# Play 帳號過審後操作清單（ColorTube Sort）

> AppId：`com.lancechung.colortubesort`　顯示名稱：ColorTube Sort／彩管分類  
> **Play Console developer account: APPROVED**（2026-09-21 Asia/Taipei）。  
> **未完成真 AdMob ID／`remove_ads` Billing 內測驗證前：勿宣稱已上架／勿標 MILLION_USER_BAR #7 Pass。** 本階段仍可用示範廣告 ID；假 IAP（`colorTubeSort_devIap`）維持關閉。  
> Paste-ready fields: [`PLAY_CONSOLE_PASTE.md`](./PLAY_CONSOLE_PASTE.md) · Privacy HTTPS: https://lancechung888.github.io/color-sort-puzzle/privacy/

---

## A. Google Play Console（建立 App 與商店資料）

1. 開啟 [Google Play Console](https://play.google.com/console) → **建立應用程式**。
2. 套件名稱填：`com.lancechung.colortubesort`（之後不可改，需與 `capacitor.config.json` 的 `appId` 一致）。
3. **商店資訊** → 對照倉庫 `STORE.md`／`docs/PLAY_CONSOLE_PASTE.md`：
   - 繁中標題／短述／長述
   - 英文標題／短述／長述
4. **隱私權政策**：填公開 HTTPS URL（政策內容需涵蓋 AdMob、可選 IAP、本機存檔、無帳號）→ https://lancechung888.github.io/color-sort-puzzle/privacy/
5. <!-- PLAY-DATA-SAFETY-PASTE --> **App 內容 → 資料安全**：依 `STORE.md`「Play 資料安全／隱私勾選注意清單」勾選（大致位置、**裝置或其他 ID**、應用程式互動、購買紀錄、含廣告等）。**Device or other IDs** 深表答案見 `docs/PLAY_CONSOLE_PASTE_PACK.md` §4 **PLAY-DATA-SAFETY-PASTE**＋ `docs/PLAY_DATA_SAFETY.md` §C2（Collected+Shared／非 ephemeral／Optional／Advertising＋Fraud — 未接 GA4 勿勾 Analytics）。勿發明 Crashlytics／GA4 列。
6. **聲明**：勾「含廣告」、勾「應用程式內購」。
7. <!-- PLAY-CONTENT-RATING --> **App 內容 → Content rating（IARC）＋ Advertising ID**（若尚未完成）：
   - **Content rating**：依 `docs/PLAY_CONSOLE_PASTE_PACK.md` §3 **PLAY-CONTENT-RATING** 建議答案填官方問卷（暴力／性／語言／藥物／恐懼／賭博＝無；非真錢賭博；無 UGC）。預期 Everyone／PEGI 3 等級帶 — 須在 Console 正式送出，勿虛構證書。
   - **Advertising ID**：**Yes** — AdMob 廣告／廣告成效測量。**不可勾 No。**
   - Ads = Yes；IAP = Yes；News = No；COVID-19 = No；非 Designed for Families／非 primarily children。
8. **測試 → 內部測試** → 建立測試軌道與測試人員名單（之後上傳 AAB）。
9. 本步驟結束時仍 **未上架正式版**；僅準備內部測試。

---

## B. AdMob（建立 App 與廣告單元）

1. 開啟 [AdMob](https://apps.admob.com/) → **新增應用程式** → 選 Android → 盡量連結到已建立的 Play 資訊。
2. 複製 **應用程式 ID**（格式 `ca-app-pub-xxxx~yyyy`，含 `~`）。
3. 建立廣告單元（命名慣例見 `PLAY_CONSOLE_PASTE.md`）：
   - **插頁式（Interstitial）** → 複製單元 ID（含 `/`）
   - **獎勵廣告（Rewarded）** → 複製單元 ID
4. 暫時保留倉庫內 Google **示範** ID 做開發；正式包再換（見 C）。**勿發明／貼假 ca-app-pub ID。**

---

## C. 倉庫內替換正式 ID（單元就緒後）

1. `capacitor.config.json` → `plugins.AdMob.appIdAndroid`／`appIdIos` 換成真實 App ID；`initializeForTesting` 改 `false`。說明見 `capacitor.config.notes.md`。
2. `assets/js/ads.js`（並 `npm run build:www`）：
   - 填 `PROD_UNITS.interstitial` / `PROD_UNITS.rewarded` 的 android／ios
   - 設 `USE_TEST_ADS = false`
3. 若已 `npx cap add android`：檢查 Manifest `APPLICATION_ID` meta-data（參考 `native-templates/android/README.md`），勿把示範 ID 留在正式簽章包。
4. **不要** 在程式預設開啟 `localStorage.colorTubeSort_devIap=1`。

---

## D. Play 營利 → 建立 `remove_ads`

1. Play Console → **營利化 → 產品 → 應用程式內產品** → 建立產品。
2. 產品 ID：`remove_ads`（須與 `assets/js/billing.js` 常數 `REMOVE_ADS` 一致）。
3. 類型：**非消耗型（Managed / One-time）**。
4. 名稱／說明可寫「Remove Ads／去除插頁廣告」；建議價 **$2.99** → **啟用**。
5. **設定 → 授權測試** → 加入 License testers（Gmail），以便內部測試不扣真錢。

---

## E. 本機建置與上傳內部測試

> **可驗收進度（測試 ID 階段）**：見 [`docs/NATIVE_ACCEPTANCE.md`](./NATIVE_ACCEPTANCE.md)。  
> 一鍵內測 AAB：`npm run aab:internal`（缺 JDK／SDK 時非 0 退出並印缺項）。配線自檢：`npm run native:check`。

1. `npm install`
2. `npm run build:www`
3. 第一次：`npx cap add android`（或 `npm run cap:add:android`；產生本機 `android/`；**勿把完整 android 樹硬塞進 git**，除非另有共識）
4. `npx cap sync`
5. 依 `native-templates/android/README.md` 確認 AdMob App ID、Billing 權限；簽名步驟見 `docs/NATIVE_ACCEPTANCE.md` §1。
6. 設定簽章（keystore）後跑 `npm run aab:internal`（或手動 `./gradlew bundleRelease`）產出 AAB。
7. Play Console → **內部測試** → 上傳 AAB → 將測試連結給授權測試帳號驗證：
   - 示範／正式廣告是否依設定顯示
   - `remove_ads` 購買成功後 `removeAds` 才為 true；一般點擊不得白送

---

## F. 明確禁令（驗收／對外溝通）

1. **未完成真 AdMob ID／`remove_ads` Billing 內測驗證前：勿宣稱已上架／勿標 #7 Pass。**
2. 開發階段使用 **Google 示範 AdMob ID**（`USE_TEST_ADS === true`）；正式包再關。
3. 假 IAP：`colorTubeSort_devIap` **預設維持關閉**；僅本機手動設 `1` 才可 mock 給獎。
4. 商店點「去除廣告」在無真 Billing 成功時必須維持「即將開放／需商店帳號」，**不可**寫入 `removeAds`。

完成以上後，才進行正式軌道與對外上架聲明。

---

## G. GA4 analytics (optional but recommended)

1. Create a GA4 property for ColorTube Sort; add a data stream (Web and/or Android).
2. Copy Measurement ID (`G-…`) into `assets/js/analytics-config.js` → `MEASUREMENT_ID`.
3. `npm run build:www` (and rebuild AAB if shipping native).
4. Verify in Console + GA4 Realtime/DebugView (`session_start`, `level_start`, …). Empty id keeps console-only — **do not invent** an id.
