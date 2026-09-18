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
