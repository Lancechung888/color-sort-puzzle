# 原生包可驗收說明（prod AdMob 配線＋內測 vc5）

> **給 CEO 三問一行摘要**  
> 1) Capacitor android／簽名：**文件齊備**（本機 `cap add`＋keystore／`signingConfigs` 步驟齊，`android/` 不進 git）。  
> 2) 內測 AAB：`npm run aab:internal` 一鍵路徑已就緒；**包裝箱已具備 JDK 17 + Android SDK**；已多次產出**已簽名** release AAB（含現況 **vc5-uncap1tap**）。無 SDK 的 agent／CI 箱仍應非 0 退出並印缺項。  
> 3) AdMob／Billing：**REAL-ADMOB-IDS** 已配線 Android 正式 App／單元 ID＋`USE_TEST_ADS=false`；Billing≥8 patch 就緒；假 IAP 預設關。Play **internal testing Active** = `1.0.4-internal-vc5-uncap1tap`／versionCode **5**。**#7 仍 Fail**（缺實機三綠燈）。未上架 production。  
>
> Marker: **NATIVE-ACCEPTANCE-VC5-SYNC**（對齊 `docs/NATIVE_PACK_READY.md`／`docs/PLAY_CONSOLE_PASTE.md` 的 **NATIVE-VC5-INTERNAL-SYNC**／**PLAY-PASTE-VC5-SYNC**）。

---

## 狀態（可驗收 — 文件＋腳本＋現況誠實）

| 項目 | 現況 |
|------|------|
| 階段 | **prod AdMob 已配線**（`REAL-ADMOB-IDS`；`USE_TEST_ADS=false`）＋ Play **internal** Active **vc5** |
| 上架 | **僅內部測試**；**未** production；勿宣稱已上架 |
| 假 IAP | **關**（`colorTubeSort_devIap` 預設關閉；無 native Billing 不 grant） |
| #7 | **仍 Fail** — 需實機三綠燈（interstitial／rewarded 完整看完／`remove_ads` 購買＋還原） |
| Active AAB | `1.0.4-internal-vc5-uncap1tap`／vc5／1.0.4／Billing≥8／prod AdMob／**UNCAP-ONE-TAP**；**不含** tip 的 **IAP-PURCHASE-BUSY**（下次上傳需 versionCode **>5**） |
| 本文件 | **可驗收**：與 `NATIVE_PACK_READY`／paste 對齊；歷史測 ID 階段標 superseded |

驗收以：**文件齊、現況不說謊、有 SDK 時可產出簽名 AAB、#7 不因配線／上傳 alone 標 Pass**。

---

## §1 Capacitor android／簽名齊備說明

### 1.1 `android/` 本機產生，不進 git

```bash
npm install
npm run build:www
npm run cap:add:android   # 等同 npx cap add android
npx cap sync
```

- 產生的 `android/` 目錄已在倉庫 `.gitignore`（`android/`）。
- **勿提交**完整 `android/` 樹；模板片段見 `native-templates/android/README.md`。

### 1.2 用 keytool 產生 upload keystore

```bash
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

依提示設定 store／key 密碼與證書資訊。產出檔僅放本機安全位置。

### 1.3 `keystore.properties` 範本（勿提交）

放在本機 `android/keystore.properties`（或專案根，依你本機約定）：

```properties
storeFile=../path/to/upload-keystore.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```

### 1.4 `app/build.gradle`：`signingConfigs` + `buildTypes.release` 片段

在 `android/app/build.gradle`（`npx cap add android` 之後）參考加入：

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties["storeFile"])
                storePassword keystoreProperties["storePassword"]
                keyAlias keystoreProperties["keyAlias"]
                keyPassword keystoreProperties["keyPassword"]
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            // proguardFiles ...
        }
    }
}
```

實際路徑以本機 `android/` 結構為準；缺 `keystore.properties` 時勿強簽。

### 1.5 `.gitignore` 建議

```
*.jks
*.keystore
keystore.properties
```

### 1.6 勿提交密鑰

- 不要把 `.jks`／`.keystore`／含真實密碼的 `keystore.properties` 推進 git、Issue、或聊天。
- CI／agent 環境不應持有 upload 密鑰；簽名僅在受信任本機或正式簽章管道執行。

---

## §2 內測 AAB：一鍵路徑

```bash
npm run aab:internal
```

等同執行 `scripts/build-internal-aab.sh`：

