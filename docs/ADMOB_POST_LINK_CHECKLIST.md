# AdMob checklist — after Play package link

**Context (2026-09-21):** **Current** Play internal testing Active = `1.0.5-internal-vc6-iapBusy` / **versionCode 6** / **versionName 1.0.5** / Billing≥8 / **prod AdMob** (`USE_TEST_ADS=false`) / **UNCAP-ONE-TAP** + **IAP-PURCHASE-BUSY**. Historical: vc5 / 1.0.4 (`1.0.4-internal-vc5-uncap1tap`); vc4 / 1.0.3; `1.0.2-internal-vc3-prodAdMob` / vc3 (superseded; **NATIVE-VC3-INTERNAL-SYNC**); `1.0.1-internal-vc2-testids` / vc2 (superseded; **NATIVE-INTERNAL-TESTING-SYNC**). **REAL-ADMOB-IDS** wires Android prod App ID `ca-app-pub-3904450574947460~6670970617` + interstitial `…/2731725604` + rewarded `…/8768677032` with `initializeForTesting=false`. Play package `com.lancechung.colortubesort`. `remove_ads` IAP Active @ $2.99 in Console (device purchase+restore still open). Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com`; license testers **RESPOND_NORMALLY**; opt-in `https://play.google.com/apps/internaltest/4701709602422954921` (**INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**). Support email / GA4 `MEASUREMENT_ID` still external placeholders. Markers: **NATIVE-VC6-INTERNAL-SYNC** · **NATIVE-VC6-LOCAL-AAB-SYNC** · **PLAY-PASTE-VC6-SYNC** (historical vc5/vc3 markers).

**Rule:** Do **not** mark monetization Pass / #7 until device three green lights (interstitial, rewarded full-watch, remove_ads purchase+restore) — repo wiring alone is **not** enough.

---

## 0) Preconditions

- [x] Play app exists + package fixed: `com.lancechung.colortubesort`
- [x] Internal testing track has a build (**current Active:** `1.0.5-internal-vc6-iapBusy` / vc6 / 1.0.5 / prod AdMob / UNCAP-ONE-TAP + IAP-PURCHASE-BUSY)
- [x] License testers Gmail added — `lancechung@gmail.com` + `hanwen16888@gmail.com` / **RESPOND_NORMALLY** (**INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**)
- [x] Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com` (selected for `1.0.5-internal-vc6-iapBusy`); opt-in `https://play.google.com/apps/internaltest/4701709602422954921`
- [x] `remove_ads` product Active @ **$2.99** (Console); device purchase+restore still open → **#7 still Fail**
- [ ] Support email for privacy page (user)

---

## 1) Link Play app in AdMob

1. Open [AdMob](https://admob.google.com/) → **Apps** → **Add app** (or select existing Android app).
2. Platform **Android** → **Yes, app is listed on Google Play**.
3. Search package **`com.lancechung.colortubesort`** / title ColorTube Sort → select.
4. Confirm store listing link shows the correct Play app (ID `4972040404691889159`).
5. Copy **AdMob App ID** (`ca-app-pub-…~…` with tilde).

**Stop if package mismatch** — never create units under a wrong / unlinked app.

---

## 2) Create production units (same AdMob app)

| Unit | Format | Suggested name | Notes |
|------|--------|----------------|-------|
| Interstitial | `ca-app-pub-XXXX/YYYY` | `cts_interstitial_android` | Fail-loop / level-clear only — never mid-pour |
| Rewarded | `ca-app-pub-XXXX/YYYY` | `cts_rewarded_android` | Grant only after earn |

- [x] Interstitial created + ID copied (`…/2731725604`)  
- [x] Rewarded created + ID copied (`…/8768677032`)  
- [x] App ID (`~`) copied (`…~6670970617`)  

Optional: add your device as an AdMob **test device** while iterating; still use real unit IDs in next AAB, not Google sample app IDs.

---

## 3) Report format (paste to 上架變現 / CEO)

```
AdMob App ID (Android): ca-app-pub-____~____
Interstitial unit:      ca-app-pub-____/____
Rewarded unit:          ca-app-pub-____/____
Play package:           com.lancechung.colortubesort
remove_ads:             Active $2.99 (yes/no)
```

No placeholders. No sample `3940256099942544` IDs.

---

## 4) Repo + AAB swap (only after §3 real IDs)

1. `capacitor.config.json` → `plugins.AdMob.appIdAndroid` = real App ID; disable testing init for release.
2. `assets/js/ads.js` → fill `PROD_UNITS.interstitial.android` + `PROD_UNITS.rewarded.android`.
3. Set `USE_TEST_ADS = false`.
4. `npm run build:www` → `cap sync` → new **internal** AAB (name **without** `testids`).
5. Upload to Internal testing → testers verify:
   - [ ] Interstitial only fail-loop / clear  
   - [ ] Rewarded grants only after complete  
   - [ ] `remove_ads` purchase + restore; owned → no interstitial  
6. QA sign-off → then consider Pass / #7 (not before).

**Historical (before REAL-ADMOB-IDS):** sample IDs + `USE_TEST_ADS = true` + `*-testids` AAB (`1.0.1-internal-vc2-testids`). **Do not** roll back to that as the current track.

---

## 5) Explicit non-goals

- Bus Jam / UA creatives  
- Fake IAP / `colorTubeSort_devIap` in any uploaded AAB  
- Claiming #7 Pass on wiring / AAB upload alone (need device three green lights)  

See also: `docs/PLAY_IAP_ADMOB_SETUP.md` (full IAP + AdMob), `docs/PLAY_CONSOLE_PASTE_PACK.md`.

## Status update (2026-09-21) — **NATIVE-VC6-INTERNAL-SYNC** + **NATIVE-VC6-LOCAL-AAB-SYNC** + **INTERNAL-TESTER-SYNC** / **INTERNAL-TESTER-HANWEN-SYNC** / **PLAY-PASTE-VC6-SYNC**

- Android AdMob App ID + interstitial + rewarded **wired in repo** (Play store link may still 404 until listing public).
- `USE_TEST_ADS=false`, `initializeForTesting=false`.
- Play **internal testing** **UPLOADED current Active**: `1.0.5-internal-vc6-iapBusy` / versionCode **6** / **1.0.5** / Billing≥8 / prod AdMob / **UNCAP-ONE-TAP** + **IAP-PURCHASE-BUSY**. Historical: `1.0.4-internal-vc5-uncap1tap` / vc5; vc4 / 1.0.3; vc3 / vc2-testids superseded.
- Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com`; license testers **RESPOND_NORMALLY**; opt-in `https://play.google.com/apps/internaltest/4701709602422954921`.
- Active vc6 AAB **includes** **UNCAP-ONE-TAP** + **IAP-PURCHASE-BUSY**; the already-built ~18:26 AAB is uploaded as `1.0.5-internal-vc6-iapBusy` (**NATIVE-VC6-INTERNAL-SYNC** · **NATIVE-VC6-LOCAL-AAB-SYNC**).
- Device QA still open (**#7 still Fail**):
  - [ ] Interstitial only fail-loop / clear  
  - [ ] Rewarded grants only after complete  
  - [ ] `remove_ads` purchase + restore; owned → no interstitial  
- **Do not** mark #7 Pass until those three green lights. Production untouched. Paste pack / PLAY_CONSOLE_PASTE synced under **PLAY-PASTE-VC6-SYNC** (historical **PLAY-PASTE-VC5-SYNC** / **PLAY-PASTE-VC3-SYNC**; no “keep sample IDs + USE_TEST_ADS=true” as current advice).
