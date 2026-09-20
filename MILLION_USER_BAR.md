# 百萬用戶品質槓桿 · Million-User Quality Bar

> **這不是軟上架清單。**  
> Soft-launch checklist 一律不適用。未全過 = **不准上架**（Play / App Store 皆同）。  
> 「百萬下載」另需買量預算；**產品側不承諾自然百萬**。

對齊標竿：榜上第一梯隊 hybrid-casual（水管／顏色排序類頭部體驗），不是「能玩就先丟」。

---

## 產品必須達到（對齊榜上第一梯隊 hybrid-casual）

每項 **Pass / Fail**。任一 Fail → 閘門關閉。

### 1. 3秒內看懂＋想點 · Instant clarity
**EN:** Icon / first screen / core action readable in ≤3s.

| 條件 | Pass 標準 |
|------|-----------|
| Icon | 遠距可辨「彩管／倒水」，非泛用拼圖圖示 |
| 首屏 | 開始遊戲後 ≤3s 理解「點管→倒水」；無需長文教學 |
| 核心動作 | 第一次合法倒水有明顯成功感（視覺＋聽覺至少其一） |

**Fail：** 首屏像工具頁、icon 無記憶、要讀說明才懂玩法。

### 2. 獨特記憶點貫穿主線 · Signature mechanic sticks
**EN:** Cap (or equivalent USP) in ≥60% of mainline levels — not tutorial-only.

| 條件 | Pass 標準 |
|------|-----------|
| 貫穿率 | 蓋子管出現在主線 **40–60%**（accepted density lock；非教學限定） |
| 教學後 | L1–2 無蓋；L3 教蓋；之後貫穿且連續無蓋 **≤3**；單關 ≤2 蓋 |
| 可感知 | 玩家複述「這款跟別的水管不一樣」時能講出該點 |

**Fail：** USP 只活在教學弧；主線變回純 clone；或密度偏離 40–60% / 連續無蓋過長。

### 3. 倒水手感可拍廣告 · Pour feel = 15s ad juice
**EN:** SFX + haptic-grade feedback (WebAudio OK); juice worthy of a 15s UA creative.

| 條件 | Pass 標準 |
|------|-----------|
| 音效 | 倒水／落底／整管完成／過關 — WebAudio 可；不可靜音手感 |
| 觸覺 | 實機 vibrate / Capacitor Haptics 級反饋（至少完成管、非法點） |
| Juice | 飛濺、流線、完成光、輕震動達「可剪 15s 投放素材」 |

**Fail：** 只有 CSS 晃一下、無聲、無觸覺；素材拍出來像原型。

### 4. 關卡深度與曲線 · Depth & difficulty hypothesis
**EN:** ≥80 levels (or equivalent depth); data-backed curve hypothesis; no obvious dead levels.

| 條件 | Pass 標準 |
|------|-----------|
| 體量 | **≥80 關** 或等價深度（模組變體＋可驗證生成） |
| 曲線假說 | 書面難度假說（顏色數／容量／蓋子密度／步數預算）且可對照實測 |
| 死關 | 無明顯無解／必靠撤銷才能過的關；生成關需可解驗證 |

**Fail：** ~40 關就結尾；曲線只有「越後面越多色」而無假說；存在死關。

### 5. Day1 不傷好感 · Day-1 goodwill
**EN:** First 15 levels not paywall-heavy; fail wall ≥3; economy doesn’t sour goodwill.

| 條件 | Pass 標準 |
|------|-----------|
| 前 15 關 | 不逼氪、不連續插頁打斷；提示／廣告皆可選 |
| 失敗牆 | 前段（index &lt; 10）軟性失敗門檻 **≥3**；L11+ 可降為 **2**（accepted tiered wall） |
| 經濟 | 金幣／提示節奏不讓正常玩家感覺「被榨」 |

**Fail：** 早期硬牆、失敗 2 次就強推去廣告／永久去廣告。

### 6. Meta 有理由回來 · Meta that pulls return
**EN:** Daily challenge / streak / 3★ replay must be real return reasons.

| 條件 | Pass 標準 |
|------|-----------|
| 今日挑戰 | 與主線有差異感（難度／種子／獎勵），非換皮同一關 |
| 連勝 | 斷簽有損失感或回來有明確獎勵，非純數字裝飾 |
| 三星複刷 | 複刷有明確回報（金幣／解鎖／排行敘事），玩家說得出「為什麼再打」 |

**Fail：** UI 有按鈕但獎勵／差異可忽略；複刷無意義。

### 7. 變現真接線 · Real AdMob + remove_ads IAP
**EN:** Live AdMob + real remove_ads IAP wired; never interrupt mid-pour (test IDs OK).

| 條件 | Pass 標準 |
|------|-----------|
| AdMob | 實機 rewarded + interstitial 走 SDK（可用官方測試 ID） |
| IAP | `remove_ads` 真 Billing／StoreKit，成功後持久化並跳過插頁 |
| 護欄 | **倒水過程絕不彈廣告**；獎勵廣告永遠可選 |

**Fail：** `mockIapPurchase`／console stub／套件未進依賴就當「已接好」。

### 8. 品牌達投放級 · Brand store-ready
**EN:** Final name, icon, five store shots at UA / listing quality.

| 條件 | Pass 標準 |
|------|-----------|
| 定名 | 商店名鎖定（繁中＋EN），無「暫定／ColorTube 隨便叫」 |
| Icon | 1024 投放級；縮圖可辨 USP |
| 五圖 | ≥5 張商店截圖／特徵圖達競品投放水準（非開發截圖） |

**Fail：** 只有 ASO 文案、無正式 icon／截圖資產。

### 9. 穩定 · Stability gate
**EN:** No P0 crashes; ACCEPTANCE suite all green.

| 條件 | Pass 標準 |
|------|-----------|
| P0 | 無啟動崩、存檔毀、倒水卡死、購買後狀態錯亂 |
| ACCEPTANCE | 倉庫內 ACCEPTANCE 清單／腳本 **全過**（含核心規則、蓋子、廣告護欄、存檔） |

**Fail：** 無 ACCEPTANCE；或已知 P0 未關。

---

## 上架閘門 · Store gate

1. **上述 1–9 必須全部 Pass**，缺一不准送審／不准公開上架。  
2. **禁止 soft-launch「先丟再修」** — 軟上架話術不降低本槓桿。  
3. **百萬下載 ≠ 產品自然發生**：另需買量預算與素材；產品側 **不承諾** 自然百萬。通過本槓桿只代表「產品有資格被買量放大」，不是下載保證。  
4. 測試 ID／`USE_TEST_ADS` 僅允許在通過閘門後的內部包；**公開正式包**須切正式單元與正式 IAP。

---

## 現況評分 · Honest draft score (post Meta + Haptics + `npm run accept`)

依目前程式／資產閱讀（非願望清單）。**禁止 soft-launch**；**不宣稱 ship-ready**。

