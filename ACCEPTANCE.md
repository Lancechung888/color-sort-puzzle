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
| 可自動項 | 關卡密度／教學弧／顏色可解／**L-SOLVE** 倒水路徑可解／**L-PAR** 顯式 par≥BFS opt、Day1 經濟常數、P0① 商店不白送、測 ID 廣告／Billing 配線、倒水中不插頁（源碼護欄） |
| 仍 Blocked | **P0②③**、真 `remove_ads` Billing／StoreKit（等 Play 帳號＋正式單元）— 套件標 **BLOCKED**，**不標 Pass** |
| 本輪結果 | 自動化檢查 **全綠**；閘門仍 **不過**（變現未解） |

自動化另含 **A11Y-COLOR**（Color assist CVD glyphs／Settings toggle／persist；源碼檢查）、**STUCK-DETECT**（卡死 toast Undo／Restart；無 soft-arm）、**RESTART-CONFIRM**（局中有進度 Restart 需兩次確認 toast；空盤一鍵；無 soft-arm CSS）、**LEAVE-RUN-CONFIRM**（放棄有進度 draft 進他關／Daily 需兩次確認 toast；同目標／空盤一鍵；無 soft-arm CSS）、**SHOP-SPEND-CONFIRM**（商店大額金幣消費 hints-pack／undo／theme 需兩次確認 toast；無 soft-arm CSS）、**BACK-NAV**（系統／瀏覽器返回：先關 levels／hint／shop／fail，局中再 pause 回 Home 保留 draft；無 soft-arm CSS）、**CAP-APP-BACK**（`@capacitor/app` ^6＋`bindSystemBack` `App.addListener(backButton)`；無 soft-arm）、**CAP-APP-STATE**（`App.addListener(appStateChange)` 背景 flush draft／clearPendingUncap／wake sync；無 soft-arm）、**ANDROID-TARGET-36**（compile／targetSdk 36＋`enableOnBackInvokedCallback`；無 soft-arm）／**ANDROID-BACK-INVOKED**／**ANDROID-WEBVIEW-OVERSCROLL**（`setOverScrollMode(OVER_SCROLL_NEVER)`；無 soft-arm）／**ANDROID-WEBVIEW-TEXT-ZOOM**（`setTextZoom(100)`；無 soft-arm）／**ANDROID-WEBVIEW-BG**（`setBackgroundColor(#1a1a2e)`；無 soft-arm）／**ANDROID-WEBVIEW-ZOOM-LOCK**（`setSupportZoom`／builtIn／display false；無 soft-arm）／**ANDROID-WEBVIEW-LONG-CLICK**（`setOnLongClickListener` consume＋`setLongClickable(false)`；無 soft-arm）／**ANDROID-WEBVIEW-HAPTIC-OFF**（`setHapticFeedbackEnabled(false)`；無 soft-arm）、**A11Y-ESC**（Escape 關 levels／hint／shop／fail；**win→Home**；不關 start）、**LEVELS-SCROLL**（openLevels 後 Continue／star-gap `scrollIntoView`）、**LEVELS-FOCUS**（`focusOverlayPrimary` 優先 Continue／star-gap 非 Close；關卡格 locked／play／stars `aria-label`）／**LEVELS-CHAPTER**（chapter prev/next；一章網格）／**LEVELS-KEYS**（Levels 網格方向鍵／Home／End＋章邊緣換章）／**A11Y-TRAP**（modal Tab／Shift+Tab 焦點陷阱；不陷阱 start）／**BOARD-KEYS**（局中彩管 Arrow／Home／End 幾何焦點導航；無 soft-arm）／**HUD-KEYS**（局中 u／h／r Undo／Hint／Restart；可選 l Levels；無 soft-arm）／**WIN-FAIL-KEYS**（通關 Enter／n Next、r Restart、h Home；失敗 Enter／h Hint、b Home；無 soft-arm）／**WIN-HOME**（通關 `#btn-win-home` Home＋click `hideWin`／`goHome`＋`h`；無 soft-arm）／**FAIL-HOME**（失敗 `#btn-fail-home`＋click `closeOverlay`／`goHome`；`h` 仍 Hint；無 soft-arm）／**FAIL-DISMISS**（`closeOverlay` 關 fail 清 `restartFailCount`；失敗 `b`→Home；無 soft-arm）／**POUR-UI-GUARD**（倒水中阻擋 `openShop`／`startDailyChallenge`；無 soft-arm）／**A11Y-POUR**（`prefers-reduced-motion` 跳過 pour stream／tilt／splash；仍 SFX＋haptic；無 soft-arm）／**A11Y-BURST**（reduced-motion 跳過 complete／uncap sparks＋screen-shake＋white flash；仍 SFX＋haptic；無 soft-arm）／**A11Y-WIN**（reduced-motion 跳過 celebrate cascade／showWin 480ms／star stagger；CSS hide `.confetti`；仍 SFX＋haptic；無 soft-arm）／**A11Y-SHAKE**（reduced-motion 跳過非法倒 `.invalid-shake`；仍 SFX＋haptic；無 soft-arm）／**SHARE-WIN**（通關 `#btn-win-share`；`navigator.share`／clipboard；無 soft-arm）／**WIN-SHARE-KEY**（通關 `s`／`S` → Share；無 soft-arm）／**FAIL-RESTART-KEY**（失敗 `r`／`R` → Keep restarting／`#btn-fail-skip`；無 soft-arm）／**WIN-SHOP-KEY**（通關 `o`／`O` → Shop／`openShop`；無 soft-arm）／**LEVELS-HOME-KEY**（Levels `h`／`H` → `#btn-levels-home`；無 soft-arm）／**LEVELS-CHAPTER-KEYS**（Levels `PageUp`／`[` 上一章、`PageDown`／`]` 下一章；無 soft-arm）／**SHARE-LANDING**（`docs/index.html` brand landing＋`docs/og.png`＋og:image；`buildWinShareText` github.io 根；無 soft-arm）／**STORE-TITLE-ALIGN**（Play lock title `ColorTube Sort: Lid Puzzle` on docs landing／OG／Twitter／h1＋`buildWinShareText`／`shareWinResult`＋index meta；HUD `.brand` 短名；無 soft-arm）／**WEB-MANIFEST**（`site.webmanifest`＋icons 192／512＋index／docs link；無 soft-arm）／**PWA-MASKABLE**（maskable icons＋orientation／categories＋apple status-bar；無 soft-arm）／**KEYSHORTCUTS-MARKUP**（start／HUD／win-fail `aria-keyshortcuts`；無 soft-arm）／**TOUCH-44**（`.btn-icon`／`.btn-home`／`.modal-close` ≥44×44；無 soft-arm）／**HUD-DAILY-KEY**（局中 `d`／`D` → `#btn-daily`；無 soft-arm）／**CLOSE-ESC-MARKUP**（Home／close `aria-keyshortcuts=Escape`；無 soft-arm）／**A11Y-MOTION-PREF**（Settings Reduced motion toggle＋persist；`prefersReducedMotion` OR save；`html.reduced-motion`；RESET 保留；無 soft-arm）／**START-KEYS**（開始屏 Enter Play、d Daily、s Shop、l Levels；無 soft-arm）／**BRAND-FAVICON**（index.html icon＋apple-touch-icon；assets/icons PNG 存在）／**HINT-PAYWALL-KEYS**（提示付費牆 Enter arm→coins→ad；永不 pack；無 soft-arm）／**SHOP-KEYS**（商店 Enter `.shop-buy-arm`；SHOP-SPEND-CONFIRM 走既有 click；無 soft-arm）／**LEVELS-RUN-BADGE**（Levels 進行中 draft `.level-in-progress`＋`On` badge；靜態 cyan／無 soft-arm）／**START-RUN-RESUME**（開始屏 mid-run mainline → `Resume · Level N`＋`.play-in-progress` 靜態 cyan；無 soft-arm）／**DAILY-RUN-RESUME**（Daily mid-run → badge `On`＋`.daily-in-progress` 靜態 cyan；Done 優先；無 soft-arm）／**RESET-PROGRESS**（Settings Reset progress 兩次確認 toast；保留 Sound／Haptics／Color assist；清 draft＋bak；無 soft-arm）／**SAVE-BACKUP**（Settings Backup Export／Import；Import 兩次確認 toast；progress_export／progress_import；無 soft-arm）／**A11Y-ZOOM**（viewport 移除 maximum-scale=1／user-scalable=no；保留 viewport-fit=cover；允許 pinch／瀏覽器縮放；無 soft-arm）、**HOW-TO-PLAY**（Settings How to play＋`?` 快捷鍵 toast；howto tip；無 soft-arm）、**HAPTICS-KEY**（`v`／`V` 切換 Haptics＋toast；`#btn-toggle-haptics` aria-keyshortcuts=v；無 soft-arm）。P0②③ 仍 **Blocked**。

