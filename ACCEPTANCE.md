# 彩管分類 · 驗收報告（百萬用戶閘門）

> 結論：**不過** — P0②③ 仍 Blocked，禁止上架。  
> 標準：找問題／擋過關，不是蓋章。能玩 ≠ 通過。

驗收日：2026-09-18  
重驗日：2026-09-18（P0①④）；2026-09-19（`npm run accept` 自動化）  
驗收角色：遊戲驗收

---

## 閘門結論

| 結果 | 說明 |
|------|------|
| **不過** | P0①④ 已 Pass；P0②③ 真廣告／`?ad=1` 產線仍 **Blocked**（等帳號） |
| 上架 | **禁止**直到②③解除 Blocked 並複驗通過 |

---

## 自動化套件 · `npm run accept`

| 項目 | 狀態 |
|------|------|
| 指令 | `npm run accept`（`scripts/acceptance-check.js`；內含 `native:check`） |
| 可自動項 | 關卡密度／教學弧／顏色可解、Day1 經濟常數、P0① 商店不白送、測 ID 廣告／Billing 配線、倒水中不插頁（源碼護欄） |
| 仍 Blocked | **P0②③**、真 `remove_ads` Billing／StoreKit（等 Play 帳號＋正式單元）— 套件標 **BLOCKED**，**不標 Pass** |
| 本輪結果 | 自動化檢查 **全綠**；閘門仍 **不過**（變現未解） |

