# ColorTube Sort — Analytics event table

Stable event names. Client sink: `assets/js/analytics.js` → `console.info('[Analytics]', …)` always. Optional GA4: set `ColorTubeAnalyticsConfig.MEASUREMENT_ID` in `assets/js/analytics-config.js` (or `window.__COLOR_TUBE_GA4_ID__`) to a real `G-…` id; `analytics-ga4.js` then loads gtag and calls `setProvider`. Empty id = **no network** (honest console-only).

## Identity & D1

| Field | Source |
| --- | --- |
| `install_id` | Anonymous UUID in `localStorage` (`colorTubeAnalytics_v1`) |
| `first_open_at` | Epoch ms of first script load |
| `days_since_install` | Calendar-day delta (device local) from `first_open_at` to now |
| **D1 definition** | User with `days_since_install === 1` who fires `session_start` (or any gameplay event) on that calendar day. Do **not** claim D1 from level clears alone. |

Boot events (auto on script load):

| Event | When | Params |
| --- | --- | --- |
| `first_open` | Once per install | `first_open_at` |
| `session_start` | Every page load / cold start | `is_d1_return`, `is_returning`, + identity |

## Core gameplay

| Event | When | Required params | Notes |
| --- | --- | --- | --- |
| `level_start` | `loadLevel` for main path | `level_id` (1-based), `mode: "main"` | Not fired for daily (use `daily_start`) |
| `level_clear` | `showWin` main path | `level_id`, `mode: "main"`, `stars`, `moves`, `undos_used` | |
| `level_fail` | Fail-loop prompt shown (`showFailPrompt`) | `level_id`, `mode`, `fail_reason: "restart_loop"`, `restart_count` | Game has no hard lose; restart threshold is the fail signal |
| `daily_start` | `startDailyChallenge` / daily `loadLevel` | `mode: "daily"`, `daily_key` (YYYY-MM-DD), `level_id` (source board index if known) | |
| `daily_clear` | `showWin` in daily mode | `mode: "daily"`, `daily_key`, `stars`, `moves` | |

## Meta / retention

| Event | When | Required params | Notes |
| --- | --- | --- | --- |
| `streak_milestone` | Login claims Day 3 / 7 / 14 streak chest | `day`, `coins`, `hints`, `streak` | Soft daily +coins still apply separately; no punishment on miss |
| `first_three_star` | First time a main level reaches 3★ | `mode: "main"`, `level_id`, `bonus` | Bonus is on top of `STAR_REWARDS[3]` |
| `chapter_chest` | All levels in a 10-level chapter are 3★ (first claim) | `chapter`, `coins`, `hints`, `levels` | Replay reason for missing stars |

`level_clear` may also include `first_three_star` (bool) and `chapter_chest` (chapter # or 0).

## Economy / ads / IAP

| Event | When | Required params | Notes |
| --- | --- | --- | --- |
| `hint_used` | Hint actually applied (`applyHint` with a move) | `level_id`, `mode`, `source` (`free` \| `coins` \| `rewarded` \| `pack` \| `unknown`) | No event if no hint move |
| `rewarded_complete` | Rewarded ad earns reward (wrapper around `onReward`) | `placement` (`hint` \| `continue` \| …) | Fires only when reward callback runs |
| `iap_remove_ads` | `removeAds` granted after purchase success (native or DEV mock) | `product_id: "remove_ads"`, `source` (`play_billing` \| `dev_mock` \| `restore`) | Price lock $2.99 is store config, not a param |

## Verification checklist

1. Open game with DevTools Console.
2. Expect `[Analytics] first_open` (once) and `session_start`.
3. Start a main level → `level_start` with `level_id`.
4. Clear level → `level_clear`.
5. Restart until fail prompt → `level_fail`.
6. Use hint (free/coins/ad) → `hint_used`; ad path also → `rewarded_complete` with `placement: "hint"`.
7. Daily Challenge → `daily_start` then on clear `daily_clear`.
8. Successful remove-ads purchase → `iap_remove_ads`.
9. Login on streak Day 3/7/14 → `streak_milestone`.
10. First 3★ on a level → `first_three_star`; fill a 10-level chapter → `chapter_chest`.

## Provider hook (GA4 optional)

1. Create a GA4 property + Web (or Android) data stream; copy Measurement ID (`G-…`).
2. Set it in `assets/js/analytics-config.js`:

```js
ColorTubeAnalyticsConfig.MEASUREMENT_ID = 'G-XXXXXXXX'; // real id only
```

   Or at runtime before `analytics-ga4.js`: `window.__COLOR_TUBE_GA4_ID__ = 'G-XXXXXXXX'`.
3. Rebuild www: `npm run build:www`. Empty / missing id → provider stays idle (console only, no gtag request).
4. Manual override still works:

```js
ColorTubeAnalytics.setProvider(function (event, params) {
  // gtag('event', event, params) or Firebase logEvent
});
```

No retention optimization claims until events land in GA4 (or another backend) and a D1 report is built from `session_start` / `first_open`. Do **not** invent a Measurement ID.