（已補）**L-SOLVE**已上 — `scripts/solve-levels.js` 倒水路徑可解性（free uncap；與 `game.js` pour／win 約定一致）納入 `npm run accept`；修 L47／L68／L70 死關（補空管緩衝）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#4 維持 Pass；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**Levels Home／章快捷鍵（LEVELS-HOME-KEY＋LEVELS-CHAPTER-KEYS）**已上 — `#levels-overlay` 顯示時 `h`／`H` → `#btn-levels-home`（既有 click → `closeLevels`＋`goHome`）；`PageUp`／`[` → `shiftLevelsChapter(-1)`、`PageDown`／`]` → `shiftLevelsChapter(1)`；`aria-keyshortcuts` 於 home／prev／next；另補 `#btn-win-home`=`h`、`#btn-fail-home`=`b` 對齊；網格 Arrow／Home／End 仍僅格內；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share landing（SHARE-LANDING）**已上 — `docs/index.html` EN brand landing（USP lid／uncap＋Privacy＋Coming soon on Google Play；OG／Twitter；`og:image` absolute github.io／og.png）；`docs/og.png`；修 Pages 根 404；Share URL 不變；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Store title align（STORE-TITLE-ALIGN）**已上 — Play lock title **ColorTube Sort: Lid Puzzle** 對齊 `docs/index.html` `<title>`／og:title／twitter:title／`<h1>`／footer／img alt；`buildWinShareText`／`shareWinResult` title／body；`index.html` `<title>`＋meta description（含 lid USP）；HUD `.brand` 維持短名 **ColorTube Sort**（避免 wrap）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**Web manifest＋鍵盤 aria（WEB-MANIFEST＋KEYSHORTCUTS-MARKUP）**已上 — 根／`docs/` `site.webmanifest`（name **ColorTube Sort: Lid Puzzle**、standalone、theme `#1a1a2e`）＋ICON A 192／512；`index.html`／`docs/index.html` `rel=manifest`；`sync-www.sh` 複製 manifest；既有快捷鍵控點補 `aria-keyshortcuts`（start Enter／d／l／s；HUD u／h／r／l／s；win Enter n／r；fail Enter h）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA maskable＋manifest richer（PWA-MASKABLE）**已上 — `icon-maskable-192/512`（assets／docs；ICON A 置中於 ~80% safe zone、底 `#1a1a2e`）；根／`docs/` `site.webmanifest` 加 `purpose: maskable`＋`orientation: portrait-primary`＋`categories: ["games","puzzle"]`；`index.html`／`docs/index.html` `apple-mobile-web-app-status-bar-style=black-translucent`；`sync-www` 仍複製 assets＋manifest；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**觸控 44＋局中 Daily 鍵＋Close Escape aria（TOUCH-44＋HUD-DAILY-KEY＋CLOSE-ESC-MARKUP）**已上 — `.btn-icon`／`.btn-home`／`.modal-close` ≥44×44；局中 `d`／`D` → `#btn-daily.click`；`aria-keyshortcuts` on `#btn-daily`＝`d`＋Home／shop／hint／levels close＝`Escape`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**A11Y-ZOOM**已上 — 根／`docs/` viewport 移除 `maximum-scale=1`／`user-scalable=no`，保留 `width=device-width, initial-scale=1, viewport-fit=cover`；`.tubes-wrap` 加 `touch-action: manipulation`（防誤觸雙擊縮放，不擋 overlay 捲動）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**How to play＋? 快捷鍵表（HOW-TO-PLAY）**已上 — Settings「How to play」`#btn-how-to-play` 關商店後重開 `#onboarding-tip`（pour＋gold lids；`activeTipKind='howto'` dismiss 只隱藏、不誤清 teach flags）；鍵盤 `?`／Shift+/ 短 toast 列快捷鍵（~4.8s）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Mute 快捷鍵（MUTE-KEY）**已上 — 全域 `m`／`M` → `toggleSfxKey`（`sfxOn`＋toast Sound on／off）＋`#btn-toggle-sfx` `aria-keyshortcuts=m`；`?` 表含 Mute m；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Haptics 快捷鍵（HAPTICS-KEY）**已上 — 全域 `v`／`V` → `toggleHapticsKey`（`hapticsOn`＋toast Haptics on／off）＋`#btn-toggle-haptics` `aria-keyshortcuts=v`；`?` 表含 Haptics v；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Color assist 快捷鍵（COLOR-ASSIST-KEY）**已上 — 全域 `c`／`C` → `toggleColorAssistKey`（`colorAssist`＋toast Color assist on／off）＋`#btn-toggle-color-assist` `aria-keyshortcuts=c`；`?` 表含 Color assist c；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Reduced motion 快捷鍵（MOTION-KEY）**已上 — 全域 `x`／`X` → `toggleReducedMotionKey`（`reducedMotion`＋toast Reduced motion on／off）＋`#btn-toggle-reduced-motion` `aria-keyshortcuts=x`；`?` 表含 Reduced motion x；Settings 點擊改走 `applyReducedMotionOn`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA offline（PWA-OFFLINE）**已上 — 根 `sw.js`（`colortube-offline-v1`；precache index／manifest／css／game scripts／icons／audio）＋playable `index.html` `serviceWorker.register`；`sync-www.sh` 複製 `sw.js`→`www/`（docs 為 brand landing，不註冊）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA update（PWA-UPDATE）**已上 — `sw.js` bump `colortube-offline-v2`；`/assets/` **stale-while-revalidate**（cache hit 仍 background fetch＋`cache.put`）＋`SKIP_WAITING` message；playable `index.html` `updatefound`／`controllerchange` toast「Update ready — tap to refresh」→ tap reload；`sync-www`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share play demo（SHARE-PLAY-DEMO）**已上 — `docs/play/` 由 `sync-www.sh` 從根 playable 同步（index／assets／sw／manifest；`start_url` `./`）；landing 主 CTA **Play free in browser** → `play/`；brand `docs/index.html` 不註冊 SW；Privacy＋Coming soon 保留；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share play URL（SHARE-PLAY-URL）**已上 — 通關 Share／clipboard／`navigator.share` url 指向 `…/color-sort-puzzle/play/` 可玩 demo（非 brand landing 根）；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#6 維持 Pass（有機分享落地可玩）；#1／#3／#9 仍 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share play OG（SHARE-PLAY-OG）**已上 — 可玩 `index.html`／`docs/play/` Open Graph＋Twitter（`og:url` → `/play/`、`og:image` → `og.png`）；通關 Share 社群預覽；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**L-PAR**已上 — 全關顯式 `par`；Day1 BFS `par≥opt`；L79／L80 深度≥12（實測 30／29）；修早期 3★ 不可能；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#4 維持 Pass；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**