自動化另含 **A11Y-COLOR**（Color assist CVD glyphs／Settings toggle／persist；源碼檢查）、**STUCK-DETECT**（卡死 toast Undo／Restart；無 soft-arm）、**RESTART-CONFIRM**（局中有進度 Restart 需兩次確認 toast；空盤一鍵；無 soft-arm CSS）、**LEAVE-RUN-CONFIRM**（放棄有進度 draft 進他關／Daily 需兩次確認 toast；同目標／空盤一鍵；無 soft-arm CSS）、**SHOP-SPEND-CONFIRM**（商店大額金幣消費 hints-pack／undo／theme 需兩次確認 toast；無 soft-arm CSS）、**BACK-NAV**（系統／瀏覽器返回：先關 levels／hint／shop／fail，局中再 pause 回 Home 保留 draft；無 soft-arm CSS）、**A11Y-ESC**（Escape 關 levels／hint／shop／fail；**win→Home**；不關 start）、**LEVELS-SCROLL**（openLevels 後 Continue／star-gap `scrollIntoView`）、**LEVELS-FOCUS**（`focusOverlayPrimary` 優先 Continue／star-gap 非 Close；關卡格 locked／play／stars `aria-label`）／**LEVELS-CHAPTER**（chapter prev/next；一章網格）／**LEVELS-KEYS**（Levels 網格方向鍵／Home／End＋章邊緣換章）／**A11Y-TRAP**（modal Tab／Shift+Tab 焦點陷阱；不陷阱 start）／**BOARD-KEYS**（局中彩管 Arrow／Home／End 幾何焦點導航；無 soft-arm）／**HUD-KEYS**（局中 u／h／r Undo／Hint／Restart；可選 l Levels；無 soft-arm）／**WIN-FAIL-KEYS**（通關 Enter／n Next、r Restart、h Home；失敗 Enter／h Hint、b Home；無 soft-arm）／**WIN-HOME**（通關 `#btn-win-home` Home＋click `hideWin`／`goHome`＋`h`；無 soft-arm）／**FAIL-HOME**（失敗 `#btn-fail-home`＋click `closeOverlay`／`goHome`；`h` 仍 Hint；無 soft-arm）／**FAIL-DISMISS**（`closeOverlay` 關 fail 清 `restartFailCount`；失敗 `b`→Home；無 soft-arm）／**POUR-UI-GUARD**（倒水中阻擋 `openShop`／`startDailyChallenge`；無 soft-arm）／**A11Y-POUR**（`prefers-reduced-motion` 跳過 pour stream／tilt／splash；仍 SFX＋haptic；無 soft-arm）／**A11Y-BURST**（reduced-motion 跳過 complete／uncap sparks＋screen-shake＋white flash；仍 SFX＋haptic；無 soft-arm）／**A11Y-WIN**（reduced-motion 跳過 celebrate cascade／showWin 480ms／star stagger；CSS hide `.confetti`；仍 SFX＋haptic；無 soft-arm）／**A11Y-SHAKE**（reduced-motion 跳過非法倒 `.invalid-shake`；仍 SFX＋haptic；無 soft-arm）／**SHARE-WIN**（通關 `#btn-win-share`；`navigator.share`／clipboard；無 soft-arm）／**WIN-SHARE-KEY**（通關 `s`／`S` → Share；無 soft-arm）／**FAIL-RESTART-KEY**（失敗 `r`／`R` → Keep restarting／`#btn-fail-skip`；無 soft-arm）／**WIN-SHOP-KEY**（通關 `o`／`O` → Shop／`openShop`；無 soft-arm）／**LEVELS-HOME-KEY**（Levels `h`／`H` → `#btn-levels-home`；無 soft-arm）／**LEVELS-CHAPTER-KEYS**（Levels `PageUp`／`[` 上一章、`PageDown`／`]` 下一章；無 soft-arm）／**SHARE-LANDING**（`docs/index.html` brand landing＋`docs/og.png`＋og:image；`buildWinShareText` github.io 根；無 soft-arm）／**STORE-TITLE-ALIGN**（Play lock title `ColorTube Sort: Lid Puzzle` on docs landing／OG／Twitter／h1＋`buildWinShareText`／`shareWinResult`＋index meta；HUD `.brand` 短名；無 soft-arm）／**A11Y-MOTION-PREF**（Settings Reduced motion toggle＋persist；`prefersReducedMotion` OR save；`html.reduced-motion`；RESET 保留；無 soft-arm）／**START-KEYS**（開始屏 Enter Play、d Daily、s Shop、l Levels；無 soft-arm）／**BRAND-FAVICON**（index.html icon＋apple-touch-icon；assets/icons PNG 存在）／**HINT-PAYWALL-KEYS**（提示付費牆 Enter arm→coins→ad；永不 pack；無 soft-arm）／**SHOP-KEYS**（商店 Enter `.shop-buy-arm`；SHOP-SPEND-CONFIRM 走既有 click；無 soft-arm）／**LEVELS-RUN-BADGE**（Levels 進行中 draft `.level-in-progress`＋`On` badge；靜態 cyan／無 soft-arm）／**START-RUN-RESUME**（開始屏 mid-run mainline → `Resume · Level N`＋`.play-in-progress` 靜態 cyan；無 soft-arm）／**DAILY-RUN-RESUME**（Daily mid-run → badge `On`＋`.daily-in-progress` 靜態 cyan；Done 優先；無 soft-arm）／**RESET-PROGRESS**（Settings Reset progress 兩次確認 toast；保留 Sound／Haptics／Color assist；清 draft＋bak；無 soft-arm）。P0②③ 仍 **Blocked**。


（已補）**Levels Home／章快捷鍵（LEVELS-HOME-KEY＋LEVELS-CHAPTER-KEYS）**已上 — `#levels-overlay` 顯示時 `h`／`H` → `#btn-levels-home`（既有 click → `closeLevels`＋`goHome`）；`PageUp`／`[` → `shiftLevelsChapter(-1)`、`PageDown`／`]` → `shiftLevelsChapter(1)`；`aria-keyshortcuts` 於 home／prev／next；另補 `#btn-win-home`=`h`、`#btn-fail-home`=`b` 對齊；網格 Arrow／Home／End 仍僅格內；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share landing（SHARE-LANDING）**已上 — `docs/index.html` EN brand landing（USP lid／uncap＋Privacy＋Coming soon on Google Play；OG／Twitter；`og:image` absolute github.io／og.png）；`docs/og.png`；修 Pages 根 404；Share URL 不變；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Store title align（STORE-TITLE-ALIGN）**已上 — Play lock title **ColorTube Sort: Lid Puzzle** 對齊 `docs/index.html` `<title>`／og:title／twitter:title／`<h1>`／footer／img alt；`buildWinShareText`／`shareWinResult` title／body；`index.html` `<title>`＋meta description（含 lid USP）；HUD `.brand` 維持短名 **ColorTube Sort**（避免 wrap）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

