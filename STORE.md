> **揭蓋硬規則：** Icon／首圖／預覽前3秒必須有蓋子；標題禁用泛用 Water Puzzle。詳見 `store-assets/商店素材規格包_v1.md`。

# ColorTube Sort — Store listing & publish checklist

Suggested **appId**: `com.lancechung.colortubesort`

> **Locales:** **Primary = English (en-US)** — default Play / App Store listing and in-app UI.  
> **Secondary = Traditional Chinese (zh-Hant)** — optional TW/HK listing only. Ship English-first for global hybrid-casual.

> **Market lock (see `docs/MARKET_SCAN_EN.md`):** Keep title **ColorTube Sort: Lid Puzzle**. Stuff *water sort / color sort / tube* into short desc + Apple keywords. Remove Ads IAP target **$2.99**. UA first-3s: gold lid blocks pour → uncap (not plain water ASMR alone).

## ASO — Google Play

### English (EN) — **Primary / default listing**

| Field | Copy |
|--------|------|
| **Title** | ColorTube Sort: Lid Puzzle |
| **Short description** | Water color sort — lids lock tubes. Uncap, pour, 3-star clears. Daily! |

### Traditional Chinese (TW zh-Hant) — secondary

| Field | Copy |
|--------|------|
| **Title** | 彩管分類：揭蓋倒水益智 |
| **Short description** | 有蓋倒不出。揭蓋、倒水、三星過關。今日挑戰免費解壓！ |

## ASO — Apple App Store

### English (EN) — **Primary / default listing**

| Field | Copy |
|--------|------|
| **Name** | ColorTube Sort |
| **Subtitle** | Uncap, Pour & Sort |
| **Keywords** | water,sort,pour,tube,puzzle,relax,daily,casual,brain,liquid |

### Traditional Chinese (TW) — secondary

| Field | Copy |
|--------|------|
| **Name** | 彩管分類 ColorTube Sort |
| **Subtitle** | 揭蓋倒水 · 三星益智 |
| **Keywords** | 顏色排序,水管,倒水,拼圖,益智,解壓,每日挑戰,三星,液體,休閒 |

## Monetization wiring order

Implement in this order (matches `game.js` stubs and `src/monetization.md`):

1. **AdMob rewarded** — hint / continue / soft prompts (`showRewardedStub`)
2. **AdMob interstitial** — fail-loop and similar, skipped when `removeAds` (`showInterstitialStub`)
3. **remove_ads IAP** — one-time purchase via Play Billing / StoreKit (`mockIapPurchase('remove_ads', …)`)

Optional later: theme / hint-pack IAPs. Guardrails: never interrupt mid-pour; rewarded always optional; remove-ads disables interstitial (rewarded may stay as optional bonus).

## Cost & platform order

| Item | Cost |
|------|------|
| Google Play Console | **US$25** one-time |
| Apple Developer Program | **US$99 / year** |

**Ship order:** first **Android (Play)**, then **iOS (App Store)**.

## Capacitor / native prep (this repo)

- `capacitor.config.json` — appId / appName / `webDir: www`
- `npm run build:www` — sync `index.html` + `assets/` into `www/`
- Then: `npx cap add android` (requires Android SDK locally; not required for this scaffolding)
- See README **上架路徑** and `src/monetization.md`


## Play Store — long descriptions

# Google Play store copy

## English · Full description (PRIMARY — title: ColorTube Sort: Lid Puzzle)

See the lid before you pour. ColorTube Sort — capped tubes lock; tap to uncap (free move), then pour and sort.

HOW TO PLAY
• Tap a tube to lift its top liquid layers, then tap a valid tube to pour
• Pour only into an empty tube, or one with the same top color and free space
• Clear a level when every tube is empty or a single solid color
• Matching contiguous layers pour together for a snappy, satisfying loop

WHY IT CLICKS
• Glass tubes, pour splash, complete-tube glow, and confetti on win
• 3-star ratings: beat the par and skip undo for a perfect clear
• Coins, hints, and unlockable themes — progress saves on device
• Daily Challenge + login streak so there’s always a reason to return
• No timers and no lives — play at your own pace

WHAT’S INSIDE
• 35+ levels: early stages teach the rule; later stages add colors, height, and more tubes
• Themes: Classic Glass, Neon Club, Cozy Cat (unlockable)
• Undo / Restart / Hint when you’re stuck

FREE TO PLAY + OPTIONAL PURCHASES
• The full puzzle loop is free
• Optional rewarded ads for hints or continue
• Optional one-time Remove Ads (skips interstitials; rewarded stays optional)
• Optional theme packs and hint packs

Download ColorTube Sort and turn messy tubes into clean colors.

Keywords: color sort, water sort, tube puzzle, pour puzzle, color sorting, relaxing puzzle, daily challenge, casual brain game, liquid sort, no timer

---

## 繁中 · 完整長述（secondary zh-Hant — 建議標題：彩管分類：揭蓋倒水益智）

先看到蓋子，再決定倒水。《彩管分類 ColorTube Sort》——有蓋鎖定不能倒，點蓋揭開（不占步數），再一指倒水分類。

【怎麼玩】
• 點選彩管拿起頂層液體，點另一支合法彩管倒下
• 只能倒進空管，或頂色相同且有空位的管子
• 把每支管子變成「空管」或「單一純色」即過關
• 同色連續層會一起倒下，節奏乾脆、手感解壓

【為什麼好玩】
• 玻璃管＋倒水飛濺＋整管發光＋過關撒花，視覺爽感一次到位
• 三星評分：少步數、少撤銷挑戰滿分，適合反覆挑戰
• 金幣經濟＋提示／主題商店，進度會留在本機
• 「今日挑戰」＋登入連勝，每天都有理由回來
• 無計時、無生命限制，節奏由你決定，適合通勤與睡前