| # | 項目 | 結果 | 現況依據（代碼事實） |
|---|------|------|----------------------|
| 1 | 3秒看懂＋想點 | **Partial** | 開始屏 `.start-hook`＋短 lead；ICON A 1024（**原生 launcher／splash 已套 finals**，非 Capacitor 預設）；**首倒成功拍**；**選管後合法目標管 `.pour-target` 脈衝高亮**（持液即知往哪倒）；**非法倒水原因 toast**（`Tube full`／`Colors don't match`，蓋管另 toast）；**start-hook USP twist**（金蓋擋倒 → `Blocked` badge＋shake → uncap → pour → sorted；lead「Gold lids block pours — uncap, then sort.」；`prefers-reduced-motion` 靜態蓋＋badge）；**Continue · Level N** start primary CTA（`#btn-start.play-continue` soft warm gold/peach pulse ~1.6s＋once-per-session soft arm haptic/SFX；fresh → Play；loads labeled level；`prefers-reduced-motion` 靜態）；**Levels continue soft-arm**（`#levels-overlay` 當前／frontier `.level-cell.level-continue-arm` warm gold/peach pulse ~1.55s＋`Go` badge＋once-per-open `haptic('arm')`／`SFX.tap` @300ms；daily 時退回 frontier；關 overlay 清 timer；`prefers-reduced-motion` 靜態金邊）。**仍缺**外部「想點」/首 3s 競品對照實測 → 維持 Partial，未標 Pass |
| 2 | USP 貫穿（40–60% lock） | **Pass** | **80** 關；有蓋 **43/80 = 53.8%**；連續無蓋 ≤3；L1–2 零蓋；L3 teach；單關 ≤2 蓋（15 關曾 3–4 蓋已夾回；幽靈 `modules:cap` 補成真蓋；`L-CAPS-MAX` 恢復 ≤2） |
| 3 | 倒水手感／15s 廣告 | **Partial** | WebAudio（pour/land/complete/uncap/win）＋**Capacitor Haptics**＋vibrate fallback；開蓋 flip＋火花；stream 對準目標口＋land 觸覺；dest fill-rise；**complete-tube 同色 rim burst**（`.complete-spark`）；**select tap＋haptic**；**first-pour-of-level**（`.first-pour-glow`＋`haptic('firstPour')`＋加濃 splash）；**first-uncap-of-level**（`.first-uncap-glow` warmer gold/peach lid+glass ~420ms＋denser uncap sparks ~20＋`haptic('firstUncap')` MEDIUM+SUCCESS／vibrate ~20ms；undo re-lid 不重觸發；`prefers-reduced-motion` 靜態暖光、無火花／無 flip 誇張）；**蓋子首點 arm**（`.lid-arm-nudge`＋`haptic('arm')`／`SFX.tap`，不再誤觸 illegal）；**undo soft tap/haptic**；**通關 filled-tube cascade**（`celebrateLevelClear` stagger `glowPulse` ~55ms＋輕 `haptic('complete')`，再延 480ms `showWin`；無雙倍 confetti）；**near-complete mono-tube beckon**（`.near-complete` soft rim/glass glow ~1.9s，差一格同色滿管；`prefers-reduced-motion` 靜態光）；**completing-pour anticipatory juice**（`.completing-pour` rim/glass glow during ~380ms pour＋denser splash ~26＋`haptic('landComplete')` slightly firmer land vibrate；post-land `complete` burst/haptic unchanged）；**3★ perfect-clear 簽名汁**（標題 Perfect!、`.win-stars.perfect` 金光、`.perfect-spark` 金 rim burst、金偏 confetti、`haptic('perfect')` HEAVY+SUCCESS；1–2★ 維持原 win；`prefers-reduced-motion` 靜態金光）；**winning-pour anticipatory juice**（通關倒水：`#app.winning-pour` 暖金 board rim glow ~380ms＋denser splash ~32＋短金 rim sparkle＋`haptic('winPour')`；可與 `.completing-pour` 疊層；`prefers-reduced-motion` 靜態光、無 sparkle）；**chapter-chest claim juice**（`tryClaimChapterChest` 非空時：`.modal-win.chest-claim` 暖琥珀 rim/glow＋`#win-chest` 橫幅＋`.chest-spark` amber/gold coin burst＋`haptic('chest')` MEDIUM+SUCCESS／vibrate ~26ms 第二拍；不雙加幣；`prefers-reduced-motion` 靜態琥珀光、無粒子）；**first-3★ mastery claim juice**（`masteryBonus > 0`：`.modal-win.mastery-claim` soft gold/lavender rim＋`#win-mastery` EN banner「First 3★! +N coins」＋`.mastery-spark` cool gold/lavender burst ~13＋`haptic('mastery')` MEDIUM+SUCCESS／vibrate ~26ms；banner 為主、不重複 `#win-meta` First 3★ 喊；可與 chest 同場；daily 無此路徑；不雙加幣；`prefers-reduced-motion` 靜態光、無粒子）；**daily first-clear claim juice**（`dailyFirstClear`：`.modal-win.daily-claim` sky/cyan rim＋`#win-daily` EN banner「Daily first clear! +N coins」＋`.daily-spark` sky/cyan burst ~13＋`haptic('daily')` MEDIUM+SUCCESS／vibrate ~26ms；不雙加幣（+40 仍走既有 `coins += DAILY_FIRST_CLEAR_BONUS`）；`prefers-reduced-motion` 靜態青光、無粒子）；**login streak milestone claim juice**（Days 3/7/14：`pendingStreakMilestone` → `#start-streak-claim` EN banner「{label}! +N coins」＋hints＋`.modal-premium.streak-claim` coral/flame rim＋`.streak-spark` coral/flame burst ~13＋`haptic('streak')` MEDIUM+SUCCESS／vibrate ~26ms；可選 `#streak-display.streak-pulse`；banner 為主、清掉里程碑 toast 重複喊；幣／提示仍只走既有 `claimStreakMilestones`；`prefers-reduced-motion` 靜態珊瑚光、無粒子）；**theme unlock claim juice**（`unlockTheme`：`#shop-theme-claim` EN banner「Theme unlocked: {name}」＋`.modal-shop.theme-claim` violet/magenta rim＋`.theme-spark` ~13＋`haptic('theme')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.theme-unlock-pulse`；banner 為主、無 toast 重複；不雙加幣；關商店／再開清掉；`prefers-reduced-motion` 靜態紫光、無粒子）；**hint-reveal juice**（`applyHint` 成功：`.hint-dest`／`.hint-uncap` mint rim＋加長 pulse ~1.05s＋`.hint-spark` mint/lime ~11＋`haptic('hint')` LIGHT+SUCCESS／vibrate ~12ms＋`SFX.tap`；toast 維持；`prefers-reduced-motion` 靜態 mint 光、無粒子）；**hint-pack purchase claim juice**（商店 Hint pack ×5：`#shop-hints-claim` EN banner「Hint pack ×5! · coins/cash」＋`.modal-shop.hints-claim` emerald/jade rim＋`.hints-spark` ~13＋`haptic('hintsPack')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.hints-pack-pulse`；banner 為主、無 toast 重複；不雙加 hint；與 theme claim 互斥；`prefers-reduced-motion` 靜態翡翠光、無粒子）；**unlimited-undo (this level) claim juice**（`UNDO_LEVEL_COIN_COST=80` 金幣路徑＋IAP stub；`#shop-undo-claim` EN banner「Unlimited undo · this level! · coins/cash」＋`.modal-shop.undo-claim` indigo/periwinkle rim＋`.undo-spark` ~13＋`haptic('undoPack')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.undo-level-pulse`；banner 為主、無 toast 重複；不雙開 flag；與 theme／hints claim 互斥；`prefers-reduced-motion` 靜態靛光、無粒子）；**HUD coin-earn pulse**（`addCoins(n>0)` → `#coin-display.coin-earn` gold scale/glow ~0.55s＋`.coin-earn-float` EN `+N` rise ~0.7s＋`haptic('coins')` LIGHT+SUCCESS／vibrate ~14ms＋`SFX.tap`；不雙加幣、無 toast；`prefers-reduced-motion` 靜態金邊＋靜態 `+N`）；**HUD coin-spend pulse**（`spendCoins` → `#coin-display.coin-spend`／`.chip-coins.coin-spend` rose scale-down ~0.5s＋`.coin-spend-float` EN `-N` rise ~0.7s＋`haptic('coinSpend')` LIGHT／vibrate ~12ms＋`SFX.tap`；不雙扣幣；`prefers-reduced-motion` 靜態玫瑰邊＋靜態 `-N`）；**HUD free-hints chip**（`#hint-display.chip-hints`＋`.hint-earn`／`.hint-spend` float ±N＋`haptic('hints'|'hintSpend')`＋`SFX.tap`；`prefers-reduced-motion` 靜態）；**star-track drop visual juice**（掉離 3★／2★ 軌：`#moves-label.track-drop` rose/amber pulse ~0.6s＋`.track-drop-float` EN `Off 3★`／`Off 2★`＋`haptic('starDrop')` LIGHT／vibrate ~14ms＋`SFX.tap`；一關一次；`prefers-reduced-motion` 靜態色邊＋靜態字）；**star-track recover visual juice**（undo／步數預算回到 3★／2★：`#moves-label.track-recover` mint/emerald pulse ~0.6s＋`.track-recover-float` EN `Back on 3★`／`Back on 2★`＋`haptic('starRecover')` LIGHT+SUCCESS／vibrate ~14ms＋`SFX.tap`；回復後重開 drop 警告臂；`prefers-reduced-motion` 靜態薄荷邊＋靜態字）；**Shop Settings Sound／Haptics toggles**（`sfxOn`／`hapticsOn` persist；gate `playSfx`／`haptic`；EN On/Off）；**new-best star-improve claim juice**（mainline `stars > prev` 且非 first-time 3★：`.modal-win.new-best-claim` soft mint/emerald rim＋`#win-new-best` EN banner「New best! N★」＋`.new-best-spark` mint burst ~12＋`haptic('newBest')` MEDIUM+SUCCESS／vibrate ~24ms @ ~220ms；不與 mastery 同場；daily／無進步重打不觸發；視覺／觸覺 only、不雙加幣；`prefers-reduced-motion` 靜態薄荷光、無粒子）；**new-level-unlock claim juice**（mainline frontier clear：`prevMax` 前進且下一關存在：`.modal-win.unlock-claim` soft warm gold/peach rim＋`#win-unlock` EN banner「Level N unlocked!」＋`.unlock-spark` warm gold/peach burst ~11＋`haptic('unlock')` MEDIUM+SUCCESS／vibrate ~24ms @ ~220ms（chest/mastery 同場則 stagger）；可與 mastery／chest／perfect 同場；daily／已解鎖重打永不；視覺／觸覺 only、不雙加幣；`#btn-next` →「Play Level N」＋`.next-unlock-arm` ~1.2s；`prefers-reduced-motion` 靜態暖金光、無粒子）；**fail-hint-arm**（Stuck? 主 CTA `#btn-fail-hint.fail-hint-arm` soft mint/emerald pulse ~1.5s＋once-per-open `haptic('arm')`／`SFX.tap` ~300ms；`.modal-fail.fail-recover` soft mint rim；關 overlay 清 class；`prefers-reduced-motion` 靜態 mint 邊、無 pulse）；**hint-paywall soft-arm**（`requestHint` → `#hint-paywall`：coins≥`HINT_COIN_COST` 臂 `#btn-hint-coins.hint-pay-arm`，否則 `#btn-hint-ad.hint-pay-arm`；不臂 `#btn-hint-pack`；mint/emerald pulse ~1.5s＋once-per-open `haptic('arm')`／`SFX.tap` @300ms；`.modal.hint-pay-recover` soft mint rim；關 overlay 清 class／timer；`prefers-reduced-motion` 靜態 mint 邊、無 pulse）；**win-replay-arm**（mainline 1–2★ `#btn-win-restart` →「Replay for 3★」＋`.win-replay-arm` warm gold/peach pulse ~1.5s＋once-per-open `haptic('arm')`／`SFX.tap` @300ms when `!newlyUnlocked`；`.modal-win.replay-nudge` soft rim；unlock 時仍優先 `#btn-next.next-unlock-arm`、Restart 僅改文案不 soft-arm；關 win 清 class／timer／文案；`prefers-reduced-motion` 靜態暖金邊、無 pulse）；**shop-buy-arm**（`openShop`：優先低 freeHints→`#btn-buy-hints-coins`，否則 `#btn-buy-undo-coins`，否則 hint pack 囤積，否則最便宜未解鎖 theme 金幣鈕；`.shop-buy-arm` warm gold/peach pulse ~1.5s＋`.modal-shop.shop-buy-nudge`＋once-per-open `haptic('arm')`／`SFX.tap` @300ms；永不臂 Coming soon／remove-ads／cash IAP；關店清 class／timer；`prefers-reduced-motion` 靜態暖金邊、無 pulse）；**hud-hint-arm**／**hud-undo-arm**（★-track drop 3★→≤2★／2★→1★：prefer `#btn-hint.hud-hint-arm` soft mint/emerald ~1.5s when `freeHints≥1`；else `#btn-undo.hud-undo-arm` warm rose/amber track-drop pulse ~1.5s when undo available（`history.length>0`、not disabled）；互斥永不雙臂；tie to `starDropHapticFired` once-per-drop；recover 清臂可再臂；once-per-arm `haptic('arm')`／`SFX.tap` @300ms（不雙發 starDrop）；blocking overlay 不臂；hint／undo click／applyHint／paywall／loadLevel／overlay 清；`prefers-reduced-motion` 靜態 mint 或 rose/amber 邊、無 pulse）；**levels-star-gap-arm**（`#levels-overlay`：Continue 已 3★ 且 focus chapter 仍有 unlocked incomplete-★ → 臂第一缺星 `.level-cell.level-star-gap-arm` soft mint/lavender pulse ~1.55s＋`3★` badge＋`aria-label`「Replay for 3★ — Level N」；否則維持 `.level-continue-arm`＋`Go`；永不雙臂／不臂 locked／perfect；once-per-open `haptic('arm')`／`SFX.tap` @300ms；關 overlay 清 timer；`prefers-reduced-motion` 靜態 mint/lavender 邊）。仍缺實機 15s UA 剪輯驗證 → 維持 Partial，未標 Pass |
| 4 | ≥80 關＋曲線假說 | **Pass** | **80** 關；DESIGN 載明顏色／蓋密度曲線；生成＝reverse-scramble（可解建構）＋applyCaps；**L-PAR** 全關顯式 `par`（BFS／啟發式最短倒水＋Day1 +1／後期 ~+10% 寬限，永不 `par < opt`）；修 L1／L2／L4–L7 原 3★ 數學不可能；重做 L79／L80（原 1 步假終關 → 深度 ≥29） |
| 5 | Day1 不傷好感 | **Pass** | `START_COINS=120`、`freeHints=3`、`HINT=25`、星獎 8/15/28；失敗牆 index&lt;15 → **5**、L16+ → **2**；**fail-loop 表單 hint-first（keeps board）**— 主 CTA `#btn-fail-hint` 給當前盤面提示，廣告重開為次要 |
| 6 | Meta 回來理由 | **Pass** | Daily **非換皮**：進度自適應底關＋**日期種子 color remap**（`permuteDailyColors`，保可解 multiset）＋**layout shuffle**（`shuffleDailyLayout`）＋擁擠蓋（≥3，Pressure 寬盤可 4）＋twist 檔 **Crowded／Remixed／Pressure**（par ×1.15／1.2／1.25）＋HUD `Daily · {twist}`＋首清 +40；連勝里程碑 Day **3/7/14**（幣＋提示）＋下一里程碑 HUD／首屏；首達 3★ **+22**；每 10 關全 3★ chapter chest（+80🪙＋1 hint）；關卡選單顯示缺星＋獎勵預告；**局中 status bar 即時 Moves/Par/★ 預算投影**；**Daily ready CTA juice**（ready/done；reduced-motion static）。`D-DIFF` accept 驗證 remix ≠ base；**局中 Levels／Home 導航**（`#level-label` → Levels；`#btn-home` → start，不清存檔；無 soft-arm）；**Share-on-win**（`#btn-win-share` Web Share／clipboard；有機分享；無 soft-arm） |
| 7 | 真 AdMob＋remove_ads | **Fail** | AdMob **已**進 npm 依賴（`@capacitor-community/admob`）＋測單元／`USE_TEST_ADS` 已配線；Manifest `APPLICATION_ID` 可由 `scripts/patch-android-admob.sh` 補上。仍 **Fail** 直至實機 SDK 廣告驗證＋真 `remove_ads` IAP（Play 過審後）。商店「去除廣告」→ **即將開放**，**不會**假授 `removeAds`（DEV flag 預設 OFF） |
| 8 | 品牌投放級 | **Pass** | 定名 ColorTube Sort；`store-assets/finals/` 齊 **ICON A 1024**＋Shot1–5 EN（見 STORE_FINALS_GATE）；ZH 次要。投放素材迭代另凍結（無預算）≠ 缺資產 |
| 9 | 穩定／ACCEPTANCE | **Partial** | `npm run accept` 自動化 **全綠**（關卡／經濟／P0①／測 ID 配線／倒水護欄／**SAVE-RECOVER**／**A11Y-TUBE**／**A11Y-ESC**（含 Escape win→Home）／**A11Y-FOCUS**／**A11Y-DIALOG**／**A11Y-TOAST**／**A11Y-HUD**／**A11Y-COLOR**／**SAVE-SANITIZE**／**NAV-LEVELS**／**NAV-HOME**／**RUN-RESUME**／**STUCK-DETECT**／**RESTART-CONFIRM**／**LEAVE-RUN-CONFIRM**／**SHOP-SPEND-CONFIRM**／**BACK-NAV**／**LEVELS-SCROLL**／**LEVELS-FOCUS**／**LEVELS-CHAPTER**／**LEVELS-KEYS**（Levels grid arrow/Home/End＋chapter-edge browse）／**A11Y-TRAP**（modal Tab 焦點陷阱）／**BOARD-KEYS**（局中彩管 Arrow／Home／End 幾何焦點導航）／**HUD-KEYS**（局中 u／h／r Undo／Hint／Restart）／**WIN-FAIL-KEYS**（通關 Enter／n Next、r Restart、h Home；失敗 Enter／h Hint、b Home）／**WIN-HOME**（`#btn-win-home`＋click／`h`→Home；無 soft-arm）／**FAIL-HOME**（失敗 `#btn-fail-home`＋click close／`goHome`；`h` 仍 Hint；無 soft-arm）／**FAIL-DISMISS**（`closeOverlay` 關 fail 清 `restartFailCount`；失敗 `b`→Home；無 soft-arm）／**POUR-UI-GUARD**（倒水中阻擋 `openShop`／`startDailyChallenge`；無 soft-arm）／**A11Y-POUR**（`prefersReducedMotion` 跳過 pour stream／tilt／splash；spawnSplash／sparkle 護欄；CSS hide；仍 SFX＋haptic；無 soft-arm）／**A11Y-BURST**（`prefersReducedMotion` 跳過 complete／uncap sparks＋`lightScreenShake`＋`flashCompleteWhite`；CSS hide；仍 SFX＋haptic；無 soft-arm）／**A11Y-WIN**（`celebrateLevelClear` early haptic；`showWin` delay 0 vs 480；stars `.lit` immediate；CSS hide `.confetti`；仍 SFX＋haptic；無 soft-arm）／**A11Y-SHAKE**（`shakeTube` reduced-motion 跳過 `.invalid-shake`；仍 SFX＋haptic；無 soft-arm）／**SHARE-WIN**（通關 `#btn-win-share` Web Share／clipboard；無 soft-arm）／**START-KEYS**（開始屏 Enter Play、d Daily、s Shop）／**HINT-PAYWALL-KEYS**（提示付費牆 Enter arm→coins→ad；永不 pack）／**SHOP-KEYS**（商店 Enter `.shop-buy-arm`；SHOP-SPEND-CONFIRM 走 click）／**LEVELS-RUN-BADGE**（Levels 進行中 draft `.level-in-progress`＋`On`；靜態無 soft-arm）／**START-RUN-RESUME**（開始屏 `Resume · Level N`＋`.play-in-progress` 靜態）／**DAILY-RUN-RESUME**（Daily `On`＋`.daily-in-progress` 靜態；Done 優先）／**RESET-PROGRESS**／**SAVE-BACKUP**（Settings Reset 兩次確認 toast；保留 Sound／Haptics／Color assist；清 draft＋bak；無 soft-arm）／**A11Y-ZOOM**（viewport 允許 pinch／瀏覽器縮放；無 maximum-scale=1／user-scalable=no；viewport-fit=cover；無 soft-arm）／**HOW-TO-PLAY**（Settings How to play＋`?` toast；無 soft-arm）／**MUTE-KEY**（`m`／`M` 切換 Sound＋toast；無 soft-arm）／**HAPTICS-KEY**（`v`／`V` 切換 Haptics＋toast；無 soft-arm）／**COLOR-ASSIST-KEY**（`c`／`C` 切換 Color assist＋toast；無 soft-arm）／**MOTION-KEY**（`x`／`X` 切換 Reduced motion＋toast；無 soft-arm）／**PWA-OFFLINE**（`sw.js` colortube-offline-v2＋index register＋sync-www；無 soft-arm）／**PWA-UPDATE**（assets SWR＋Update ready toast；無 soft-arm））；**存檔** `sanitizeSave`＋`v2_bak`／legacy fallback＋quota retry；**鍵盤** tube Tab／Enter／Space＋Escape dismiss＋overlay focus restore＋**toast `aria-live=polite`**＋**HUD/chip `:focus-visible`＋aria-label**＋hide clears pending uncap；**Color assist**（CVD glyphs／Settings toggle／persist）；**局中 run draft resume**（`colorTubeSort_run_v1`：tubes/caps/moves/history/infiniteUndo；validate capacity＋tube count＋color multiset；clear on win／restart／cold load；**Home 保留 draft（pause）**＋flush；visibilitychange／pagehide flush；corrupt → discard）；**卡死偵測**（`isBoardStuck`：無合法倒＋無蓋可揭 → 一次 toast「No moves left — Undo/Restart」＋`board_stuck`；無 soft-arm）已上；**Restart 兩次確認**（局中 `moves>0`／history → toast「Tap Restart again to confirm」～2s；空盤一鍵；無 soft-arm CSS；`RESTART-CONFIRM`）已上；**leave-run 兩次確認**（Levels／Daily／Continue 放棄他關有進度 draft → toast「Tap again to leave {Level N|Daily}」～2s；同目標／空盤一鍵；無 soft-arm CSS；`LEAVE-RUN-CONFIRM`）已上；**商店大額金幣消費兩次確認**（undo 80／hint-pack 120／theme 280 → toast「Tap again to spend N🪙」～2s；無 soft-arm CSS；`SHOP-SPEND-CONFIRM`）已上；**系統／瀏覽器返回**（`handleSystemBack`／`BACK-NAV`：overlay 先關 → 局中 pause Home 保留 draft）已上；**Escape win→Home**（`A11Y-ESC` 與 BACK-NAV 對齊）＋**Levels Continue／star-gap `scrollIntoView`**（`LEVELS-SCROLL`）＋**Levels focus／cell aria-labels**（`LEVELS-FOCUS`）已上；**Levels chapter prev/next browse**（`LEVELS-CHAPTER`：一章 10 關網格＋可回顧早章 ★／chest）已上；**Levels grid keyboard arrow／Home／End**（`LEVELS-KEYS`：方向鍵跳格＋章邊緣 `shiftLevelsChapter` first/last）已上；**overlay Tab focus trap**（`A11Y-TRAP`：`trapOverlayTab`＋`overlayFocusables`；hint/shop/fail/levels/win；不陷阱 start；無 soft-arm）已上；**局中彩管 Arrow／Home／End**（`BOARD-KEYS`：`handleTubesBoardKeydown`＋`getBoundingClientRect` 鄰居；Home／End 首／末管；overlay／start 時不導航；無 soft-arm）已上；**局中 HUD 快捷鍵**（`HUD-KEYS`：`handleHudKeys` u／h／r → Undo／Hint／Restart，可選 l → Levels；start／modal overlay 時忽略；無 soft-arm）已上；**通關／失敗 overlay 快捷鍵**（`WIN-FAIL-KEYS`：`handleWinFailKeys` win Enter／n → Next、r → Restart；fail Enter／h → Hint；Escape 仍關／回 Home；無 soft-arm）已上；**開始／提示付費牆／商店快捷鍵**（`START-KEYS`／`HINT-PAYWALL-KEYS`／`SHOP-KEYS`：start Enter／d／s；hint Enter arm→coins→ad；shop Enter `.shop-buy-arm`；無 soft-arm）已上 — **仍差 P0②③** → 維持 Partial，未標 Pass；無已知 P0 崩 |

