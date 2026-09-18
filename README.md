# 彩管分類 ColorTube Sort

Portrait hybrid-casual **color / water tube sorting** puzzle with retention juice and clear monetization stubs. Tap a tube to pick its top liquid layers, tap another to pour when legal. Clear each level by sorting so every tube is empty or a single solid color.

Traditional Chinese UI primary（關卡、金幣、星星、商店、今日挑戰、去除廣告、主題、提示）. English notes in this README and code comments.

## How to play

1. Open the game and tap **開始遊戲** (or **今日挑戰**).
2. Tap a tube with liquid to lift it (select).
3. Tap a valid destination tube to pour. Invalid targets briefly shake.
4. Use **撤銷** / **重來** / **提示**. Open **商店** for themes and remove-ads.
5. On win, earn **星星** + **金幣**, then **下一關**. Progress, coins, stars, streak, and themes save in `localStorage`.

**Stars:** 3★ = under par moves & no undo; 2★ = within 1.5× par (or used undo but ≤ par); 1★ = cleared.

**Rules:** Pour onto empty or matching top color, only as many layers as free slots. Contiguous same-color layers pour together.

## Run locally

```bash
cd /workspace/color-sort-puzzle
python3 -m http.server 8765
```

Open **http://127.0.0.1:8765/** in a browser (or open `index.html` via file://).

```bash
npm start
```

## Project layout

```
color-sort-puzzle/
  index.html
  README.md
  DESIGN.md
  STORE.md             # ASO + publish checklist
  package.json
  capacitor.config.json
  scripts/sync-www.sh
  src/monetization.md  # AdMob / IAP init order TODOs
  www/                 # Capacitor webDir (npm run build:www)
  assets/
    css/style.css      # themes + juice UI
    js/levels.js       # 40 levels (cap tutorial 1–5) + candy palette
    js/ads.js          # AdMob bridge (USE_TEST_ADS) + browser mock
    js/game.js         # gameplay, 蓋子管, economy, shop, ad/IAP stubs
```

## Retention & monetization (stubs)

- Visual juice: glass tubes, pour splash, complete glow, screen shake, confetti
- Coins, 3-star ratings, daily streak, 今日挑戰, unlockable themes
- Shop: 去除廣告, 主題包, 提示包, 無限撤銷（本關）
- Fail-loop soft prompt + hint paywall (rewarded / coins / IAP mocks)
- No real AdMob or Billing SDK yet — see `TODO` comments in `game.js`

## Levels

35 levels: handcrafted early stages (1–10), then generated solvable stages with more colors, taller tubes (capacity 4–5), and more tubes.

## 上架路徑

See **[STORE.md](./STORE.md)** for ASO copy (TW zh-Hant + EN), monetization wiring order (AdMob rewarded → interstitial → remove_ads IAP), Play/Apple costs, and appId `com.lancechung.colortubesort`.

### Capacitor (Android first)

```bash
npm install          # if network allows; templates work without it
npm run build:www    # syncs index.html + assets/ → www/
npx cap add android  # requires Android SDK on your machine
npx cap sync
```

AdMob / Billing wiring notes: `src/monetization.md` (matches `game.js` stubs). iOS after Play soft-launch.

## Tech

Single-page HTML5 + vanilla JS + CSS. No heavy engine. Touch and mouse both work.

## 驗收

閘門報告見 [ACCEPTANCE.md](./ACCEPTANCE.md)（百萬用戶級；能玩 ≠ 通過）。