【內容】
• 35+ 關卡：前段教學手感，後段多色、更高管、更多管子
• 主題皮膚：經典玻璃、霓虹夜店、療癒貓咪色（可解鎖）
• 撤銷／重來／提示，卡關也不氣人

【免費遊玩與可選購買】
• 遊戲本體完整可玩
• 可選擇觀看獎勵廣告換提示或繼續
• 可選「去除廣告」一次買斷，插頁廣告不再出現（獎勵廣告仍可當選項）
• 主題包、提示包等為可選內購

下載《彩管分類》，一指倒水，把混亂排成彩虹。

關鍵字：彩管分類、顏色排序、水管拼圖、倒水遊戲、顏色分類、益智解壓、每日挑戰、休閒益智、液體排序、無計時


## Data Safety / privacy checklist (short)

> **EN primary (host + Play form):** [`docs/PRIVACY_POLICY_EN.md`](./docs/PRIVACY_POLICY_EN.md) · [`docs/PLAY_DATA_SAFETY.md`](./docs/PLAY_DATA_SAFETY.md) · index [`docs/PRIVACY_README.md`](./docs/PRIVACY_README.md).


> Full checklist also mirrored from launch notes below. App: localStorage save, AdMob, optional IAP; **no account / no cloud sync**.

# Play 資料安全／隱私勾選注意清單（ColorTube Sort）

依目前設計：本機存檔（localStorage）、AdMob 廣告、可選 IAP。無帳號、無雲端同步、無好友／社群。

## A. 上架前必備頁面
- [ ] 隱私權政策網址（公開 HTTPS，商店與 App 內「關於／設定」都要放）
- [ ] 政策內寫清：廣告 SDK（AdMob／Google）、分析（若有）、購買、本機存檔、無帳號
- [ ] iOS 另備：ATT 說明文案（NSUserTrackingUsageDescription）
- [ ] 商店「App 內容」：廣告聲明勾「含廣告」（有 AdMob 就要勾）

## B. Play Console → 資料安全表（Data safety）逐項建議

### 1) 資料蒐集總覽
- 是否蒐集／分享必要資料以提供 App？→ **是**（廣告／可能的大致位置／裝置識別供廣告）
- 是否所有資料皆加密傳輸？→ **是**（走 HTTPS／官方 SDK）
- 使用者可否要求刪除資料？→ **是**（說明：清除 App 資料／卸載即可清本機；廣告／帳務資料依 Google 政策）

### 2) 蒐集的資料類型（有 AdMob 時常見勾選）
勾「是，有蒐集」，再細勾（以 AdMob 實際為準，上線前對照 AdMob／UMP 設定）：

| 類型 | 建議 | 用途勾選 | 是否必填／可選 | 是否分享給第三方 |
|------|------|----------|----------------|------------------|
| 大致位置（Approximate location） | 常勾 | 廣告、分析 | 可選 | 是（廣告夥伴） |
| 裝置或其他 ID（Device or other IDs） | **必勾** | 廣告、詐騙防範、分析 | 可選 | 是 |
| 應用程式互動（App interactions） | 若開 AdMob／Firebase 分析就勾 | 廣告、分析 | 可選 | 視 SDK |
| 診斷（Crash logs / Diagnostics） | 若接 Firebase Crashlytics 才勾 | 應用功能／分析 | 可選 | 視情況 |
| 購買紀錄（Purchase history） | 有 IAP → **勾** | 應用功能、帳務 | 可選（買了才有） | 與 Google Play 處理；勿誇大「分享」 |
| 個人資訊／姓名／Email／相片 | **不勾**（除非你真的要登入） | — | — | — |
| 精確位置、通訊錄、麥克風、相機 | **不勾** | — | — | — |

### 3) 廣告相關聲明
- [ ] 「App 是否含廣告？」→ **是**
- [ ] 資料用途包含 **Advertising or marketing**
- [ ] 說明可選「去除廣告」後仍可能有可選獎勵廣告（若你保留 rewarded）

### 4) 兒童／家庭
- [ ] 目標受眾：建議 **18+** 或「混合但非以兒童為主」——**不要**勾「專為兒童」除非做過 COPPA 合規
- [ ] AdMob：勿對兒童定向；`tagForChildDirectedTreatment` 預設 false（本草稿如此）
- [ ] 若誤標兒童向，廣告收益與審核風險大增

### 5) 金融／IAP
- [ ] 有內購 → 商店勾「應用程式內購」
- [ ] 資料安全：Purchase history 勾應用功能
- [ ] 產品：`remove_ads` 非消耗型；主題／提示包另建
- [ ] 政策頁與商店長述寫「可選購買」

## C. 隱私權政策最少段落（可直接擴寫）
1. 開發者聯絡方式（Email）
2. 蒐集什麼：廣告識別碼、大致地區、裝置資訊（經 AdMob）；本機關卡／金幣（僅裝置內）
3. 用途：顯示廣告、防詐騙、維護服務、處理購買
4. 第三方：Google AdMob / Google Play Billing（列官方隱私連結）
5. 權利：卸載／清除資料；EEA 可經 UMP 管理同意
6. 兒童：非針對 13 歲以下
7. 變更與生效日

## D. 技術核對（審核常踩雷）
- [ ] AndroidManifest 有 AdMob **App ID**（不是單元 ID）
- [ ] 正式包勿長期開 `initializeForTesting: true`
- [ ] 測試用 Google 示範單元 ID，上架前換成自己的
- [ ] 倒水過程中不彈 interstitial（已寫在 ads 草稿）
- [ ] iOS：Info.plist GADApplicationIdentifier + tracking 說明 + SKAdNetwork
- [ ] 商店截圖／預覽不要假「編輯精選」或誤導收益數字

