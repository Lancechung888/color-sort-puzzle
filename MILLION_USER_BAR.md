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
| 1 | 3秒看懂＋想點 | **Partial** | 開始屏 `.start-hook`＋短 lead；ICON A 1024；**首倒成功拍**；**選管後合法目標管 `.pour-target` 脈衝高亮**（持液即知往哪倒）；**非法倒水原因 toast**（`Tube full`／`Colors don't match`，蓋管另 toast）；**start-hook USP twist**（金蓋擋倒 → `Blocked` badge＋shake → uncap → pour → sorted；lead「Gold lids block pours — uncap, then sort.」；`prefers-reduced-motion` 靜態蓋＋badge）。**仍缺**外部「想點」/首 3s 競品對照實測 → 維持 Partial，未標 Pass |
| 2 | USP 貫穿（40–60% lock） | **Pass** | **80** 關；有蓋 **43/80 = 53.8%**；連續無蓋 ≤3；L1–2 零蓋；L3 teach；單關 ≤2 蓋（15 關曾 3–4 蓋已夾回；幽靈 `modules:cap` 補成真蓋；`L-CAPS-MAX` 恢復 ≤2） |
| 3 | 倒水手感／15s 廣告 | **Partial** | WebAudio（pour/land/complete/uncap/win）＋**Capacitor Haptics**＋vibrate fallback；開蓋 flip＋火花；stream 對準目標口＋land 觸覺；dest fill-rise；**complete-tube 同色 rim burst**（`.complete-spark`）；**select tap＋haptic**；**first-pour-of-level**（`.first-pour-glow`＋`haptic('firstPour')`＋加濃 splash）；**蓋子首點 arm**（`.lid-arm-nudge`＋`haptic('arm')`／`SFX.tap`，不再誤觸 illegal）；**undo soft tap/haptic**；**通關 filled-tube cascade**（`celebrateLevelClear` stagger `glowPulse` ~55ms＋輕 `haptic('complete')`，再延 480ms `showWin`；無雙倍 confetti）；**near-complete mono-tube beckon**（`.near-complete` soft rim/glass glow ~1.9s，差一格同色滿管；`prefers-reduced-motion` 靜態光）；**completing-pour anticipatory juice**（`.completing-pour` rim/glass glow during ~380ms pour＋denser splash ~26＋`haptic('landComplete')` slightly firmer land vibrate；post-land `complete` burst/haptic unchanged）；**3★ perfect-clear 簽名汁**（標題 Perfect!、`.win-stars.perfect` 金光、`.perfect-spark` 金 rim burst、金偏 confetti、`haptic('perfect')` HEAVY+SUCCESS；1–2★ 維持原 win；`prefers-reduced-motion` 靜態金光）；**winning-pour anticipatory juice**（通關倒水：`#app.winning-pour` 暖金 board rim glow ~380ms＋denser splash ~32＋短金 rim sparkle＋`haptic('winPour')`；可與 `.completing-pour` 疊層；`prefers-reduced-motion` 靜態光、無 sparkle）；**chapter-chest claim juice**（`tryClaimChapterChest` 非空時：`.modal-win.chest-claim` 暖琥珀 rim/glow＋`#win-chest` 橫幅＋`.chest-spark` amber/gold coin burst＋`haptic('chest')` MEDIUM+SUCCESS／vibrate ~26ms 第二拍；不雙加幣；`prefers-reduced-motion` 靜態琥珀光、無粒子）；**first-3★ mastery claim juice**（`masteryBonus > 0`：`.modal-win.mastery-claim` soft gold/lavender rim＋`#win-mastery` EN banner「First 3★! +N coins」＋`.mastery-spark` cool gold/lavender burst ~13＋`haptic('mastery')` MEDIUM+SUCCESS／vibrate ~26ms；banner 為主、不重複 `#win-meta` First 3★ 喊；可與 chest 同場；daily 無此路徑；不雙加幣；`prefers-reduced-motion` 靜態光、無粒子）；**daily first-clear claim juice**（`dailyFirstClear`：`.modal-win.daily-claim` sky/cyan rim＋`#win-daily` EN banner「Daily first clear! +N coins」＋`.daily-spark` sky/cyan burst ~13＋`haptic('daily')` MEDIUM+SUCCESS／vibrate ~26ms；不雙加幣（+40 仍走既有 `coins += DAILY_FIRST_CLEAR_BONUS`）；`prefers-reduced-motion` 靜態青光、無粒子）；**login streak milestone claim juice**（Days 3/7/14：`pendingStreakMilestone` → `#start-streak-claim` EN banner「{label}! +N coins」＋hints＋`.modal-premium.streak-claim` coral/flame rim＋`.streak-spark` coral/flame burst ~13＋`haptic('streak')` MEDIUM+SUCCESS／vibrate ~26ms；可選 `#streak-display.streak-pulse`；banner 為主、清掉里程碑 toast 重複喊；幣／提示仍只走既有 `claimStreakMilestones`；`prefers-reduced-motion` 靜態珊瑚光、無粒子）；**theme unlock claim juice**（`unlockTheme`：`#shop-theme-claim` EN banner「Theme unlocked: {name}」＋`.modal-shop.theme-claim` violet/magenta rim＋`.theme-spark` ~13＋`haptic('theme')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.theme-unlock-pulse`；banner 為主、無 toast 重複；不雙加幣；關商店／再開清掉；`prefers-reduced-motion` 靜態紫光、無粒子）；**hint-reveal juice**（`applyHint` 成功：`.hint-dest`／`.hint-uncap` mint rim＋加長 pulse ~1.05s＋`.hint-spark` mint/lime ~11＋`haptic('hint')` LIGHT+SUCCESS／vibrate ~12ms＋`SFX.tap`；toast 維持；`prefers-reduced-motion` 靜態 mint 光、無粒子）；**hint-pack purchase claim juice**（商店 Hint pack ×5：`#shop-hints-claim` EN banner「Hint pack ×5! · coins/cash」＋`.modal-shop.hints-claim` emerald/jade rim＋`.hints-spark` ~13＋`haptic('hintsPack')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.hints-pack-pulse`；banner 為主、無 toast 重複；不雙加 hint；與 theme claim 互斥；`prefers-reduced-motion` 靜態翡翠光、無粒子）；**unlimited-undo (this level) claim juice**（`UNDO_LEVEL_COIN_COST=80` 金幣路徑＋IAP stub；`#shop-undo-claim` EN banner「Unlimited undo · this level! · coins/cash」＋`.modal-shop.undo-claim` indigo/periwinkle rim＋`.undo-spark` ~13＋`haptic('undoPack')` MEDIUM+SUCCESS／vibrate ~26ms＋`.shop-card.undo-level-pulse`；banner 為主、無 toast 重複；不雙開 flag；與 theme／hints claim 互斥；`prefers-reduced-motion` 靜態靛光、無粒子）；**HUD coin-earn pulse**（`addCoins(n>0)` → `#coin-display.coin-earn` gold scale/glow ~0.55s＋`.coin-earn-float` EN `+N` rise ~0.7s＋`haptic('coins')` LIGHT+SUCCESS／vibrate ~14ms＋`SFX.tap`；不雙加幣、無 toast；`prefers-reduced-motion` 靜態金邊＋靜態 `+N`）；**HUD coin-spend pulse**（`spendCoins` → `#coin-display.coin-spend`／`.chip-coins.coin-spend` rose scale-down ~0.5s＋`.coin-spend-float` EN `-N` rise ~0.7s＋`haptic('coinSpend')` LIGHT／vibrate ~12ms＋`SFX.tap`；不雙扣幣；`prefers-reduced-motion` 靜態玫瑰邊＋靜態 `-N`）；**HUD free-hints chip**（`#hint-display.chip-hints`＋`.hint-earn`／`.hint-spend` float ±N＋`haptic('hints'|'hintSpend')`＋`SFX.tap`；`prefers-reduced-motion` 靜態）；**star-track drop visual juice**（掉離 3★／2★ 軌：`#moves-label.track-drop` rose/amber pulse ~0.6s＋`.track-drop-float` EN `Off 3★`／`Off 2★`＋`haptic('starDrop')` LIGHT／vibrate ~14ms＋`SFX.tap`；一關一次；`prefers-reduced-motion` 靜態色邊＋靜態字）；**star-track recover visual juice**（undo／步數預算回到 3★／2★：`#moves-label.track-recover` mint/emerald pulse ~0.6s＋`.track-recover-float` EN `Back on 3★`／`Back on 2★`＋`haptic('starRecover')` LIGHT+SUCCESS／vibrate ~14ms＋`SFX.tap`；回復後重開 drop 警告臂；`prefers-reduced-motion` 靜態薄荷邊＋靜態字）。仍缺實機 15s UA 剪輯驗證 → 維持 Partial，未標 Pass |
| 4 | ≥80 關＋曲線假說 | **Pass** | **80** 關；DESIGN 載明顏色／蓋密度曲線；生成＝reverse-scramble（可解建構）＋applyCaps |
| 5 | Day1 不傷好感 | **Pass** | `START_COINS=120`、`freeHints=3`、`HINT=25`、星獎 8/15/28；失敗牆 index&lt;15 → **5**、L16+ → **2**；**fail-loop 表單 hint-first（keeps board）**— 主 CTA `#btn-fail-hint` 給當前盤面提示，廣告重開為次要 |
| 6 | Meta 回來理由 | **Pass** | Daily 自適應＋首清 +40；連勝里程碑 Day **3/7/14**（幣＋提示）＋下一里程碑 HUD／首屏；首達 3★ **+22**；每 10 關全 3★ chapter chest（+80🪙＋1 hint）；關卡選單顯示缺星＋獎勵預告；**局中 status bar 即時 Moves/Par/★ 預算投影**（`track-perfect`／`track-good`／`track-ok`，掉軌 soft haptic＋`.track-drop`／Off N★；undo 回軌＋`.track-recover`／Back on N★；`#level-stars` 仍顯示 mastery best） |
| 7 | 真 AdMob＋remove_ads | **Fail** | AdMob **已**進 npm 依賴（`@capacitor-community/admob`）＋測單元／`USE_TEST_ADS` 已配線；Manifest `APPLICATION_ID` 可由 `scripts/patch-android-admob.sh` 補上。仍 **Fail** 直至實機 SDK 廣告驗證＋真 `remove_ads` IAP（Play 過審後）。商店「去除廣告」→ **即將開放**，**不會**假授 `removeAds`（DEV flag 預設 OFF） |
| 8 | 品牌投放級 | **Pass** | 定名 ColorTube Sort；`store-assets/finals/` 齊 **ICON A 1024**＋Shot1–5 EN（見 STORE_FINALS_GATE）；ZH 次要。投放素材迭代另凍結（無預算）≠ 缺資產 |
| 9 | 穩定／ACCEPTANCE | **Partial** | `npm run accept` 自動化 **全綠**（關卡／經濟／P0①／測 ID 配線／倒水護欄）；**P0②③** 仍 Blocked → 未滿 Pass；無已知 P0 崩 |