（已補）**WAKE-LOCK**已上 — Screen Wake Lock 局中防休眠＋Settings Keep screen on（預設 On；Reset 保留）；accept `WAKE-LOCK`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；P0②③ 仍 Blocked。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**KEEP-AWAKE-KEY**已上 — 全域 `k`／`K` 切換 Keep screen on＋toast；`#btn-toggle-keep-awake` `aria-keyshortcuts=k`；`?` 表含 Keep screen on k；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。




（已補）**LEAVE-TAB-GUARD**已上 — `beforeunload` 有進度 draft 時警告關頁／重整（同 leave-run progress 判定）；flush persist；無進度不臂；accept `LEAVE-TAB-GUARD`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**SAFE-AREA-LR**已上 — `--safe-left`／`--safe-right`＋`#app` 水平 safe padding；overlay／toast 水平 inset；accept `SAFE-AREA-LR`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**SAFE-AREA-TB**已上 — `.overlay` 四邊 safe padding（`--safe-top`／`--safe-bot`＋左右）；accept `SAFE-AREA-TB`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**ANDROID-PORTRAIT**已上 — 本機 `AndroidManifest` MainActivity `android:screenOrientation="portrait"`（`android/` gitignore；`scripts/patch-android-portrait.sh`＋`aab:internal` 冪等補丁；web 既有 `orientation: portrait-primary`）；accept `ANDROID-PORTRAIT`；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**ANDROID-KEEP-AWAKE**已上 — Capacitor WebView 常缺 `navigator.wakeLock`；`scripts/patch-android-keep-awake.sh` 冪等寫入 MainActivity `FLAG_KEEP_SCREEN_ON`＋`ColorTubeNative.setKeepScreenOn`；`aab:internal` hook；JS `syncNativeKeepScreenOn` 對齊 Settings Keep screen on；accept `ANDROID-KEEP-AWAKE`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-SYSTEM-BARS**已上 — Capacitor indigo 系統列改 brand dark `#1a1a2e`；`scripts/patch-android-system-bars.sh`＋`aab:internal`；accept `ANDROID-SYSTEM-BARS`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-SPLASH-THEME**已上 — API 31+ `SplashScreen.installSplashScreen(this)` 於 `super.onCreate` 前＋`AppTheme.NoActionBarLaunch` `windowSplashScreenBackground`／`postSplashScreenTheme`→`AppTheme.NoActionBar`；`scripts/patch-android-splash-theme.sh`＋keep-awake 模板＋`aab:internal`；accept `ANDROID-SPLASH-THEME`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-NO-BACKUP**已上 — Capacitor 預設 `allowBackup=true` 無規則；OS Auto Backup／device-transfer 可能還原 WebView localStorage 成壞檔。改 `allowBackup=false`＋`fullBackupContent=@xml/backup_rules`＋`dataExtractionRules` 拒絕 cloud-backup／device-transfer；進度備份走 Settings Backup Export／Import（`SAVE-BACKUP`）；`scripts/patch-android-no-backup.sh`＋`aab:internal`；accept `ANDROID-NO-BACKUP`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-CLEARTEXT**已上 — 拒絕 cleartext HTTP：`usesCleartextTraffic=false`＋`networkSecurityConfig=@xml/network_security_config`（`cleartextTrafficPermitted=false`；AdMob／Billing／Capacitor HTTPS）；`scripts/patch-android-cleartext.sh`＋`aab:internal`；accept `ANDROID-CLEARTEXT`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-RESIZE**已上 — MainActivity `android:resizeableActivity="false"`（`android/` gitignore；`scripts/patch-android-resize.sh`＋`aab:internal` 冪等補丁）；accept `ANDROID-RESIZE`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-SOFT-INPUT**已上 — MainActivity `android:windowSoftInputMode="adjustNothing"`（軟鍵盤開啟時不壓縮直立 tube WebView；`android/` 仍 gitignore）；`scripts/patch-android-soft-input.sh`＋`aab:internal` hook；accept `ANDROID-SOFT-INPUT`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-IS-GAME**已上 — `<application>` `android:isGame="true"`＋`android:appCategory="game"`（OS／Game Dashboard 辨識 hybrid-casual 為遊戲；`android/` 仍 gitignore）；`scripts/patch-android-is-game.sh`＋`aab:internal` hook；accept `ANDROID-IS-GAME`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-FORCE-DARK**已上 — `<application>`＋themes `android:forceDarkAllowed="false"`（拒絕 Force Dark 改寫 brand-dark UI；`android/` gitignore）；`scripts/patch-android-force-dark.sh`＋`aab:internal` hook；accept `ANDROID-FORCE-DARK`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-CONFIG-CHANGES**已上 — MainActivity `configChanges` 補 **density**／**fontScale**／**layoutDirection**／**colorMode**（避免顯示大小／字級／RTL／色彩模式中途重建 WebView、丟局中倒水狀態；`android/` 仍 gitignore）；`scripts/patch-android-config-changes.sh`＋`aab:internal` hook（force-dark 之後）＋`native-templates/android/README.md` §2l；accept `ANDROID-CONFIG-CHANGES`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-CUTOUT**已上 — themes `android:windowLayoutInDisplayCutoutMode=shortEdges`（notch／cutout 下 WebView 可畫進安全區外、SAFE-AREA CSS insets 非零；`android/` gitignore）；`scripts/patch-android-cutout.sh`＋`aab:internal` hook（config-changes 之後）＋`native-templates/android/README.md` §2m；accept `ANDROID-CUTOUT`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**CAP-APP-BACK**已上 — `@capacitor/app` ^6.0.3 入 `package.json` dependencies（Capacitor 6）；`game.js` `bindSystemBack` 既有 `App.addListener('backButton')`；本機 `cap sync` 註冊 plugin（`android/` gitignore）；accept `CAP-APP-BACK`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**CAP-APP-STATE**已上 — `@capacitor/app`（既有 ^6）`App.addListener('appStateChange')`：背景 `clearPendingUncap`＋mid-run `persistRunDraft`／`persist`＋釋 wake／`syncNativeKeepScreenOn(false)`；回前景 `requestScreenWakeLock`＋`syncNativeKeepScreenOn(save.keepAwake !== false)`（visibilitychange alone 在部分 Android WebView 不可靠）；`bindAppState` 與 `bindSystemBack` 同 init；accept `CAP-APP-STATE`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**


