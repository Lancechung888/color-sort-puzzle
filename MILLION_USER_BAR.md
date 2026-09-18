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

## 現況評分 · Honest draft score (post economy / curve / juice pass)

依目前程式／資產閱讀（非願望清單）。**禁止 soft-launch**；**不宣稱 ship-ready**。

| # | 項目 | 結果 | 現況依據（代碼事實） |
|---|------|------|----------------------|
| 1 | 3秒看懂＋想點 | **Fail** | 開始屏＋L1 純倒水教學可讀；仍無定稿投放 icon／未做競品「想點」驗證 |
| 2 | USP 貫穿（40–60% lock） | **Pass** | **80** 關；有蓋 **40/80 = 50%**；連續無蓋 ≤3；L1–2 零蓋；L3 teach；單關 ≤2 蓋 |
| 3 | 倒水手感／15s 廣告 | **Partial** | WebAudio（pour/land/complete/uncap/win）＋`navigator.vibrate`；開蓋有 flip＋火花。UA 素材級仍未實機驗證 → 未滿 Pass |
| 4 | ≥80 關＋曲線假說 | **Pass** | **80** 關；DESIGN 載明顏色／蓋密度曲線；生成＝reverse-scramble（可解建構）＋applyCaps |
| 5 | Day1 不傷好感 | **Pass** | `START_COINS=120`、`freeHints=3`、`HINT=25`、星獎 8/15/28；失敗牆 index&lt;15 → **5**、L16+ → **2** |
| 6 | Meta 回來理由 | **Fail** | 今日挑戰已改近進度自適應；連勝／三星複刷誘因仍偏薄 |
| 7 | 真 AdMob＋remove_ads | **Fail** | AdMob **未**進依賴／需 publisher 帳號（TODO）；商店「去除廣告」→ **即將開放**，**不會**假授 `removeAds`（DEV flag 預設 OFF） |
| 8 | 品牌投放級 | **Fail** | 有 ASO／icon 概念草稿；無定稿 1024 icon＋五張投放級截圖 |
| 9 | 穩定／ACCEPTANCE | **Fail** | 有 **ACCEPTANCE.md** 列出 QA Fail／回歸項；套件未全綠、無自動化全過證明 |

**總評：** **3 Pass / 1 Partial / 5 Fail** → 閘門仍關閉。本輪推進了經濟、蓋密度曲線、體量、基礎手感與 IAP 誠實閘；**變現／品牌／ACCEPTANCE 全綠／Meta** 仍是硬缺口。

---

## 下一刀 Top gaps（仍禁止 soft-launch）

1. **真變現** — AdMob SDK＋帳號測試 ID；`remove_ads` 真 Billing／StoreKit（維持不打斷倒水）。  
2. **手感收滿 Pass** — 實機 UA 剪輯驗證；必要時加 Capacitor Haptics。  
3. **品牌＋ACCEPTANCE 全綠** — 定稿 icon／五圖；ACCEPTANCE 項清零並可重複跑。

不得把 mock IAP／假 AdMob 標成 Done。
