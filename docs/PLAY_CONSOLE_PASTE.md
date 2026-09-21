# Play Console / AdMob — paste-ready fields (ColorTube Sort)

> **EN first** (primary listing). Traditional Chinese secondary below.  
> Play developer account: **APPROVED** (2026-09-21 Asia/Taipei).  
> **Do not** claim live / #7 Pass until real AdMob units + `remove_ads` Billing device verify.  
> **Do not invent** real `ca-app-pub-…` IDs — leave placeholders until AdMob Console creates them.

Source of truth: `STORE.md` · `docs/PRIVACY_README.md` · `docs/PLAY_POST_APPROVAL_CHECKLIST.md`

---

## Identity

| Field | Value |
|--------|--------|
| **App name (display)** | ColorTube Sort |
| **Play listing title (EN)** | ColorTube Sort: Lid Puzzle |
| **Package name / appId** | `com.lancechung.colortubesort` |
| **Privacy policy URL (HTTPS)** | https://lancechung888.github.io/color-sort-puzzle/privacy/ |

Verified live on GitHub Pages (`main` → `/docs`). Use this exact URL in the Play form.

---

## English (PRIMARY) — store listing

### Short description
```
Water color sort — lids lock tubes. Uncap, pour, 3-star clears. Daily!
```

### Full description
```
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
• 80+ levels: early stages teach the rule; later stages add colors, height, and more tubes
• Themes: Classic Glass, Neon Club, Cozy Cat (unlockable)
• Undo / Restart / Hint when you’re stuck

FREE TO PLAY + OPTIONAL PURCHASES
• The full puzzle loop is free
• Optional rewarded ads for hints or continue
• Optional one-time Remove Ads (skips interstitials; rewarded stays optional)
• Optional theme packs and hint packs

Download ColorTube Sort and turn messy tubes into clean colors.

Keywords: color sort, water sort, tube puzzle, pour puzzle, color sorting, relaxing puzzle, daily challenge, casual brain game, liquid sort, no timer
```

---

## In-app product — `remove_ads`

| Field | Value |
|--------|--------|
| **Product ID** | `remove_ads` (must match `assets/js/billing.js` → `REMOVE_ADS`) |
| **Type** | Non-consumable / one-time managed product |
| **Name (EN)** | Remove Ads |
| **Description (EN)** | Remove interstitial ads. Optional rewarded ads for hints/continue may still be available. One-time purchase. |
| **Suggested price** | USD **$2.99** (adjust per market) |

---

## AdMob — unit naming convention (create in Console; then paste real IDs)

Do **not** invent `ca-app-pub` values. Name units clearly so they map 1:1 into `assets/js/ads.js` → `PROD_UNITS`:

| Role | Suggested AdMob unit name | Maps to |
|------|---------------------------|---------|
| Android interstitial | `ColorTube Sort — Android Interstitial` | `PROD_UNITS.interstitial.android` |
| Android rewarded | `ColorTube Sort — Android Rewarded` | `PROD_UNITS.rewarded.android` |
| iOS interstitial (later) | `ColorTube Sort — iOS Interstitial` | `PROD_UNITS.interstitial.ios` |
| iOS rewarded (later) | `ColorTube Sort — iOS Rewarded` | `PROD_UNITS.rewarded.ios` |

App ID (with `~`) → `capacitor.config.json` → `plugins.AdMob.appIdAndroid` / `appIdIos`.  
Until units exist: keep Google **sample** IDs + `USE_TEST_ADS = true`.

---

## 繁中（secondary · zh-Hant）

| 欄位 | 內容 |
|------|------|
| **標題** | 彩管分類：揭蓋倒水益智 |
| **短述** | 有蓋倒不出。揭蓋、倒水、三星過關。今日挑戰免費解壓！ |
| **去除廣告名稱** | 去除廣告 |
| **去除廣告說明** | 一次買斷，插頁廣告不再出現。獎勵廣告（提示／繼續）仍可當選項。 |

### 完整長述
```
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
• 80+ 關卡：前段教學手感，後段多色、更高管、更多管子
• 主題皮膚：經典玻璃、霓虹夜店、療癒貓咪色（可解鎖）
• 撤銷／重來／提示，卡關也不氣人

【免費遊玩與可選購買】
• 遊戲本體完整可玩
• 可選擇觀看獎勵廣告換提示或繼續
• 可選「去除廣告」一次買斷，插頁廣告不再出現（獎勵廣告仍可當選項）
• 主題包、提示包等為可選內購

下載《彩管分類》，一指倒水，把混亂排成彩虹。

關鍵字：彩管分類、顏色排序、水管拼圖、倒水遊戲、顏色分類、益智解壓、每日挑戰、休閒益智、液體排序、無計時
```

---

## Still needs user login (not done by this prep PR)

1. **Play Console** — Create app with package `com.lancechung.colortubesort`; paste listing + privacy URL; Data safety; Internal testing track.
2. **AdMob** — Create Android app + interstitial/rewarded units; copy real App ID + unit IDs into repo (separate PR).
3. **Play Billing** — Create/activate `remove_ads`; add license testers; device-verify purchase.