重跑：清乾淨 tree 後執行 `npm run accept`，exit 0 = 可自動項 Pass + Blocked 項如實列出。

---

## P0（一票否決）— ①–④ 對照

| ID | 檢查項 | 狀態 | 重現／備註 |
|----|--------|------|------------|
| **P0①** | 商店假 IAP | **Pass** | 點「去除廣告」→ toast「即將開放／需商店帳號」；`removeAds` 維持 false（除非 `localStorage.colorTubeSort_devIap=1`） |
| **P0②** | 真 AdMob／變現 SDK | **Blocked** | 仍 stub／`USE_TEST_ADS`；等出版社帳號＋正式單元。**不可標 Pass** |
| **P0③** | `?ad=1` 當廣告流 | **Blocked** | 僅 ad-capture 截圖模式，非廣告播放；等真 SDK 後另開驗收項。**不可當變現完成** |
| **P0④** | 跳關／開始鈕穿透 | **Pass** | 雙擊關卡標籤不跳關；開始畫面雙擊「開始遊戲」不誤觸開蓋 |

### 重驗證據（2026-09-18）

1. **① Pass**：清 localStorage → 商店 → 去除廣告 →「即將開放」，權益未變。  
2. **④ Pass**：關卡標籤連點雙擊仍停在關卡 1；重整後仍從 1 起。  
3. **④ Pass**：開始鈕快速雙擊正常進關，無「蓋子打開了」誤觸。  
4. **②③ Blocked**：未接真 SDK／帳號前維持阻擋，不重測為 Pass。

---

## 抽測（附帶，未翻盤閘門）

| ID | 檢查 | 狀態 |
|----|------|------|
| J-音效 | WebAudio pour／land／uncap／win 路徑 | **Pass**（實測有動畫／toast；工具無法聽音量） |
| C-蓋子密度 | L1–2 無蓋；L3 起有蓋；≤2／關；主線約 50% | **Pass** |
| C-揭蓋雙點 | 持液→有蓋＝shake＋「倒不進去」；無選取連點兩下揭蓋（不占步）；undo 復蓋 | **Pass**（本輪邏輯） |

---

## 仍開著（非本輪關單）

| ID | 檢查 | 狀態 | 備註 |
|----|------|------|------|
| M-1 | 真 AdMob rewarded + interstitial | **Blocked** | ＝P0② |
| M-2 | 真 `remove_ads` IAP | **Blocked** | 產品態「即將開放」直到 Billing／StoreKit |
| B-1 | 最終 icon 1024 + 商店截圖 | **Pass** | `store-assets/finals/` ICON A 1024＋Shot1–5 EN 齊（見 STORE_FINALS_GATE） |
| R-1 | 回流理由厚度 | **Pass** | Daily＋連勝里程碑 Day 3/7/14＋首達 3★＋chapter chest（PR #24） |

---

## Smoke（複驗手冊）

1. 清站內資料 → 商店去除廣告必須「即將開放」，重整後廣告路徑仍在。  
2. 關卡標籤雙擊無跳關；開始鈕雙擊無穿透開蓋。  
3. L1–2 無蓋；L3 有蓋＋教學（連點兩下揭蓋；持液點有蓋→「有蓋，倒不進去」）。  
4. DEV only：`localStorage.setItem('colorTubeSort_devIap','1')` 才可 mock 給獎；預設必須關。  
5. ②③：有出版社帳號＋真 SDK 憑證前，**維持 Blocked**。

**Suite：** ①④ Pass；②③ Blocked → **not ship-ready**。
