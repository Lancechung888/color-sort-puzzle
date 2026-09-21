# ColorTube Sort — Design & Monetization

## USP (unique selling points)

- **Instant clarity:** Glass tubes + saturated liquids read in under a second; one-thumb pour loop.
- **Satisfying pours:** Lift, tilt, stream, splash particles, complete-tube glow + light screen shake — dopamine without complex systems.
- **Fair difficulty curve:** Levels 1–5 teach the rule; later levels add colors, height, and tube count without timers or lives.
- **Progression juice:** 3-star ratings, coins, daily streak / 今日挑戰, unlockable themes (經典玻璃、霓虹夜店、療癒貓咪色).
- **English-first default UI:** store / ASO / default strings in English for global hybrid-casual; Traditional Chinese is secondary localization only (see STORE.md).
- **Lightweight:** Opens as static HTML — fast loads, easy WebView wrap for stores.

## Why people keep playing (attraction hooks)

| Hook | What it does |
|------|----------------|
| Visual juice | Better glass tubes, pour splash, confetti, glow on complete tube, soft shake |
| Stars | 3★ if under par & no undo; 2★ within 1.5× par; 1★ clear — replay incentive. **L-PAR:** every level ships explicit `par` from shortest pour path (BFS) or heuristic depth with Day1 +1 / late ~+10% slack — never `par < opt` (fixes early impossible 3★). |
| Coins | +8 / +15 / +28 by stars; persist in localStorage; spend on hints / themes |
| Daily streak | Login streak + soft coin bonus; **Daily Challenge** = progress-scaled base + date-seeded color/layout remix + crowded lids + Crowded/Remixed/Pressure par tier (not a mainline skin) |
| Themes | Free classic glass; neon / cat skins locked behind coins or mock IAP |
| Onboarding | Soft tip only on level 1 |
| Premium win modal | Stars animate in, coins earned, clear CTA to next / shop |

## Core loop

Select → Pour (legal) → Sort → Win (stars + coins) → Next level. Undo / Restart reduce rage-quits; Hint is the rewarded-ad + coin sink.

## Monetization points (feel real; stubs until store SDKs)

| Surface | Product | Notes |
|---------|---------|--------|
| 商店 · 去除廣告 | One-time IAP (~NT$99) | Skips interstitial stub; UI shows「已去除廣告」 |
| 商店 · 主題包 | Neon / Cat | 280 coins **or**「用真錢解鎖」mock IAP |
| 商店 · 提示包 ×5 | Consumable | Coins or IAP; freeHints counter |
| 商店 · 無限撤銷（本關） | Soft IAP | Undos don't hurt star rating this level |
| Fail-loop (tiered) | Soft sheet | Early levels (index **&lt; 15**): after **5** restarts; L16+ (index ≥ 15): after **2**. 「看廣告繼續」vs「去除廣告（即將開放）」vs skip |
| Hint button (no free) | Paywall sheet | Rewarded ad / **25** coins / buy pack |

**TODO / honesty (not ship-ready):** AdMob Capacitor plugin + Android **prod** App/unit IDs are wired (**REAL-ADMOB-IDS**; `USE_TEST_ADS=false`). Android **#7 Pass** via **DEVICE-THREE-GREEN** (Seeker 2026-09-21; interstitial + rewarded full-watch + remove_ads purchase+restore; see `docs/DEVICE_THREE_GREEN.md`). Shop「去除廣告」stays **Coming soon / needs store account** on web and does **not** set `removeAds` unless a real Billing success (DEV flag `localStorage.colorTubeSort_devIap=1` must stay OFF in uploaded AABs). iOS AdMob App ID still Google sample until an iOS app exists. Gate still **CLOSED**: MILLION_USER_BAR **#1/#3 Partial**; Production / soft-launch forbidden.

## Economy (accepted ruling)

- Start: **120** coins + **3** free hints.
- Win: **+8 / +15 / +28** by 1/2/3 stars (replay half reward if not improving stars).
- Daily first clear: **+40** bonus.
- Daily login streak: soft **min(10, 3+streak)** coins.
- Hint: **25** coins if no free hints (else paywall).
- Theme: **280** coins each; real-money IAP = **即將開放** until Billing/StoreKit.
- Hint pack: **120** coins → ×5 (IAP path gated).
- Fail-loop soft prompt: threshold **5** for level index **&lt; 15**; threshold **2** from level **16+** (index ≥ 15).
- 今日挑戰: adaptive near progress `clamp(maxUnlocked-2 + seed%5, 3, last)` — **not** a hard late-catalog pull.

## ~US$300 / month path (sketch)

Assumptions: soft launch TW / SE Asia, ~2–4k MAU, hybrid-casual retention, ARPDAU in the $0.03–0.08 band once ads + one IAP are live.

| Source | Model | Rough share of $300 |
|--------|--------|---------------------|
| Interstitial | After fail-loop (not mid-pour); skipped if 去除廣告 | ~$100 |
| Rewarded video | Hint / continue / soft prompts | ~$90 |
| Remove-ads IAP | One-time ~US$2.99–4.99 | ~$70 |
| Theme / hint packs | Small IAPs + coin sinks driving rewarded | ~$40 |

**Guardrails:** Never interrupt mid-pour; cap fail-loop prompts; rewarded always optional. Remove-ads disables interstitial; rewarded can remain as optional bonus.

**Scale path:** More theme packs, level packs, season daily challenges — keep base 35+ levels free and completable.


## 蓋子管 (cap module) — density-locked curve

**蓋子管** USP: optional `caps:[bool…]` + `modules:['cap']` + `teach:'cap'`. Capped tubes cannot pour in/out. **One-tap uncap** (tap lid opens immediately; **not a move**; undo can re-lid). Holding liquid + tap capped dest → drop selection and open lid (never pours into a lid). Signature uncap juice (WebAudio + lid flip + sparks).

### Cap curve (master ruling)

| Band | Rule |
|------|------|
| L1–2 | **Pure pour**, **zero** caps — teach pour only |
| L3 | 2 colors + **1 cap** + `teach:'cap'` |
| L4–5 | Light caps (≤2), mostly 3-color |
| L6+ | Mainline cap density **40–60%**; consecutive uncapped **≤3**; **≤2** caps/level; no worthless empty/complete-only caps |
| 4-color | Delayed until after solid 3-color stretch (~L11) |

Body: **80** levels (handcrafted early + reverse-scramble + `applyCaps`). Never interrupt mid-pour.

## Non-goals (v1)

No multiplayer, no account, no energy system, no real ad/IAP SDK until store build.

## 百萬用戶品質槓桿（上架前必讀）

完整 Pass/Fail 標準見 **[MILLION_USER_BAR.md](./MILLION_USER_BAR.md)**。對齊榜上第一梯隊 hybrid-casual；**未全過不准上架**。**禁止 soft-launch**，直到該槓桿全部 Pass。百萬下載另需買量，產品側不承諾自然百萬。
