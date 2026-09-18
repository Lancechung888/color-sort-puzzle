# capacitor.config.json 說明（JSON 無法寫註解）

目前 `plugins.AdMob` 使用 **Google 官方示範 App ID**（測試用）：

| 平台 | 測試 App ID |
|------|-------------|
| Android | `ca-app-pub-3940256099942544~3347511713` |
| iOS | `ca-app-pub-3940256099942544~1458002511` |

## 過審／正式包前必換

1. 在 AdMob 建立真實 App（連結 Play 上架後）取得 **App ID**（含 `~`，不是單元 ID）。
2. 替換 `capacitor.config.json` → `plugins.AdMob.appIdAndroid` / `appIdIos`。
3. 同步替換 `assets/js/ads.js` 的 `PROD_UNITS`，並設 `USE_TEST_ADS = false`。
4. 若 `cap add android` 後 Manifest 有硬編碼，請一併改（見 `native-templates/android/README.md`）。
5. `initializeForTesting` 正式包應改 `false`（或依插件文件關閉測試初始化）。

## IAP 產品

- Play Console 一筆非消耗型產品 ID：`remove_ads`（與 `assets/js/billing.js` 常數一致）。
- 詳細步驟見 `docs/PLAY_POST_APPROVAL_CHECKLIST.md`。

**勿宣稱已上架**：帳號審核中／未過審前僅能內部測試。