（已補）**ANDROID-TARGET-36**已上 — `compileSdkVersion`／`targetSdkVersion`→**36**＋`<application>` `android:enableOnBackInvokedCallback="true"`（predictive back；`android/` gitignore）；`scripts/patch-android-target-sdk.sh`＋`aab:internal` hook（cutout 之後）＋`native-templates/android/README.md` §2n；accept `ANDROID-TARGET-36`／`ANDROID-BACK-INVOKED`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-OVERSCROLL**已上 — `MainActivity` `webView.setOverScrollMode(View.OVER_SCROLL_NEVER)`（拒絕 WebView glow／rubber-band；搭配 CSS `overscroll-behavior: none`；`android/` gitignore）；`scripts/patch-android-webview-overscroll.sh`＋`aab:internal` hook（target-sdk 之後）＋`native-templates/android/README.md` §2o；accept `ANDROID-WEBVIEW-OVERSCROLL`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-TEXT-ZOOM**已上 — `MainActivity` `webView.getSettings().setTextZoom(100)`（拒絕系統 Font／Display size 經 `WebSettings` textZoom 縮放管板／HUD CSS；`configChanges` 含 `fontScale` 僅防 Activity recreate；`android/` 仍 gitignore）；`scripts/patch-android-webview-text-zoom.sh`＋`aab:internal` hook（webview-overscroll 之後、icons 之前）＋`native-templates/android/README.md` §2p；accept `ANDROID-WEBVIEW-TEXT-ZOOM`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-BG**已上 — `MainActivity` `webView.setBackgroundColor(Color.parseColor("#1a1a2e"))`（冷啟／splash 交接不閃白；搭配 ANDROID-SPLASH-THEME＋ANDROID-SYSTEM-BARS；`android/` 仍 gitignore）；`scripts/patch-android-webview-bg.sh`＋`aab:internal` hook（text-zoom 之後、icons 之前）＋`native-templates/android/README.md` §2q；Capacitor `backgroundColor` 僅輔助、MainActivity 為 source of truth；accept `ANDROID-WEBVIEW-BG`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-ZOOM-LOCK**已上 — `MainActivity` `webView.getSettings().setSupportZoom(false)`＋`setBuiltInZoomControls(false)`＋`setDisplayZoomControls(false)`（拒絕原生 WebView 手勢縮放打爆直立管板；瀏覽器／PWA **A11Y-ZOOM** 仍可 pinch；異於 TEXT-ZOOM 的系統字級；`android/` 仍 gitignore）；`scripts/patch-android-webview-zoom-lock.sh`＋`aab:internal` hook（bg 之後、icons 之前）＋`native-templates/android/README.md` §2r；accept `ANDROID-WEBVIEW-ZOOM-LOCK`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-LONG-CLICK**已上 — `MainActivity` `webView.setOnLongClickListener(v -> true)`＋`setLongClickable(false)`（拒絕原生 WebView 長按 ActionMode／context menu Copy／Share／Web Search 疊中局；CSS `user-select:none` 不足；`android/` 仍 gitignore）；`scripts/patch-android-webview-long-click.sh`＋`aab:internal` hook（zoom-lock 之後、icons 之前）＋`native-templates/android/README.md` §2s；accept `ANDROID-WEBVIEW-LONG-CLICK`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-HAPTIC-OFF**已上 — `MainActivity` `webView.setHapticFeedbackEnabled(false)`（拒絕 Android View 系統 haptic／`View.performHapticFeedback` 搶中局；異於 LONG-CLICK 的 ActionMode，遊戲 `haptic()`／Capacitor Haptics 仍經 JS 開啟；`android/` 仍 gitignore）；`scripts/patch-android-webview-haptic-off.sh`＋`aab:internal` hook（long-click 之後、icons 之前）＋`native-templates/android/README.md` §2t；accept `ANDROID-WEBVIEW-HAPTIC-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-SCROLLBARS**已上 — `MainActivity` `webView.setVerticalScrollBarEnabled(false)`＋`setHorizontalScrollBarEnabled(false)`（Levels grid／Shop modal 原生 WebView scrollbar chrome 隱藏；scrolling 仍可用；異於 OVERSCROLL 的 glow／rubber-band；CSS 另隱藏 `.levels-grid`／`.modal-shop` scrollbar）；`scripts/patch-android-webview-scrollbars.sh`＋`aab:internal` hook（haptic-off 之後、icons 之前）＋`native-templates/android/README.md` §2u；accept `ANDROID-WEBVIEW-SCROLLBARS`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-SOUND-EFFECTS-OFF**已上 — `MainActivity` `webView.setSoundEffectsEnabled(false)`（拒絕 Android View 系統 click sound／`View.playSoundEffect` 搶中局；異於 HAPTIC-OFF 的系統震動，遊戲 `playSfx()`／WebAudio 仍經 JS／Settings Sound 開啟；`android/` 仍 gitignore）；`scripts/patch-android-webview-sound-effects-off.sh`＋`aab:internal` hook（scrollbars 之後、icons 之前）＋`native-templates/android/README.md` §2v；accept `ANDROID-WEBVIEW-SOUND-EFFECTS-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-WEBVIEW-MEDIA-GESTURE**已上 — `MainActivity` `webView.getSettings().setMediaPlaybackRequiresUserGesture(false)`（允許 HTMLAudioElement／`playSfx` 中局 SFX 不被 WebView 預設 sticky gesture 閘住；異於 SOUND-EFFECTS-OFF 的系統 click sound 拒絕，此項是 *允許* 意圖性 HTML media；`android/` 仍 gitignore）；`scripts/patch-android-webview-media-gesture.sh`＋`aab:internal` hook（sound-effects-off 之後、icons 之前）＋`native-templates/android/README.md` §2w；accept `ANDROID-WEBVIEW-MEDIA-GESTURE`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**







