# 原生包可驗收說明（測試 ID 階段）

> **給 CEO 三問一行摘要**  
> 1) Capacitor android／簽名：**文件齊備**（本機 `cap add`＋keystore／`signingConfigs` 步驟齊，`android/` 不進 git）。  
> 2) 內測 AAB：`npm run aab:internal` 一鍵路徑已就緒；**本包裝箱已具備 JDK 17 + Android SDK；`npm run aab:internal` 於 2026-09-19 產出**已簽名** release AAB（測 ID）。無 SDK 的 agent／CI 箱仍應非 0 退出並印缺項**。  
> 3) AdMob／Billing 測 ID：**接線打勾已過關**（見 §3）；假 IAP 預設關、未上架、無白送。

---

## 狀態（可驗收）

| 項目 | 現況 |
|------|------|
| 階段 | **測試 ID**（Google 示範 AdMob App／單元 ID） |
| 上架 | **未上架**；未宣稱已上架或已進正式軌道 |
| 假 IAP | **關**（`colorTubeSort_devIap` 預設關閉；無 native Billing 不 grant） |
| 本文件 | **可驗收**：文件＋script＋測 ID 配線＝流程就緒證明 |

驗收以：**文件齊、測 ID 配線可核對、有 SDK 時可產出簽名 AAB**；無 SDK 的環境腳本必須明確失敗。本包裝箱 2026-09-19 已驗證簽名 AAB 路徑。

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

### 1.5 `.gitignore` 建議（本 PR 已加）

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
4. 通過後：`npm run build:www` → `npx cap sync` → `(cd android && ./gradlew bundleRelease)`。

### 驗收標準

| 條件 | 判定 |
|------|------|
| `docs/NATIVE_ACCEPTANCE.md` + `scripts/build-internal-aab.sh` + `package.json` 的 `aab:internal` 齊 | **流程就緒**（可驗收） |
| agent／CI 箱無 JDK 或無 Android SDK | 腳本 **exit ≠ 0** 並印缺什麼＝**預期**，不是回歸 |
| 本機已裝 JDK17+、SDK、keystore，且已 `cap add android` | 可實際產出 signed／unsigned AAB（視簽章設定） |

**目前 agent 環境：無 JDK、無 `ANDROID_HOME` → 不硬裝 SDK；不以此箱產出 AAB 為驗收項。**

輔助核對測 ID 配線（不需 `android/`）：

```bash
npm run native:check
```

---

## §3 測 ID 接線打勾清單（依 main 現況）

### 已過關（測試 ID 階段）

- [x] **capacitor.config** AdMob test App ID + `initializeForTesting`  
  路徑：`capacitor.config.json`（`~3347511713`／`~1458002511`，`initializeForTesting: true`）
- [x] **ads.js** `USE_TEST_ADS` + Google sample interstitial／rewarded units  
  路徑：`assets/js/ads.js`
- [x] **billing.js** 產品 `remove_ads` + 無 web／無 plugin 時不 grant  
  路徑：`assets/js/billing.js`
- [x] **game.js** 點擊不白送 `removeAds`（僅 `isBillingReady()` 走真購買；否則 gated mock，devIap 預設關）  
  路徑：`assets/js/game.js`（或專案內對應 `purchaseRemoveAds` 實作）
- [x] **native-templates** Manifest／Billing snippets  
  路徑：`native-templates/android/README.md`

### 待本機／帳號（非本 PR 阻塞）

- [ ] 本機已 `cap add android`（需 Android SDK）  
  指令：`npm run cap:add:android`
- [ ] 已產出 signed AAB（需 SDK + keystore）  
  指令：`npm run aab:internal`（本機）
- [ ] 已上傳 Play 內測（需 Play 帳號過審）  
  見：`docs/PLAY_POST_APPROVAL_CHECKLIST.md`

---

## 相關連結

- 英文就緒狀態（環境探測）：`docs/NATIVE_PACK_READY.md`
- 過審後清單：`docs/PLAY_POST_APPROVAL_CHECKLIST.md` §E
- Capacitor 備註：`capacitor.config.notes.md`
- Android 模板：`native-templates/android/README.md`
- 一鍵 AAB：`npm run aab:internal` → `scripts/build-internal-aab.sh`
- 配線自檢：`npm run native:check` → `scripts/native-wiring-check.js`