1. 檢查 **Java（JDK 17+）** — 找不到 → **非 0 退出**，中文說明缺 JDK。
2. 檢查 **`ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 或 `~/Android/Sdk`** — 找不到 → **非 0 退出**，中文說明缺 SDK。
3. 檢查本機 **`android/`** 目錄 — 不存在 → 提示先跑 `npm run cap:add:android`，**非 0 退出**。
4. 通過後：`npm run build:www` → `npx cap sync` → Billing≥8／versionCode／AdMob Manifest patches → `(cd android && ./gradlew bundleRelease)`。

### 驗收標準

| 條件 | 判定 |
|------|------|
| 本文件＋`scripts/build-internal-aab.sh`＋`package.json` 的 `aab:internal` 齊 | **流程就緒** |
| agent／CI 箱無 JDK 或無 Android SDK | 腳本 **exit ≠ 0** 並印缺什麼＝**預期** |
| 包裝箱（JDK17＋SDK＋keystore＋已 `cap add`） | **已驗證**可產出 signed AAB（含現況 vc5） |
| Play internal 上傳 | **已上傳 current** vc5（見 `NATIVE_PACK_READY`）；下次含 IAP-PURCHASE-BUSY 需 **versionCode >5** |

輔助核對配線（不需完整 `android/` 樹進 git）：

```bash
npm run native:check
```

---

## §3 接線打勾清單（依 main 現況）

### 已過關（現況）

- [x] **REAL-ADMOB-IDS** — Android 正式 App ID＋interstitial／rewarded；`USE_TEST_ADS=false`；`initializeForTesting=false`  
  路徑：`capacitor.config.json`、`assets/js/ads.js`；詳見 `docs/ADMOB_POST_LINK_CHECKLIST.md`／`docs/PLAY_CONSOLE_PASTE.md`
- [x] **billing.js** 產品 `remove_ads`＋無 web／無 plugin 時不 grant；**IAP-PURCHASE-BUSY** 在 tip main（Active vc5 AAB **尚未**含此碼）
- [x] **Play Billing ≥8**：`scripts/patch-android-billing-8.sh`（`billing:8.3.0`＋`PendingPurchasesParams`＋`minSdk 23`）；`aab:internal` 在 `cap sync` 後呼叫
- [x] **versionCode 5／versionName 1.0.4**：`scripts/patch-android-version.sh`（下次上傳覆寫 `COLOR_TUBE_VERSION_CODE`＞5）
- [x] **game.js** 點擊不白送 `removeAds`（僅 `isBillingReady()` 走真購買；devIap 預設關）
- [x] **native-templates** Manifest／Billing snippets  
  路徑：`native-templates/android/README.md`
- [x] 包裝箱已 `cap add android`＋產出 signed AAB（含 **vc5-uncap1tap**）
- [x] Play **internal testing** 已上傳 current：`1.0.4-internal-vc5-uncap1tap`／vc5；testers `lancechung@gmail.com`＋`hanwen16888@gmail.com`（**INTERNAL-TESTER-SYNC**）

### 歷史（superseded — 勿當現況）

- Google sample／示範 AdMob App／單元 ID＋`USE_TEST_ADS=true`＋`1.0.1-internal-vc2-testids`／vc2 — **已 superseded**（見 `NATIVE_PACK_READY` 歷史段）。

### 仍開著（阻塞 #7／下次上傳 — 非「測 ID 階段」）

- [ ] **實機三綠燈** → 才能把 MILLION_USER_BAR **#7** 從 Fail 挪開：  
  (1) interstitial 實機播出  
  (2) rewarded **完整看完**發獎  
  (3) `remove_ads` 購買＋還原  
- [ ] 下次內測 AAB：**versionCode >5**，把 tip 的 **IAP-PURCHASE-BUSY** 打進 Active 包  
- [ ] Production／公開軌道 — **未動**；過審後清單見 `docs/PLAY_POST_APPROVAL_CHECKLIST.md`

---

## 相關連結

- 英文就緒狀態：`docs/NATIVE_PACK_READY.md`（**NATIVE-VC5-INTERNAL-SYNC**）
- Paste 現況：`docs/PLAY_CONSOLE_PASTE.md`（**PLAY-PASTE-VC5-SYNC**）
- 過審後清單：`docs/PLAY_POST_APPROVAL_CHECKLIST.md`
- Capacitor 備註：`capacitor.config.notes.md`
- Android 模板：`native-templates/android/README.md`
- 一鍵 AAB：`npm run aab:internal` → `scripts/build-internal-aab.sh`
- 配線自檢：`npm run native:check` → `scripts/native-wiring-check.js`