**總評：** **5 Pass / 3 Partial / 1 Fail** → 閘門仍關閉。Meta＋品牌 finals 已 Pass；手感／首屏（已加 start-hook，仍 Partial）／ACCEPTANCE 自動化為 Partial；**真變現（#7）** 仍是唯一 Fail。**不宣稱 ship-ready。**

---

## 下一刀 Top gaps（仍禁止 soft-launch）

（已補）**L-SOLVE**已上 — accept 倒水路徑可解驗證（free uncap；修 L47／L68／L70 死關補空管）；#4 維持 Pass（無明顯死關）；**無** soft-arm；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**局中 Levels／Home 導航**已上 — 修復進關後無法開 Levels／回 Home 斷 3★ mastery 路徑；#6 維持 Pass。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**局中 board resume**已上 — kill／refresh／background 後 Continue／Play Level N／Daily 可還原 tubes／caps／moves／undo history（validate 失敗則 discard）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Color assist（CVD）**已上 — Settings 第三開關 `colorAssist`（預設 Off）＋液層穩定 glyph／可選 hatch＋tube aria 色 token；`prefers-reduced-motion` 仍顯示；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Home 保留局中 draft**已上 — `goHome` 改 `persistRunDraft`（pause 回開始屏），Continue／Play Level N／Daily 可經 `tryResumeOrLoad` 續玩；Restart／通關／cold load 仍清 draft；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**卡死盤面偵測**已上 — 倒水／揭蓋／撤銷後若無合法倒且無蓋可揭，一次 toast Undo／Restart（有 history 優先 Undo）；`board_stuck` 分析；**無** soft-arm／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**局中 Restart 兩次確認**已上 — 有進度（moves／history）先 toast「Tap Restart again to confirm」～2s，再點才重開；空盤維持一鍵（fail-loop mash）；fail／win 直接 `doRestartLevel` 不經確認；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**系統／瀏覽器返回（BACK-NAV）**已上 — `handleSystemBack`：levels／hint／shop／fail 先關；win → Home；局中先清選取／揭蓋臂再 `goHome`（保留 draft）；start 允許離開；`history.pushState`＋`popstate`（可選 Capacitor App.backButton）；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**商店大額金幣消費兩次確認**已上 — soft-arm 的 hints-pack（120）／undo（80）／theme（280）金幣 CTA 先 toast「Tap again to spend N🪙」～2s，再點才扣幣；小額 hint 25🪙 不需確認；關店／換關清 pending；**無** soft-arm CSS／pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Escape win→Home ＋ Levels scroll**已上 — Escape 在 win overlay 時 `hideWin`＋`goHome`（與 BACK-NAV 對齊；不關 start）；`openLevels` 後將 `.level-continue-arm`／`.level-star-gap-arm` `scrollIntoView`（reduced-motion → auto）；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Levels focus ＋ cell aria-labels**已上 — `focusOverlayPrimary` 開 Levels 時優先 Continue／star-gap（否則第一未鎖格），不再落在 Close；關卡格補 locked／play／N of 3 stars `aria-label`＋裝飾 `aria-hidden`；`LEVELS-FOCUS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Levels chapter prev/next browse**已上 — 一章一頁（CHAPTER_SIZE）；Prev／Next 回顧早章 ★ mastery／chest；開 overlay 預設 Continue 所在章；`LEVELS-CHAPTER` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Overlay Tab focus trap**已上 — 開 levels／shop／hint／fail／win 時 Tab／Shift+Tab 只在 overlay 內循環（`overlayFocusables`＋`trapOverlayTab`）；不陷阱 start；`A11Y-TRAP` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Levels grid keyboard arrow／Home／End**已上 — `#levels-grid` 方向鍵在 `.level-cell` 間移動（跳過 disabled）；左緣／右緣換章並 focus last／first unlocked；Home／End 到首／末未鎖格；`LEVELS-KEYS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**局中彩管 board Arrow／Home／End**已上 — `#tubes-wrap` 方向鍵依幾何鄰居移動 focus（flex-wrap）；Home／End 首／末管；start／modal overlay 開啟時不導航；`BOARD-KEYS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**局中 HUD 快捷鍵（HUD-KEYS）**已上 — 局中 `u`／`h`／`r` → Undo／Hint／Restart（`RESTART-CONFIRM` 兩次確認仍適用）；可選 `l` → Levels；start／modal overlay／input 時忽略；`HUD-KEYS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**通關／失敗 overlay 快捷鍵（WIN-FAIL-KEYS）**已上 — 通關 `#win-overlay`：`Enter`／`n` → Next（`#btn-next`）、`r` → Restart（`hideWin`＋`doRestartLevel`）；失敗 `#fail-prompt`：`Enter`／`h` → `#btn-fail-hint`、`b` → Home；Escape 維持關／回 Home；input／modifier 守衛；`WIN-FAIL-KEYS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**開始／提示付費牆／商店快捷鍵（START-KEYS＋HINT-PAYWALL-KEYS＋SHOP-KEYS）**已上 — 開始屏 `Enter` Play／`d` Daily／`s` Shop／`l` Levels（無其他 modal）；`#hint-paywall` `Enter` → `.hint-pay-arm`→`#btn-hint-coins`→`#btn-hint-ad`（永不 pack）；`#shop-overlay` `Enter` → `.shop-buy-arm`（可見＋enabled；SHOP-SPEND-CONFIRM 走既有 click）；局中可選 `s`→Shop；`START-KEYS`／`HINT-PAYWALL-KEYS`／`SHOP-KEYS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Levels mid-run draft badge**已上 — `renderLevelsGrid` peek `readRunDraft`／`draftHasProgress`，非 daily 且章內已解鎖關標 `.level-in-progress`＋`On` badge＋aria「in progress」；靜態 cyan/teal rim（可與 Continue／star-gap 共存）；`html, body { overscroll-behavior: none }` 降 pull-to-refresh 殺局；`LEVELS-RUN-BADGE` accept；**無** soft-arm／pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**開始屏 mid-run resume cues**已上 — mainline draft → `#btn-start` `Resume · Level N`＋`.play-in-progress` 靜態 cyan（`startGame` 對齊 draft index，免兩次 leave-confirm）；今日 Daily draft → badge `On`＋`.daily-in-progress` 靜態 cyan（Done 優先）；`START-RUN-RESUME`／`DAILY-RUN-RESUME` accept；**無** soft-arm／pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Settings Reset progress**已上 — 商店 Settings「Reset」兩次確認 toast「Tap again to reset all progress」～2s；清 levels／coins／streak／themes／draft／bak／legacy，保留 Sound／Haptics／Color assist；`RESET-PROGRESS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**開始屏 l → Levels（START-LEVELS-KEY）**已上 — `handleStartKeys`：`l`／`L` → `#btn-start-levels` click（同 Enter／d／s 守衛：start 顯示且無 levels／hint／shop／fail／win）；`START-KEYS` accept 含 Levels；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Brand favicon（BRAND-FAVICON）**已上 — ICON A → `assets/icons/favicon-32.png`（32×32）＋`apple-touch-icon.png`（180×180）；`index.html` `<link rel="icon">`＋`apple-touch-icon`；`BRAND-FAVICON` accept；**無** soft-arm；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Win Home（WIN-HOME）**已上 — 通關 overlay `#btn-win-home`（Restart／Shop 旁）＋click `hideWin`／`goHome`＋win `h`／`H`（與 Escape／BACK-NAV 對齊）；`#coin-count` FOUC 70→120；`WIN-HOME` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Fail Home（FAIL-HOME）**已上 — 失敗 overlay `#btn-fail-home`＋click `closeOverlay`／`goHome`（清 `restartFailCount`）；`h`／Enter 仍 Hint；行動裝置離開 fail-loop 不靠 soft-arm；`FAIL-HOME` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**倒水中 UI 護欄（POUR-UI-GUARD）**已上 — `openShop`／`startDailyChallenge` 頂部 `if (pouring) return`（對齊 goHome／Levels／Hint／Undo／HUD keys）；擋 `#btn-shop`／`#coin-display`／`s`／`#btn-daily` 中途開店／開 Daily；`POUR-UI-GUARD` accept；**無** soft-arm；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。
（已補）**Fail dismiss 重置（FAIL-DISMISS）＋Fail Home 鍵（FAIL-HOME-KEY）**已上 — `closeOverlay(failPrompt)`（含 Escape／系統返回）清 `restartFailCount`，避免關 sheet 後 Restart 立刻再開 Stuck?；失敗 overlay `b`／`B` → `#btn-fail-home`（`h`／Enter 仍 Hint）；`FAIL-DISMISS` accept；**無** soft-arm CSS；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。
（已補）**倒水 reduced-motion（A11Y-POUR／POUR-REDUCED）**已上 — `animatePour` 在 `prefersReducedMotion()` 下跳過 pour-stream／pouring-tilt／completing-pour／winning-pour 動效與 `spawnSplash`／`spawnWinPourSparkle`，~60ms 完成並保留 SFX.pour／land＋haptic；`spawnSplash`／sparkle 雙重護欄；CSS `@media (prefers-reduced-motion: reduce)` hide `.pour-stream`／`.splash-particle`＋neutralize `.tube.pouring-tilt`；`A11Y-POUR` accept；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。
（已補）**完成／揭蓋 burst reduced-motion（A11Y-BURST）**已上 — `spawnCompleteBurst`／`spawnUncapBurst`／`lightScreenShake`／`flashCompleteWhite` 在 `prefersReducedMotion()` 下 early-return；CSS hide `.complete-spark`／`.uncap-spark`＋neutralize `#app.screen-shake`／`.tube.completePop`／`.complete-flash`；仍保留 SFX.complete＋haptic；`A11Y-BURST` accept；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。
（已補）**通關 win reduced-motion（A11Y-WIN）**已上 — `celebrateLevelClear` 在 `prefersReducedMotion()` 下僅 `haptic('complete')`（跳過 cascade `glowPulse`）；`setTimeout(showWin, prefersReducedMotion() ? 0 : 480)`；`showWin` star 立即 `.lit`（無 `starPop`／`perfect-pop` stagger；`spawnPerfectBurst`／`spawnConfetti` 既有 gate）；CSS hide `.confetti`＋neutralize `.star.starPop`；`A11Y-WIN` accept；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。
（已補）**非法倒 shake reduced-motion（A11Y-SHAKE）**已上 — `shakeTube` 在 `prefersReducedMotion()` 下僅 `SFX.illegal`＋`haptic('illegal')`（跳過 `.invalid-shake`）；CSS `@media (prefers-reduced-motion: reduce)` → `.tube.invalid-shake { animation: none }`；`A11Y-SHAKE` accept；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share-on-win（SHARE-WIN）**已上 — 通關 overlay `#btn-win-share`；`navigator.share` 優先、clipboard fallback toast「Copied — paste to share」；主線／Daily EN 文案＋USP＋GitHub Pages URL；`share_win` 分析；**無** soft-arm／claim-juice／HUD pulse；#6 維持 Pass（有機分享）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**通關 Share 快捷鍵（WIN-SHARE-KEY）**已上 — `#win-overlay` 顯示時 `s`／`S` → `shareWinResult`（`#btn-win-share` 存在且未 disabled／hidden）；`aria-keyshortcuts="s"`；與 SHARE-WIN 鍵盤對齊；input／modifier 守衛沿用 `handleWinFailKeys`；**無** soft-arm／claim-juice／HUD pulse；#6 維持 Pass。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Settings Reduced motion（A11Y-MOTION-PREF）**已上 — 商店 Settings「Reduced motion」開關（預設 Off）persist 如 Sound／Haptics／Color assist；`prefersReducedMotion()` 為 `save.reducedMotion === true` **或** OS `prefers-reduced-motion`；`html.reduced-motion` class 給 CSS；Reset 保留；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**失敗 Keep restarting 快捷鍵（FAIL-RESTART-KEY）**已上 — `#fail-prompt` 顯示時 `r`／`R` → `#btn-fail-skip`（Keep restarting；既有 click → `doRestartLevel`）；`aria-keyshortcuts="r"`；與通關 `r` → Restart 對齊；consume event 避免 HUD Restart 雙觸；input／modifier 守衛沿用 `handleWinFailKeys`；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**通關 Shop 快捷鍵（WIN-SHOP-KEY）**已上 — `#win-overlay` 顯示時 `o`／`O` → `openShop()`（`#btn-win-shop` 存在且未 disabled／hidden；**不**先 `hideWin`）；`aria-keyshortcuts="o"`＋`aria-label="Shop"`；與 WIN-SHARE-KEY 鍵盤對齊；input／modifier 守衛沿用 `handleWinFailKeys`；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Levels Home／章快捷鍵（LEVELS-HOME-KEY＋LEVELS-CHAPTER-KEYS）**已上 — `#levels-overlay` 顯示時 `h`／`H` → `#btn-levels-home.click`（`closeLevels`＋`goHome`）；`PageUp`／`[` → `shiftLevelsChapter(-1)`、`PageDown`／`]` → `(+1)`；`aria-keyshortcuts` on `#btn-levels-home`／`#btn-levels-prev`／`#btn-levels-next`；另補 `#btn-win-home`=`h`、`#btn-fail-home`=`b` a11y 對齊；document-level when overlay open；網格 Arrow／Home／End 不變；input／modifier 守衛 mirror `handleWinFailKeys`；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share landing（SHARE-LANDING）**已上 — `docs/index.html` EN brand landing（USP「Gold lids block pours — uncap, then sort.」＋Privacy 相對連結＋Coming soon on Google Play；OG／Twitter Card；`og:image` → `…/og.png`）；`docs/og.png`（ICON A 512）；修 GitHub Pages 根 404，通關 Share URL 仍指向同根；**無** soft-arm／claim-juice／HUD pulse；#6 維持 Pass；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Store title align（STORE-TITLE-ALIGN）**已上 — Play lock title **ColorTube Sort: Lid Puzzle** 對齊 share landing／OG／Twitter／win-share／document meta；HUD `.brand` 短名不變；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**Web manifest＋鍵盤 aria（WEB-MANIFEST＋KEYSHORTCUTS-MARKUP）**已上 — `site.webmanifest`（Play lock name＋standalone＋theme `#1a1a2e`）＋ICON A 192／512（assets／docs）；index／docs `rel=manifest`；`sync-www` 複製；既有快捷鍵控點補 `aria-keyshortcuts`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA maskable＋manifest richer（PWA-MASKABLE）**已上 — maskable icons（80% safe zone／`#1a1a2e`）＋manifest orientation／categories＋iOS status-bar meta；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**觸控 44＋局中 Daily 鍵＋Close Escape aria（TOUCH-44＋HUD-DAILY-KEY＋CLOSE-ESC-MARKUP）**已上 — `.btn-icon`／`.btn-home`／`.modal-close` ≥44×44 CSS px；局中 `d`／`D` → `#btn-daily.click`（LEAVE-RUN-CONFIRM／POUR-UI-GUARD）；`aria-keyshortcuts` on `#btn-daily`＝`d`＋`#btn-home`／shop／hint／levels close＝`Escape`（JS Escape 不變）；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Settings Backup progress（SAVE-BACKUP）**已上 — 商店 Settings「Backup progress」Export／Import；JSON v:1 含 sanitizeSave meta＋可選 valid run draft；Import 兩次確認 toast「Tap again to restore backup」～2s；progress_export／progress_import；**無** soft-arm／claim-juice／HUD pulse；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**A11Y-ZOOM**已上 — 根／`docs/` viewport 移除 `maximum-scale=1`／`user-scalable=no`，保留 `width=device-width, initial-scale=1, viewport-fit=cover`；`.tubes-wrap` 加 `touch-action: manipulation`（防誤觸雙擊縮放，不擋 overlay 捲動）；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**How to play＋? 快捷鍵表（HOW-TO-PLAY）**已上 — Settings「How to play」關商店後重開 pour＋lid teach（`activeTipKind='howto'`；dismiss 不清 teach flags）；`?`／Shift+/ ~4.8s toast 列快捷鍵；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**Mute 快捷鍵（MUTE-KEY）**已上 — 全域 `m`／`M` 切換 Sound（`sfxOn`）＋toast「Sound on／off」＋Settings `#btn-toggle-sfx` `aria-keyshortcuts=m`；`?` 快捷鍵表含 Mute m；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Haptics 快捷鍵（HAPTICS-KEY）**已上 — 全域 `v`／`V` 切換 Haptics（`hapticsOn`）＋toast「Haptics on／off」＋Settings `#btn-toggle-haptics` `aria-keyshortcuts=v`；`?` 快捷鍵表含 Haptics v；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Color assist 快捷鍵（COLOR-ASSIST-KEY）**已上 — 全域 `c`／`C` 切換 Color assist（CVD glyphs；`colorAssist`）＋toast「Color assist on／off」＋Settings `#btn-toggle-color-assist` `aria-keyshortcuts=c`；`?` 快捷鍵表含 Color assist c；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Reduced motion 快捷鍵（MOTION-KEY）**已上 — 全域 `x`／`X` 切換 Reduced motion（`reducedMotion`）＋toast「Reduced motion on／off」＋Settings `#btn-toggle-reduced-motion` `aria-keyshortcuts=x`；`?` 快捷鍵表含 Reduced motion x；Settings 點擊走 `applyReducedMotionOn`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA offline（PWA-OFFLINE）**已上 — 根 `sw.js`（`colortube-offline-v1` precache index／manifest／css／JS／icons／audio）＋playable `index.html` register；`sync-www`→`www/`；docs brand landing 不註冊；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**PWA update（PWA-UPDATE）**已上 — `sw.js` `colortube-offline-v2`＋assets stale-while-revalidate＋SKIP_WAITING；index updatefound／controllerchange toast「Update ready — tap to refresh」；sync-www；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share play demo（SHARE-PLAY-DEMO）**已上 — `docs/play/` browser demo（`sync-www.sh` 同步根 playable；landing **Play free in browser** → `play/`；brand 不註冊 SW）；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#1／#3／#9 仍 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**Share play URL（SHARE-PLAY-URL）**已上 — 通關 Share／clipboard／`navigator.share` url 指向 `…/color-sort-puzzle/play/` 可玩 demo（非 brand landing 根）；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#6 維持 Pass（有機分享落地可玩）；#1／#3／#9 仍 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**Share play OG（SHARE-PLAY-OG）**已上 — 可玩 `index.html`（`sync-www` → `docs/play/`）補 Open Graph／Twitter Card（`og:url` → `…/play/`、`og:image` → `…/og.png`）；通關 Share 落地社群預覽不再空白；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#6 維持 Pass（有機分享預覽）；#1／#3／#9 仍 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**L-PAR**已上 — 全 80 關顯式 `par`（最短倒水 BFS／啟發式＋Day1 +1／後期 ~+10%）；修 L1／L2／L4–L7 原 `par < opt`（3★ 不可能）；重做 L79／L80 假終關（1 步 → 深度 30／29）；`shortestPourPath`＋accept `L-PAR`；**無** soft-arm；#4 維持 Pass；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**



