# Monetization SDK wiring (TODO)

Browser / Capacitor bridge: `assets/js/ads.js` (`window.ColorTubeAds`, `USE_TEST_ADS`). Load before `game.js`. Keep browser mock when plugin missing.

Align native plugins with stubs in `assets/js/game.js` (**Monetization stubs** section).

## Init / ship order

1. **AdMob rewarded** → replace `showRewardedStub(onReward, label)`
   - Call `onReward` only after the user earns the reward.
   - Used for: hint paywall, fail-loop「看廣告繼續」, other soft prompts.
2. **AdMob interstitial** → replace `showInterstitialStub(reason)`
   - Skip entirely when `save.removeAds === true`.
   - Do **not** show mid-pour.
3. **remove_ads IAP** → replace `mockIapPurchase('remove_ads', onSuccess)`
   - Google Play Billing / StoreKit 2.
   - On success: set `save.removeAds = true`, persist, refresh shop UI.

## Other product IDs (stubs today)

| Stub productId | Purpose |
|----------------|---------|
| `remove_ads` | One-time remove interstitial |
| `theme_neon` / `theme_cat` | Theme unlock IAP |
| `hint_pack_5` | Consumable hint pack |
| `infinite_undo_level` | Soft unlock undos this level |

## Capacitor plugins (when ready)

```text
# TODO: @capacitor-community/admob (or official AdMob Capacitor plugin)
# TODO: @capacitor-community/in-app-purchases or cordova-plugin-purchase / native Billing
```

See `STORE.md` for ASO copy, cost, and Android-first publish order.
