# ColorTube Sort — Analytics event table

Stable event names. Client sink: `assets/js/analytics.js` → `console.info('[Analytics]', …)` until a GA4/Firebase provider is set via `ColorTubeAnalytics.setProvider`.

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

## Provider hook (later)

```js
ColorTubeAnalytics.setProvider(function (event, params) {
  // gtag('event', event, params) or Firebase logEvent
});
```

No retention optimization claims until these events land in a backend and a D1 report is built from `session_start` / `first_open`.