（已補）**WAKE-LOCK**已上 — 局中 Screen Wake Lock（`navigator.wakeLock.request('screen')`）＋Settings「Keep screen on」預設 On／persist；`goHome` release；`visibilitychange` 回前景重拿；Reset 保留；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**KEEP-AWAKE-KEY**已上 — 全域 `k`／`K` 切換 Keep screen on＋toast；Settings `#btn-toggle-keep-awake` `aria-keyshortcuts=k`；`?` 表含 Keep screen on k；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial。**未**把 #1／#3／#7／#9 標新 Pass。





（已補）**LEAVE-TAB-GUARD**已上 — `beforeunload` 在 mid-run draft 有進度時警告關閉／重新整理（同 leave-run `activeOrStoredProgressDraft`／`draftHasProgress`）；順帶 flush `persistRunDraft`；無進度不臂；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。


（已補）**SAFE-AREA-LR**已上 — `:root` `--safe-left`／`--safe-right`（`env(safe-area-inset-left/right)`）；`#app` 水平 padding 用 `var(--safe-left/right)`；`.overlay`／`.toast` 補水平 inset（absolute 滿版不雙墊流式子元件）；`SAFE-AREA-LR` accept；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**SAFE-AREA-TB**已上 — `.overlay` 四邊 padding 用 `var(--safe-top/right/bot/left)`（absolute inset 蓋住 `#app` padding box，垂直也避開 notch／home indicator）；`:root` 既有 `--safe-top`／`--safe-bot`；`SAFE-AREA-TB` accept；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。

