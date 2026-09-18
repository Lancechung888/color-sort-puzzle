# Android native snippets（`npx cap add android` 之後）

完整 `android/` 工程**不要**強制提交進 git（本倉庫 `.gitignore` 已忽略）。  
下列片段在本機產生專案後手動核對即可。

> 2026-09-19 驗證：`npx cap add android` + `npx cap sync` **不會**自動寫入 AdMob `APPLICATION_ID`／`admob_app_id`。必須依本文件手動補上。

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

（`@capgo/native-purchases` + Play Billing 函式庫通常會合併進 Manifest；若缺失請手動補上。）

## 3. 建置提醒

```bash
npm i
npm run build:www
npx cap add android   # 僅第一次
# 套用本文件 §1（AdMob meta-data + string）
npx cap sync
# 設定簽章後
cd android && ./gradlew bundleRelease
```

**本機前置：** JDK 17+（`JAVA_HOME`）、Android SDK（`ANDROID_HOME` 或 `android/local.properties` 的 `sdk.dir`）。缺一則 Gradle 無法跑（見 `docs/NATIVE_PACK_READY.md`）。

## 4. Release 簽章（摘要）

1. `keytool` 建立 upload keystore（勿提交 `.jks`／密碼）。
2. 本機 `android/keystore.properties`（建議加入忽略）指向 keystore。
3. 在 `android/app/build.gradle` 接上 `signingConfigs.release` → `buildTypes.release`。
4. `./gradlew bundleRelease` → 上傳 Play **內部測試**。

產品 ID `remove_ads` 須先在 Play Console 建立並啟用；內部測試＋License testers。詳見 `docs/PLAY_POST_APPROVAL_CHECKLIST.md`。完整就緒勾選：`docs/NATIVE_PACK_READY.md`。

## 5. 可驗收文件與一鍵 AAB

- 測試 ID 階段驗收說明（簽名／缺 SDK 行為／打勾清單）：[`docs/NATIVE_ACCEPTANCE.md`](../../docs/NATIVE_ACCEPTANCE.md)
- 本機一鍵內測 AAB：`npm run aab:internal`（→ `scripts/build-internal-aab.sh`；無 JDK／SDK 時明確非 0 失敗）
- 測 ID 配線自檢（不需 `android/`）：`npm run native:check`
