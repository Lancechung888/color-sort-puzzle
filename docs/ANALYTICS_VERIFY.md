# Analytics verify (browser)

See the checklist in [ANALYTICS_EVENTS.md](./ANALYTICS_EVENTS.md#verification-checklist).

Quick filter in Console: `Analytics`

Optional: `ColorTubeAnalytics.setDebug(true)` (default on) / `ColorTubeAnalytics.getMeta()`.

## GA4 (optional)

1. Leave `MEASUREMENT_ID` empty → expect console `[Analytics] …` only; **no** `googletagmanager.com` requests.
2. Set a real `G-…` id in `assets/js/analytics-config.js`, reload → expect `[Analytics] GA4 provider attached` and Network hits to gtag.
3. In GA4 Admin → DebugView (or Realtime): confirm `session_start` / `level_start` after playing.
4. Never paste a fake id into default config; empty = intentional console-only.