（已補）**ANDROID-PORTRAIT**已上 — 本機 `AndroidManifest` MainActivity `android:screenOrientation="portrait"`（鎖直立；web 既有 `orientation: portrait-primary`）；`android/` 仍 gitignore — 提交 `scripts/patch-android-portrait.sh`＋`aab:internal` hook＋`native-templates/android/README.md` §2b 說明（無另 invent Manifest 檔）；`ANDROID-PORTRAIT` accept；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-KEEP-AWAKE**已上 — Capacitor WebView 常缺 `navigator.wakeLock`；`scripts/patch-android-keep-awake.sh` 冪等寫入 MainActivity `FLAG_KEEP_SCREEN_ON`＋`ColorTubeNative.setKeepScreenOn`；`aab:internal` hook；JS `syncNativeKeepScreenOn` 對齊 Settings Keep screen on；accept `ANDROID-KEEP-AWAKE`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-SYSTEM-BARS**已上 — Capacitor/AppCompat 預設 indigo `#3F51B5`；`scripts/patch-android-system-bars.sh` 冪等寫入 `colors.xml`（`colorPrimary` `#1a1a2e`／accent `#4ecdc4`）＋`styles.xml` `statusBarColor`／`navigationBarColor`／`windowBackground` `#1a1a2e`（含 splash theme）；`aab:internal` hook；accept `ANDROID-SYSTEM-BARS`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**
（已補）**ANDROID-SPLASH-THEME**已上 — Capacitor 已有 core-splashscreen／`Theme.SplashScreen`，但 stock MainActivity 未呼叫 `SplashScreen.installSplashScreen`；補 install＋`postSplashScreenTheme`／`windowSplashScreenBackground`（brand `#1a1a2e`）；`scripts/patch-android-splash-theme.sh`＋`aab:internal`；accept `ANDROID-SPLASH-THEME`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**

