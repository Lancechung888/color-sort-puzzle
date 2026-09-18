# Monetization SDK wiring

Browser / Capacitor bridges:

| Layer | File | Global | Status |
|-------|------|--------|--------|
| AdMob JS | `assets/js/ads.js` | `window.ColorTubeAds` | **Done**（`USE_TEST_ADS=true` + PROD placeholders；外掛缺失時保留 stub） |
| Billing skeleton | `assets/js/billing.js` | `window.ColorTubeBilling` | **Skeleton**（`@capgo/native-purchases`；非 native／外掛缺失 → **不發放**） |
| Game wiring | `assets/js/game.js` | shop / stubs | 接上 Billing；假 IAP 僅 `colorTubeSort_devIap===1` |

Load order（`index.html`／`www/index.html`）：

`levels.js` → `ads.js` → `billing.js` → `game.js`

## Init / ship order

1. **AdMob rewarded** → `showRewardedStub` / `ColorTubeAds.showRewarded`  
   - Call `onReward` only after the user earns the reward.
2. **AdMob interstitial** → `showInterstitialStub` / `ColorTubeAds.showInterstitial`  
   - Skip when `save.removeAds === true`. Never mid-pour.
3. **remove_ads IAP** → `ColorTubeBilling.purchaseRemoveAds`（真 Billing）  
   - On success only: merge `removeAds: true` into `localStorage` key `colorTubeSort_v2`.  
   - Web／外掛缺失：toast「即將開放／需商店帳號」，**不**寫入權益（ACCEPTANCE P0①）。

## Product IDs

| productId | Type | Status |
|-----------|------|--------|
| `remove_ads` | non-consumable | Billing skeleton wired |
| `theme_neon` / `theme_cat` | IAP | mock gated only |
| `hint_pack_5` | consumable | mock gated only |
| `infinite_undo_level` | soft unlock | mock gated only |

## Capacitor plugins

```text
@capacitor-community/admob@^6.2.0          # Cap 6
@capgo/native-purchases@^6.0.42            # Cap 6 peer
```

過審後逐步操作（建立 App、AdMob 單元、換正式 ID、建 `remove_ads`、打 AAB）：見 **`docs/PLAY_POST_APPROVAL_CHECKLIST.md`**。  
設定註解：`capacitor.config.notes.md`。Manifest 片段：`native-templates/android/README.md`。

See `STORE.md` for ASO copy, Data safety, and Android-first publish order.  
**Do not claim the app is published** until Play listing is live.