**總評：** **5 Pass / 3 Partial / 1 Fail** → 閘門仍關閉。Meta＋品牌 finals 已 Pass；手感／首屏（已加 start-hook，仍 Partial）／ACCEPTANCE 自動化為 Partial；**真變現（#7）** 仍是唯一 Fail。**不宣稱 ship-ready。**

---

## 下一刀 Top gaps（仍禁止 soft-launch）

1. **真變現** — Play 過審後換正式 AdMob／Billing 單元；`remove_ads` 真接線（維持不打斷倒水）。勿把測 ID／Coming soon 標 Done。  
2. **手感收滿 Pass** — stream→target＋land haptic＋dest fill-rise＋complete rim burst＋select tap/haptic＋first-pour＋**lid-arm（非 illegal）**＋undo soft＋**通關 tube cascade**＋**near-complete beckon**＋**completing-pour（`.completing-pour`＋denser splash/land）**＋**winning-pour（`#app.winning-pour` board glow during level-clearing pour）**＋**3★ perfect-clear 簽名汁**＋**chapter-chest claim（`.chest-claim`＋burst＋haptic）**＋**first-3★ mastery claim（`.mastery-claim`＋`#win-mastery`＋burst＋haptic）**＋**daily first-clear claim（`.daily-claim`＋`#win-daily`＋burst＋haptic）**＋**login streak milestone claim（`.streak-claim`＋`#start-streak-claim`＋burst＋haptic）**＋**theme unlock claim（`.theme-claim`＋`#shop-theme-claim`＋burst＋haptic）**＋**hint-reveal（`.hint-dest`／`.hint-uncap` mint＋`.hint-spark`＋`haptic('hint')`）**＋**hint-pack claim（`.hints-claim`＋`#shop-hints-claim`＋burst＋haptic）**＋**unlimited-undo claim（`.undo-claim`＋`#shop-undo-claim`＋burst＋haptic；80🪙／此關）**＋**HUD coin-earn（`.chip-coins.coin-earn`＋`+N` float＋`haptic('coins')`）**＋**HUD coin-spend（`.chip-coins.coin-spend`＋`-N` float＋`haptic('coinSpend')`）**＋**HUD free-hints chip（`#hint-display.chip-hints`＋`.hint-earn`／`.hint-spend` float ±N＋`haptic('hints'|'hintSpend')`）**＋**star-track drop visual juice（`.track-drop`＋Off N★ float＋`haptic('starDrop')`）**＋**star-track recover visual juice（`.track-recover`＋Back on N★ float＋`haptic('starRecover')`；回復後重開 drop 臂）** 已上；仍差實機 15s UA 剪輯驗證（投放預算凍結期間可延後，閘門仍 Partial）。  
3. **ACCEPTANCE → Pass** — `npm run accept` 已可重複跑且自動化項全綠；仍差 P0②③ 實機變現複驗後才能把 #9 從 Partial 拉滿。  
4. **首屏／Icon「想點」** — finals icon／start-hook（**含蓋擋→揭蓋→倒** twist）／首倒成功拍／**選管合法目標高亮**／**非法倒水原因 toast**已上；仍缺外部 3s 競品對照實測（#1 維持 Partial）。

不得把 mock IAP／假 AdMob 標成 Done。
