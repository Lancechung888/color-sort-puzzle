# AdMob checklist — after Play package link

**Context (2026-09-21):** Internal testing previously uploaded `1.0.1-internal-vc2-testids` / vc2 (Google **sample** AdMob IDs). **REAL-ADMOB-IDS** now wires Android prod App ID `ca-app-pub-3904450574947460~6670970617` + interstitial `…/2731725604` + rewarded `…/8768677032` with `USE_TEST_ADS=false` / `initializeForTesting=false` (versionCode **3** / 1.0.2 AAB). Play package `com.lancechung.colortubesort`. CEO creating `remove_ads` @ $2.99 in Console. Support email / license-tester Gmail still pending user.

**Rule:** Do **not** mark monetization Pass / #7 until device three green lights (interstitial, rewarded full-watch, remove_ads purchase+restore) — repo wiring alone is **not** enough.

---

## 0) Preconditions

- [x] Play app exists + package fixed: `com.lancechung.colortubesort`
- [x] Internal testing track has a build (currently **testids** — OK for smoke)
- [ ] License testers Gmail added (user)
- [ ] `remove_ads` product Active @ **$2.99** (CEO in progress)
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

- [ ] Interstitial created + ID copied  
- [ ] Rewarded created + ID copied  
- [ ] App ID (`~`) copied  

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

Until §3: keep sample IDs + `USE_TEST_ADS = true` + current `*-testids` AAB.

---

## 5) Explicit non-goals

- Bus Jam / UA creatives  
- Fake IAP / `colorTubeSort_devIap` in any uploaded AAB  
- Claiming #7 Pass on testids build  

See also: `docs/PLAY_IAP_ADMOB_SETUP.md` (full IAP + AdMob), `docs/PLAY_CONSOLE_PASTE_PACK.md`.

## Status update (2026-09-21)

- Android AdMob App ID + interstitial + rewarded **wired in repo** (Play store link may still 404 until listing public).
- `USE_TEST_ADS=false`, `initializeForTesting=false`.
- Next: native **versionCode 3** / **1.0.2** internal AAB **without** `testids` in name.
- **Do not** mark #7 Pass until device QA: interstitial / rewarded / remove_ads+restore green.