（已補）**ANDROID-WEBVIEW-MIXED-CONTENT**已上 — `MainActivity` `webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)`（拒絕 HTTPS Capacitor origin 載入 cleartext 子資源；搭配 ANDROID-CLEARTEXT；`android/` 仍 gitignore）；`scripts/patch-android-webview-mixed-content.sh`＋`aab:internal` hook（media-gesture 之後、icons 之前）＋`native-templates/android/README.md` §2x；accept `ANDROID-WEBVIEW-MIXED-CONTENT`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
重跑：清乾淨 tree 後執行 `npm run accept`，exit 0 = 可自動項 Pass + Blocked 項如實列出。

---

（已補）**ANDROID-WEBVIEW-GEOLOCATION-OFF**已上 — `MainActivity` `webView.getSettings().setGeolocationEnabled(false)`（拒絕 WebView 地理位置；不收集位置；`android/` 仍 gitignore）；還原 keep-awake 模板缺漏 sound-effects／media-gesture 實行行；`scripts/patch-android-webview-geolocation-off.sh`＋`aab:internal` hook（mixed-content 之後、icons 之前）＋`native-templates/android/README.md` §2y；accept `ANDROID-WEBVIEW-GEOLOCATION-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-FILE-ACCESS-OFF**已上 — `MainActivity` `setAllowFileAccess(false)`＋`setAllowFileAccessFromFileURLs(false)`＋`setAllowUniversalAccessFromFileURLs(false)`（拒絕 WebView `file://`／file-URL 存取；Capacitor 走 https://localhost，不需 WebView filesystem；不碰 `setAllowContentAccess`；`android/` 仍 gitignore）；`scripts/patch-android-webview-file-access-off.sh`＋`aab:internal` hook（geolocation-off 之後、icons 之前）＋`native-templates/android/README.md` §2z；accept `ANDROID-WEBVIEW-FILE-ACCESS-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-JS-WINDOWS-OFF**已上 — `MainActivity` `setSupportMultipleWindows(false)`＋`setJavaScriptCanOpenWindowsAutomatically(false)`（拒絕 WebView 多視窗／JS 彈窗；單 WebView 遊戲；不關 JavaScript；不碰 DomStorage／content access／cookies；`android/` 仍 gitignore）；`scripts/patch-android-webview-js-windows-off.sh`＋`aab:internal` hook（file-access-off 之後、icons 之前）＋`native-templates/android/README.md` §2aa；accept `ANDROID-WEBVIEW-JS-WINDOWS-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-SAFE-BROWSING**已上 — `MainActivity` `setSafeBrowsingEnabled(true)`（啟用 WebView Safe Browsing；阻擋釣魚／已知惡意 URL；不關 JavaScript；不碰 DomStorage／content access／cookies；`android/` 仍 gitignore）；`scripts/patch-android-webview-safe-browsing.sh`＋`aab:internal` hook（js-windows-off 之後、icons 之前）＋`native-templates/android/README.md` §2ab；accept `ANDROID-WEBVIEW-SAFE-BROWSING`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-DATABASE-OFF**已上 — `MainActivity` `setDatabaseEnabled(false)`（拒絕 Web SQL／WebDatabase；DomStorage／localStorage 維持；不碰 cookies／content access／JavaScript；異於 SAFE-BROWSING；`android/` 仍 gitignore）；`scripts/patch-android-webview-database-off.sh`＋`aab:internal` hook（safe-browsing 之後、icons 之前）＋`native-templates/android/README.md` §2ac；accept `ANDROID-WEBVIEW-DATABASE-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF**已上 — `MainActivity` API 33+ `setAlgorithmicDarkeningAllowed(false)`（拒絕 WebView 演算法變暗；異於 ANDROID-FORCE-DARK 的 theme／application attribute；保護 brand-dark `#1a1a2e`；不碰 DomStorage／cookies／content access／JavaScript；`android/` 仍 gitignore）；`scripts/patch-android-webview-algorithmic-dark-off.sh`＋`aab:internal` hook（database-off 之後、icons 之前）＋`native-templates/android/README.md` §2ad；accept `ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-DEBUG-OFF**已上 — `MainActivity` `WebView.setWebContentsDebuggingEnabled(false)`（拒絕 Chrome remote WebView debugging／`chrome://inspect`；靜態 class call、一律 false；異於 SAFE-BROWSING 與 ALGORITHMIC-DARK-OFF；不關 JavaScript；不碰 DomStorage／cookies／content access／AdMob；`android/` 仍 gitignore）；`scripts/patch-android-webview-debug-off.sh`＋`aab:internal` hook（algorithmic-dark-off 之後、icons 之前）＋`native-templates/android/README.md` §2ae；accept `ANDROID-WEBVIEW-DEBUG-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-DOM-STORAGE-ON**已上 — `MainActivity` `setDomStorageEnabled(true)`（明確啟用 DomStorage／localStorage，避免 OEM 預設翻轉導致存檔靜默失效；異於 DATABASE-OFF 拒絕 Web SQL——DomStorage 必須維持 ON；不啟用 Web SQL；不碰 cookies／content access／JavaScript／AdMob；`android/` 仍 gitignore）；`scripts/patch-android-webview-dom-storage-on.sh`＋`aab:internal` hook（debug-off 之後、icons 之前）＋`native-templates/android/README.md` §2af；accept `ANDROID-WEBVIEW-DOM-STORAGE-ON`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-AUTOFILL-OFF**已上 — `MainActivity` API 26+ `setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO)`（拒絕 Autofill 橫幅／焦點搶中局；異於 LONG-CLICK 的 ActionMode 與 HAPTIC-OFF 的系統震動；不碰 DomStorage／cookies／content access／JavaScript／AdMob；`android/` 仍 gitignore）；`scripts/patch-android-webview-autofill-off.sh`＋`aab:internal` hook（dom-storage-on 之後、icons 之前）＋`native-templates/android/README.md` §2ag；accept `ANDROID-WEBVIEW-AUTOFILL-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF**已上 — `MainActivity` `CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)`（拒絕第三方 cookies；第一方／DomStorage 維持；對齊 Data Safety／隱私；異於 CLEARTEXT／MIXED-CONTENT／AUTOFILL；`android/` 仍 gitignore）；`scripts/patch-android-webview-third-party-cookies-off.sh`＋`aab:internal` hook（autofill-off 之後、icons 之前）＋`native-templates/android/README.md` §2ah；accept `ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

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
