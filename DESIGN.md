# ColorTube Sort — Design & Monetization

## USP (unique selling points)

- **Instant clarity:** Glass tubes + saturated liquids read in under a second; one-thumb pour loop.
- **Satisfying pours:** Lift, tilt, stream, and settle — dopamine without complex systems.
- **Fair difficulty curve:** Levels 1–5 teach the rule; later levels add colors, height, and tube count without timers or lives.
- **TW / ZH-first UI:** 彩管分類 branding for Traditional Chinese markets; English fallback in docs.
- **Lightweight:** Opens as static HTML — fast loads, easy WebView wrap for stores.

## Core loop

Select → Pour (legal) → Sort → Win → Next level. Undo and Restart reduce rage-quits; Hint is the rewarded-ad hook.

## Monetization sketch (~US$300 / month target)

Assumptions: soft launch in TW/SE Asia, ~2–4k MAU, hybrid-casual retention.

| Source | Model | Rough share of $300 |
|--------|--------|---------------------|
| Interstitial | After fail-loop restarts (not every death) | ~$120 |
| Rewarded video | Optional **提示** unlock / extra undo pack | ~$100 |
| Remove-ads IAP | One-time ~US$2.99–4.99 | ~$80 |

**Guardrails:** Never interrupt mid-pour; cap interstitials (e.g. every 3rd fail-loop or every N minutes); rewarded is always optional. Remove-ads disables interstitial only; rewarded can remain as “bonus” or also unlock with IAP.

**Scale path:** Level packs / daily challenge as soft IAP later; keep base game free and fully completable.

## Non-goals (v1)

No multiplayer, no account, no energy system, no real ad SDK until store build.