（已補）**ANDROID-NO-BACKUP**已上 — Capacitor 預設 `allowBackup=true` 無規則；OS Auto Backup／device-transfer 可能還原 WebView localStorage 成壞檔。改 `allowBackup=false`＋`fullBackupContent=@xml/backup_rules`＋`dataExtractionRules` 拒絕 cloud-backup／device-transfer；進度備份走 Settings Backup Export／Import（`SAVE-BACKUP`）；`scripts/patch-android-no-backup.sh`＋`aab:internal`；accept `ANDROID-NO-BACKUP`；**無** soft-arm／claim-juice／HUD pulse；閘門仍 5 Pass／3 Partial／1 Fail（#7 AdMob）；#9 維持 Partial（仍差 P0②③）。**未**把 #1／#3／#7／#9 標新 Pass。**不宣稱 ship-ready。**


1. **真變現** — Play 過審後換正式 AdMob／Billing 單元；`remove_ads` 真接線（維持不打斷倒水）。勿把測 ID／Coming soon 標 Done。  
2. **手感收滿 Pass** — stream→target＋land haptic＋dest fill-rise＋complete rim burst＋select tap/haptic＋first-pour＋**first-uncap-of-level**＋**lid-arm（非 illegal）**＋undo soft＋**通關 tube cascade**＋**near-complete beckon**＋**completing-pour（`.completing-pour`＋denser splash/land）**＋**winning-pour（`#app.winning-pour` board glow during level-clearing pour）**＋**3★ perfect-clear 簽名汁**＋**chapter-chest claim（`.chest-claim`＋burst＋haptic）**＋**first-3★ mastery claim（`.mastery-claim`＋`#win-mastery`＋burst＋haptic）**＋**daily first-clear claim（`.daily-claim`＋`#win-daily`＋burst＋haptic）**＋**login streak milestone claim（`.streak-claim`＋`#start-streak-claim`＋burst＋haptic）**＋**theme unlock claim（`.theme-claim`＋`#shop-theme-claim`＋burst＋haptic）**＋**hint-reveal（`.hint-dest`／`.hint-uncap` mint＋`.hint-spark`＋`haptic('hint')`）**＋**hint-pack claim（`.hints-claim`＋`#shop-hints-claim`＋burst＋haptic）**＋**unlimited-undo claim（`.undo-claim`＋`#shop-undo-claim`＋burst＋haptic；80🪙／此關）**＋**HUD coin-earn（`.chip-coins.coin-earn`＋`+N` float＋`haptic('coins')`）**＋**HUD coin-spend（`.chip-coins.coin-spend`＋`-N` float＋`haptic('coinSpend')`）**＋**HUD free-hints chip（`#hint-display.chip-hints`＋`.hint-earn`／`.hint-spend` float ±N＋`haptic('hints'|'hintSpend')`）**＋**star-track drop visual juice（`.track-drop`＋Off N★ float＋`haptic('starDrop')`）**＋**star-track recover visual juice（`.track-recover`＋Back on N★ float＋`haptic('starRecover')`；回復後重開 drop 臂）**＋**Shop Settings Sound／Haptics toggles（persist＋gate）**＋**new-best star-improve claim（`.new-best-claim`＋`#win-new-best`＋burst＋haptic；非 first-3★）**＋**new-level-unlock claim（`.unlock-claim`＋`#win-unlock`＋burst＋haptic；frontier only）**＋**fail-hint-arm**（Stuck? primary `#btn-fail-hint.fail-hint-arm` soft mint pulse＋once-per-open `haptic('arm')`；reduced-motion static）＋**hint-paywall soft-arm**（`#btn-hint-ad`／`#btn-hint-coins.hint-pay-arm` mint pulse＋once-per-open haptic/SFX；reduced-motion static）＋**win-replay-arm**（1–2★ mainline `#btn-win-restart` → Replay for 3★＋soft arm when not newlyUnlocked；unlock prefers Next）＋**shop-buy-arm**（affordable coin CTA：hints／undo／theme；never remove-ads／IAP）＋**hud-hint-arm**／**hud-undo-arm**（★-track drop → prefer free Hint mint soft-arm；else Undo rose/amber when available；互斥）＋**levels-star-gap-arm**（Continue 已 3★ 時臂 focus chapter 第一缺星 cell mint/lavender＋`3★` badge；否則 Continue `Go`；永不雙臂） 已上；仍差實機 15s UA 剪輯驗證（投放預算凍結期間可延後，閘門仍 Partial）。  
3. **ACCEPTANCE → Pass** — `npm run accept` 已可重複跑且自動化項全綠（含 keyboard tube／Escape／overlay focus／dialog labelledby／**toast live region**／**HUD focus-visible＋labels**／**A11Y-COLOR Color assist**／save sanitize／**RUN-RESUME** mid-level board draft／**STUCK-DETECT**／**RESTART-CONFIRM**／**LEAVE-RUN-CONFIRM**／**SHOP-SPEND-CONFIRM**／**BACK-NAV**／**LEVELS-SCROLL**／**LEVELS-FOCUS**／**LEVELS-CHAPTER**／**LEVELS-KEYS**／**A11Y-TRAP**／**BOARD-KEYS**／**HUD-KEYS**／**WIN-FAIL-KEYS**／**START-KEYS**／**HINT-PAYWALL-KEYS**／**SHOP-KEYS**／**LEVELS-RUN-BADGE**／**START-RUN-RESUME**／**DAILY-RUN-RESUME**／**RESET-PROGRESS**／**SAVE-BACKUP**／**A11Y-ZOOM**／**HOW-TO-PLAY**／**BRAND-FAVICON**（ICON A favicon／apple-touch；`START-KEYS` 含 l→Levels）／**WIN-HOME**（通關 Home CTA＋`h`；Escape win→Home）／**FAIL-HOME**（失敗 Home CTA；`h` 仍 Hint）／**FAIL-DISMISS**（關 fail 清 count；`b`→Home）／**A11Y-POUR**（reduced-motion 跳過 pour stream／tilt／splash）／**A11Y-BURST**（reduced-motion 跳過 complete／uncap sparks＋shake＋flash）／**A11Y-WIN**（reduced-motion 跳過 win cascade／480ms delay／star stagger；CSS hide confetti）／**A11Y-SHAKE**（reduced-motion 跳過非法倒 `.invalid-shake`；仍 SFX＋haptic）／**SHARE-WIN**（通關 Share Web Share／clipboard；無 soft-arm）／**WEB-MANIFEST**／**PWA-MASKABLE**／**KEYSHORTCUTS-MARKUP**／**TOUCH-44**／**HUD-DAILY-KEY**／**CLOSE-ESC-MARKUP**／**A11Y-ZOOM**／**HOW-TO-PLAY**／**HAPTICS-KEY**／**COLOR-ASSIST-KEY**／**MOTION-KEY**／**PWA-OFFLINE**／**PWA-UPDATE**／**SHARE-PLAY-DEMO**／**SHARE-PLAY-URL**；仍差 P0②③ 實機變現複驗後才能把 #9 從 Partial 拉滿。  
4. **首屏／Icon「想點」** — finals icon／start-hook（**含蓋擋→揭蓋→倒** twist）／首倒成功拍／**選管合法目標高亮**／**非法倒水原因 toast**／**Continue · Level N** primary CTA（soft arm）／**Levels continue soft-arm**（frontier／current `Go` cell）已上；仍缺外部 3s 競品對照實測（#1 維持 Partial）。

不得把 mock IAP／假 AdMob 標成 Done。
