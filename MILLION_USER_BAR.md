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
| 貫穿率 | 蓋子管（或同級 USP）出現在主線 **≥60%** 關卡 |
| 教學後 | 不可「教完 1–5 關就消失」；中後期仍有雙蓋／決策張力 |
| 可感知 | 玩家複述「這款跟別的水管不一樣」時能講出該點 |

**Fail：** USP 只活在教學弧；主線變回純 clone。

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
| 失敗牆 | 軟性失敗提示門檻 **≥3** 次重來（不可 1–2 次就逼廣告／IAP） |
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

## 現況評分 · Honest draft score (repo as of docs pass)

依目前程式／資產閱讀（非願望清單）。分數僅作嚴苛草稿；**總評：未達上架資格（大多 Fail）**。

| # | 項目 | 結果 | 現況依據（代碼事實） |
|---|------|------|----------------------|
| 1 | 3秒看懂＋想點 | **Fail** | 有開始屏與倒水循環，但無定稿 icon／投放級首屏；「想點」未對標競品驗證 |
| 2 | USP 貫穿 ≥60% | **Fail** | 蓋子管僅 **levels 1–5**（約 **5/40 ≈ 12.5%**），教學完即消失 |
| 3 | 倒水手感／15s 廣告 | **Fail** | 有 CSS 飛濺／shake／confetti；**無 WebAudio、無 haptic** |
| 4 | ≥80 關＋曲線假說 | **Fail** | **40 關**（5 tutorial + handcrafted + 25 generated）；無數據化假說文件；生成可解但深度不足 |
| 5 | Day1 不傷好感 | **Fail** | `FAIL_LOOP_THRESHOLD = 2`（門檻 **< 3**）；前段雖未硬氪，失敗牆過早 |
| 6 | Meta 回來理由 | **Fail** | 今日挑戰／連勝／三星有 stub 邏輯，但差異與複刷誘因偏薄，未達第一梯隊「真正有理由」 |
| 7 | 真 AdMob＋remove_ads | **Fail** | `ads.js` 有橋接＋`USE_TEST_ADS`；**`@capacitor-community/admob` 未進 package**；`mockIapPurchase` 仍是模擬購買 |
| 8 | 品牌投放級 | **Fail** | `STORE.md` 有 ASO 文案；**無 icon、無五張商店圖資產** |
| 9 | 穩定／ACCEPTANCE | **Fail** | **無 ACCEPTANCE 套件**；無崩潰監控／全過證明 |

**總評：** **0 / 9 Pass** → 閘門關閉。現況定位：可玩原型＋商店／變現腳手架，**不是**可上架、可買量的 hybrid-casual 成品。

---

## 下一刀只做 Top 3 gaps

只列缺口最大、且不修就不可能過閘的三刀（**本輪只定標準，不實作**）：

1. **USP 貫穿＋關卡體量** — 蓋子（或同級記憶點）拉到主線 **≥60%**；關卡拉到 **≥80**（或等價深度）並寫下可驗證難度假說、死關檢查。  
2. **倒水手感達廣告級** — WebAudio 倒水／完成／過關音＋觸覺級反饋；juice 調到可拍 15s UA。  
3. **真變現接線** — AdMob rewarded／interstitial 實機可跑（測試 ID OK）＋`remove_ads` 真 IAP；維持不打斷倒水。

其餘（品牌五圖、ACCEPTANCE、失敗牆≥3、Meta 加厚）在 Top 3 達標後再排，**不得**用「先 soft-launch」跳過。
