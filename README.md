# 彩管分類 ColorTube Sort

Portrait hybrid-casual **color / water tube sorting** puzzle. Tap a tube to pick its top liquid layers, tap another to pour when legal (empty or same top color, with enough free capacity). Clear each level by sorting so every tube is empty or a single solid color.

Traditional Chinese UI primary（關卡、撤銷、重來、提示、勝利）. English notes in this README and code comments.

## How to play

1. Open the game and tap **開始遊戲**.
2. Tap a tube with liquid to lift it (select).
3. Tap a valid destination tube to pour. Invalid targets briefly shake.
4. Use **撤銷** (Undo), **重來** (Restart), **提示** (Hint stub).
5. On win, tap **下一關** to continue. Progress is saved in `localStorage`.

**Rules:** You can only pour onto an empty tube or a tube whose top color matches the pouring color, and only as many layers as free slots allow. Contiguous same-color layers pour together.

## Run locally

```bash
cd /workspace/color-sort-puzzle
python3 -m http.server 8765
```

Then open **http://127.0.0.1:8765/** in a browser.

Or open `index.html` directly (file:// works for this vanilla build).

Optional Node static server:

```bash
npm start
```

## Project layout

```
color-sort-puzzle/
  index.html
  README.md
  DESIGN.md
  package.json
  assets/
    css/style.css
    js/levels.js    # 35 levels + palette
    js/game.js      # gameplay, undo, win, ad stubs
```

## Levels

35 levels: handcrafted early stages (1–10), then generated solvable stages with more colors, taller tubes (capacity 4–5), and more tubes. Difficulty rises steadily.

## Monetization stubs

In `assets/js/game.js`:

- `showInterstitialOnFailLoop()` — after several restarts without a win (console stub).
- `showRewardedHint()` — rewarded-ad gate before granting a hint (currently grants immediately + console stub).

No real ad SDKs are included.

## Mobile path (later)

### Capacitor (recommended for this HTML5 build)

1. `npm i -g @capacitor/cli` and `npm init @capacitor/app` (or add Capacitor to this folder).
2. Point `webDir` at this project root (or a `www` copy).
3. `npx cap add android` / `npx cap add ios`, then `npx cap sync`.
4. Open Android Studio / Xcode; plug AdMob via Capacitor community plugins for interstitial + rewarded.

### Godot export (alternative rewrite)

If you rewrite in Godot 4: export Android/iOS presets with custom package name, portrait orientation, and AdMob/GodotAds plugins. Not required for the current vanilla build.

## Tech

Single-page HTML5 + vanilla JS + CSS. No heavy engine. Touch and mouse both work.
