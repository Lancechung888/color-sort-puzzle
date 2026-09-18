# ColorTube Sort — Design & Monetization

## USP (unique selling points)

- **Instant clarity:** Glass tubes + saturated liquids read in under a second; one-thumb pour loop.
- **Satisfying pours:** Lift, tilt, stream, splash particles, complete-tube glow + light screen shake — dopamine without complex systems.
- **Fair difficulty curve:** Levels 1–5 teach the rule; later levels add colors, height, and tube count without timers or lives.
- **Progression juice:** 3-star ratings, coins, daily streak / 今日挑戰, unlockable themes (經典玻璃、霓虹夜店、療癒貓咪色).
- **TW / ZH-first UI:** 彩管分類 branding for Traditional Chinese markets; English fallback in docs.
- **Lightweight:** Opens as static HTML — fast loads, easy WebView wrap for stores.

## Why people keep playing (attraction hooks)

| Hook | What it does |
|------|----------------|
| Visual juice | Better glass tubes, pour splash, confetti, glow on complete tube, soft shake |
| Stars | 3★ if under par & no undo; 2★ within 1.5× par; 1★ clear — replay incentive |
| Coins | +10 / +20 / +40 by stars; persist in localStorage; spend on hints / themes |
| Daily streak | Login streak counter + soft coin bonus; **今日挑戰** = hard-ish daily pick |
| Themes | Free classic glass; neon / cat skins locked behind coins or mock IAP |
| Onboarding | Soft tip only on level 1 |
| Premium win modal | Stars animate in, coins earned, clear CTA to next / shop |

## Core loop

Select → Pour (legal) → Sort → Win (stars + coins) → Next level. Undo / Restart reduce rage-quits; Hint is the rewarded-ad + coin sink.

## Monetization points (feel real; stubs until store SDKs)

| Surface | Product | Notes |
|---------|---------|--------|
| 商店 · 去除廣告 | One-time IAP (~NT$99) | Skips interstitial stub; UI shows「已去除廣告」 |
| 商店 · 主題包 | Neon / Cat | 200 coins **or**「用真錢解鎖」mock IAP |
| 商店 · 提示包 ×5 | Consumable | Coins or IAP; freeHints counter |
| 商店 · 無限撤銷（本關） | Soft IAP | Undos don't hurt star rating this level |
| Fail-loop (3rd restart) | Soft sheet |「看廣告繼續」vs「去除廣告永久」vs skip (+ interstitial if not removed) |
| Hint button (no free) | Paywall sheet | Rewarded ad / 30 coins / buy pack |

**TODO in code:** Google Play Billing / StoreKit 2; AdMob interstitial + rewarded (e.g. Capacitor plugins).

## Economy (simple)

- Start: **100** coins + **2** free hints.
- Win: **+10 / +20 / +40** by 1/2/3 stars (replay half reward if not improving stars).
- Daily first clear: **+25** bonus.
- Daily login streak: soft **+5–15** coins.
- Hint: **30** coins if no free hints (else paywall).
- Theme: **200** coins each or IAP mock.
- Hint pack: **100** coins → ×5.

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

## Non-goals (v1)

No multiplayer, no account, no energy system, no real ad/IAP SDK until store build.
