# Play IAP + AdMob setup — after Play app created

**Play app (2026-09-21):** ColorTube Sort: Lid Puzzle  
**Play app ID:** `4972040404691889159`  
**Developer ID:** `4855566140857059448`  
**Package:** `com.lancechung.colortubesort`  
**Repo slots:** `assets/js/billing.js` → `REMOVE_ADS = 'remove_ads'` · `assets/js/ads.js` → `PROD_UNITS` + `USE_TEST_ADS` · `capacitor.config.json` → `plugins.AdMob.appIdAndroid`

> Do **not** mark monetization gate Pass / #7 until real AdMob unit IDs are in the release build.  
> Support email still placeholder — replace before final policy submit.

---

## A. Create `remove_ads` ($2.99) — Play Console

1. Open Play Console → **ColorTube Sort: Lid Puzzle** → **Monetize with Play** → **Products** → **In-app products** → **Create product**.
2. Fill:

| Field | Value |
|-------|--------|
| **Product ID** | `remove_ads` (immutable; must match code) |
| **Name** | Remove Ads |
| **Description** | Removes interstitial ads. Optional rewarded ads may remain. |
| **Default price** | **USD 2.99** (activate other countries / Play suggests) |
| **Status** | Active |

3. **Product type:** one-time / managed / **non-consumable** (not consumable, not subscription).
4. Save → Activate.
5. **License testing:** Play Console → **Settings** → **License testing** → add tester Gmail(s). Internal-test builds use these for free purchases.
6. **Do not** enable `colorTubeSort_devIap` / any fake IAP flag in AAB.

**Verify later (internal test):** buy → own; restore; kill app → still owned; interstitials skipped when owned.

---

## B. AdMob — link Play app, then create units

### B1. Add / link app
1. [AdMob](https://admob.google.com/) → **Apps** → **Add app**.
2. Platform: **Android** → Yes, app is on Google Play → search **ColorTube Sort** / package `com.lancechung.colortubesort` → select the Play listing.
3. Copy **AdMob App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (tilde `~`).

### B2. Create ad units (same AdMob app)
1. **Ad units** → **Add ad unit** → **Interstitial**  
   - Name: `cts_interstitial_android`  
   - Copy unit ID: `ca-app-pub-XXXX/IIII` (slash `/`)
2. **Add ad unit** → **Rewarded**  
   - Name: `cts_rewarded_android`  
   - Copy unit ID: `ca-app-pub-XXXX/RRRR`

### B3. Report back (paste this block to 上架變現 / CEO)

```
AdMob App ID (Android): ca-app-pub-3904450574947460~6670970617   (REAL-ADMOB-IDS — wired)
Interstitial unit:      ca-app-pub-3904450574947460/2731725604
Rewarded unit:          ca-app-pub-3904450574947460/8768677032
Play package confirmed: com.lancechung.colortubesort
```

### B4. Repo swap (only after real IDs exist — 上架變現 / 原生包工程)
1. `capacitor.config.json` → `plugins.AdMob.appIdAndroid` = real App ID; testing init **false** for release.
2. `assets/js/ads.js` → fill `PROD_UNITS.interstitial.android` + `PROD_UNITS.rewarded.android`.
3. Release / internal AAB: `USE_TEST_ADS = false`.
4. Never leave Google sample `3940256099942544` IDs in a signed release.

**Historical:** before **REAL-ADMOB-IDS**, keep sample IDs + `USE_TEST_ADS = true`. **Current (2026-09-21):** Android prod IDs wired + `USE_TEST_ADS=false` / internal `1.0.2-internal-vc3-prodAdMob` — see `docs/ADMOB_POST_LINK_CHECKLIST.md` (**PLAY-PASTE-VC3-SYNC**). Do **not** roll back to sample IDs as current advice. **#7 still Fail** until device three green lights.

---

## C. Still blocked / out of scope

| Item | Status |
|------|--------|
| Support email in privacy HTML | Waiting on user |
| iOS AdMob units | After iOS app / later |
| Bus Jam / UA creatives | Out of scope for this ticket |
| Claiming #7 / monetization Pass | **Forbidden** until real IDs + QA green |

---

*Ops note for sprint 2026-09-21. Source: CEO Play app create confirmation + repo billing/ads stubs.*
