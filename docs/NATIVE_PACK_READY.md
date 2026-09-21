# Native Android packaging readiness (ColorTube Sort)

> AppId: `com.lancechung.colortubesort` · Capacitor 6 · **Play developer account APPROVED** (2026-09-21 Asia/Taipei).  
> Verified in packaging environment: **2026-09-21** (Asia/Taipei). Packaging checklist itself still needs **no** real AdMob / real Billing IDs.  
> Out of scope here: UA creatives, real unit IDs, enabling fake free `remove_ads`, production publish.  
> Aligns with `docs/PLAY_POST_APPROVAL_CHECKLIST.md` / `MILLION_USER_BAR` — **#7 AdMob remains Fail**. **REAL-ADMOB-IDS** (2026-09-21): Android prod App/unit IDs + `USE_TEST_ADS=false` wired in repo; **still Fail** until device three green lights (interstitial, rewarded full-watch, remove_ads purchase+restore). Do **not** mark #7 Pass from wiring alone.  
> **Do not claim ship-ready** from this doc alone.
> Marker: **NATIVE-VC3-INTERNAL-SYNC** (current internal = `1.0.2-internal-vc3-prodAdMob` / vc3 / prod AdMob; historical **NATIVE-INTERNAL-TESTING-SYNC** = `1.0.1-internal-vc2-testids`; #7 still Fail).  
> Also: **PLAY-PASTE-VC3-SYNC** / **INTERNAL-TESTER-SYNC** / **INTERNAL-TESTER-HANWEN-SYNC** — paste docs + tester Gmail honesty (`lancechung@gmail.com` + `hanwen16888@gmail.com` / ColorTube-internal / opt-in URL).

---

## Status at a glance

| Item | Status |
|------|--------|
| Capacitor / AdMob / Billing npm deps present | **DONE** |
| `npm run build:www` (`scripts/sync-www.sh`) | **DONE** |
| Web load order: `levels.js` → `game.js` then ads/billing/analytics (**SCRIPT-ORDER**) | **DONE** |
| Test AdMob App IDs in `capacitor.config.json` | **DONE** (Google sample) |
| Test AdMob unit IDs + `USE_TEST_ADS=true` in `assets/js/ads.js` | **DONE** (historical; superseded by REAL-ADMOB-IDS) |
| **REAL-ADMOB-IDS** Android prod App ID + interstitial/rewarded + `USE_TEST_ADS=false` | **DONE in repo** (2026-09-21 Asia/Taipei). Device three-green **not** met → **#7 still Fail** |
| Play `versionCode` 4 / `versionName` 1.0.3 (`ANDROID-VERSION-CODE-4`) | **SCRIPT READY** (`scripts/patch-android-version.sh` defaults; next theme1tap AAB). Prior Play upload used **vc3** / 1.0.2 (`ANDROID-VERSION-CODE-3`) |
| Billing skeleton (`assets/js/billing.js`, product `remove_ads`) | **DONE** (no fake grant) |
| `npx cap add android` in this environment | **DONE** (local `android/` generated; **gitignored**) |
| `npx cap sync` + plugins discovered | **DONE** (AdMob + NativePurchases) |
| AdMob `APPLICATION_ID` Manifest patch | **SCRIPT READY** (`scripts/patch-android-admob.sh`; run after sync / via `aab:internal`) |
| Play Billing Library ≥8 (Cap6 plugin pin 6.2.1) | **SCRIPT READY** (`scripts/patch-android-billing-8.sh` → 8.3.0 + PendingPurchasesParams + QueryProductDetailsResult + minSdk 23; hooked in `aab:internal`) |
| Launcher ICON A + branded splash (vs stock Capacitor) | **DONE** (`scripts/apply-android-icons.sh` ← `native-templates/android/res/` from finals ICON A; hooked in `aab:internal`) |
| JDK 17 + Android SDK on this packaging box | **DONE** (`JAVA_HOME=/home/box/sdk/jdk-17.0.20.1+1`, `ANDROID_HOME=/home/box/sdk/android`) |
| Release signing + `bundleRelease` AAB | **DONE on this packaging box** (2026-09-19 + **2026-09-21**): `npm run aab:internal` → signed AABs. Durable copies under `/workspace/colortube-artifacts/` including **vc3 prodAdMob** (`ColorTubeSort-internal-20260921-1420-prodAdMob-vc3-release.aab`, `…-1424-vc3-prodadmob-release.aab`) and historical **vc2 testids** (`…-1312-vc2-billing8-testids-release.aab`) |
| Play `versionCode` / `versionName` | **SCRIPT READY** (`scripts/patch-android-version.sh` → **versionCode 4** / **versionName 1.0.3**; accept `ANDROID-VERSION-CODE-4`; hooked in `aab:internal` after Billing-8, before AdMob). Prior Play internal upload used **vc3** / 1.0.2 (`ANDROID-VERSION-CODE-3`); earlier **vc2** / 1.0.1-testids. |
| Play developer account | **APPROVED** (2026-09-21 Asia/Taipei) — see `docs/PLAY_POST_APPROVAL_CHECKLIST.md` |
| Play **internal testing** track | **UPLOADED current** (2026-09-21 Asia/Taipei): release `1.0.2-internal-vc3-prodAdMob` / **versionCode 3** / **versionName 1.0.2** / Billing≥8 / **prod AdMob** (`USE_TEST_ADS=false`). Historical prior: `1.0.1-internal-vc2-testids` / vc2 / sample IDs (superseded). Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com` (selected for vc3 prodAdMob); license testers **RESPOND_NORMALLY**; opt-in `https://play.google.com/apps/internaltest/4701709602422954921` (**INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**). **Not** production. **#7 still Fail** (device three green lights open). |
| Play Console real AdMob / real IAP IDs / production publish | **Android AdMob IDs wired (REAL-ADMOB-IDS)**; IAP device verify + production publish still open. **#7 still Fail** until three green lights. |

---

## Checkbox detail

### DONE in repo (no Play / real IDs needed)

- [x] **Capacitor deps** in `package.json`:
  - `@capacitor/core` ^6.2.0
  - `@capacitor/app` ^6.0.3 (hardware/gesture back → BACK-NAV; `appStateChange` → CAP-APP-STATE draft flush + wake sync)
  - `@capacitor/cli` / `@capacitor/android` ^6.2.0 (dev)
  - `@capacitor-community/admob` ^6.2.0
  - `@capgo/native-purchases` ^6.0.42
- [x] **`webDir`**: `www/` via `capacitor.config.json`; sync script `scripts/sync-www.sh` (`npm run build:www`).
- [x] **Test AdMob App IDs** (`capacitor.config.json` → `plugins.AdMob`):
  - Android: `ca-app-pub-3940256099942544~3347511713`
  - iOS: `ca-app-pub-3940256099942544~1458002511`
  - `initializeForTesting: true`
  - Notes: `capacitor.config.notes.md`
- [x] **Test AdMob unit IDs** (historical) in `assets/js/ads.js` (`TEST_UNITS`).
- [x] **REAL-ADMOB-IDS** (2026-09-21): `PROD_UNITS` Android interstitial `…/2731725604` + rewarded `…/8768677032`; `USE_TEST_ADS = false`; `capacitor.config.json` Android App ID `…~6670970617`; `initializeForTesting: false`; iOS App ID still Google sample (no iOS app yet).
- [x] **Billing skeleton** in `assets/js/billing.js`:
  - Product ID constant `remove_ads` (matches config / Play checklist)
  - Non-native / missing plugin → **does not** grant `removeAds`
  - Fake IAP only via `localStorage.colorTubeSort_devIap===1` (game.js; default off)
- [x] **Script order** in `index.html` / synced `www/index.html`:
  ```text
  levels.js → game.js → ads.js → billing.js → analytics*.js
  ```
  Playable first (SCRIPT-ORDER); monetization/analytics load after game.js.
- [x] **Native templates** for post-`cap add` Manifest / Billing / build: `native-templates/android/README.md`
- [x] **Idempotent patch script**: `scripts/patch-android-admob.sh` (strings `admob_app_id` + Manifest `APPLICATION_ID` + `BILLING` permission)
- [x] **Play Billing Library ≥8** (Play Console rejects <8.0.0): Cap6 `@capgo/native-purchases@6.0.42` pins `billing:6.2.1` + deprecated Billing 6 APIs. Idempotent `scripts/patch-android-billing-8.sh` bumps to `8.3.0`, applies Cap7-style `PendingPurchasesParams` + `QueryProductDetailsResult`, forces the dep in `android/app/build.gradle`, and raises `minSdkVersion` to 23 (Billing 8 requirement). Hooked after `cap sync` in `scripts/build-internal-aab.sh`. **Does not** upgrade Capacitor to 7/8.
- [x] **Post-approval ops** (when Play/AdMob ready): `docs/PLAY_POST_APPROVAL_CHECKLIST.md`

### DONE in this packaging environment (local only)

- [x] Ran `npx cap add android` → success (~2026-09-19 03:46 CST). Created local `android/` (listed in `.gitignore`; **not** committed).
- [x] Ran `npx cap sync android` after `npm install` → plugins:
  - `@capacitor-community/admob@6.2.0`
  - `@capgo/native-purchases@6.0.42`
- [x] Confirmed sync **does not** inject AdMob `APPLICATION_ID` meta-data or `admob_app_id` string — **must** run `bash scripts/patch-android-admob.sh` (also hooked after `cap sync` inside `npm run aab:internal`).
- [x] **JDK 17 + Android SDK** installed on this box:
  - `JAVA_HOME=/home/box/sdk/jdk-17.0.20.1+1`
  - `ANDROID_HOME=/home/box/sdk/android`
  - Gradle can compile; Manifest patch is still required for AdMob native init.

### DONE this packaging box — signed internal AAB (2026-09-19 + 2026-09-21 Asia/Taipei)

- [x] `npm install` + `npm run aab:internal` (build:www → `cap sync` → Billing≥8 patch → versionCode **3** patch → AdMob Manifest patch → `bundleRelease`)
- [x] Plugins on sync: AdMob 6.2.0, App 6.0.3, Haptics 6.0.3, NativePurchases 6.0.42
- [x] `validateSigningRelease` / `signReleaseBundle` succeeded (upload keystore via local `android/keystore.properties`)
- [x] Artifacts under `/workspace/colortube-artifacts/`:
  - 2026-09-19: `ColorTubeSort-internal-20260919-release.aab` (~6.1 MB; early build)
  - 2026-09-21 (historical): **versionCode 2** / **versionName 1.0.1** + Billing≥8 + **test AdMob IDs** — e.g. `ColorTubeSort-internal-20260921-1312-vc2-billing8-testids-release.aab` (+ 1309 vc2 copy)
  - 2026-09-21 (**current**): **versionCode 3** / **versionName 1.0.2** + Billing≥8 + **prod AdMob** — `ColorTubeSort-internal-20260921-1420-prodAdMob-vc3-release.aab`, `ColorTubeSort-internal-20260921-1424-vc3-prodadmob-release.aab`
- [x] **Play developer account APPROVED** (2026-09-21 Asia/Taipei). Prior internal upload attempt blocked because **versionCode 1** was already used — rebuild with versionCode 2 done; then **vc3 prodAdMob**.
- [x] Play **internal testing** track **UPLOADED** (2026-09-21 Asia/Taipei): **current** release name `1.0.2-internal-vc3-prodAdMob` / **versionCode 3** / **versionName 1.0.2** / Billing≥8 / **prod AdMob** (`USE_TEST_ADS=false`). Historical: `1.0.1-internal-vc2-testids` / vc2 / sample IDs (superseded; **NATIVE-INTERNAL-TESTING-SYNC**). Package `com.lancechung.colortubesort`. Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com` (selected for vc3 prodAdMob); license testers **RESPOND_NORMALLY**; opt-in `https://play.google.com/apps/internaltest/4701709602422954921` (**INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**). **Do not** mark MILLION_USER_BAR **#7 Pass** from AAB upload / tester config alone — need device three green lights.

### Still required on each machine that owns `android/`

1. After `cap add` / `cap sync`, run **`bash scripts/patch-android-admob.sh`** (or `npm run aab:internal`, which calls it).
2. Without the patch, AdMob SDK init **crashes** for missing `APPLICATION_ID`.
3. Other developer machines: install JDK 17+ and Android SDK; export `JAVA_HOME` / `ANDROID_HOME` (or `android/local.properties` → `sdk.dir`).

```bash
cd /path/to/color-sort-puzzle
npm install
npm run build:www
npx cap add android         # first time only (if android/ absent)
npx cap sync
bash scripts/patch-android-admob.sh
# optional: npm run aab:internal   # sync → patch → bundleRelease
# or: cd android && ./gradlew assembleDebug
```

### Still external (intentionally not done — not Pass for #7)

- [ ] Play Console **store listing** / open testing / production (internal testing **vc3 prodAdMob** AAB already live; testers configured — see **INTERNAL-TESTER-SYNC**; device three green lights open)
- [x] Real AdMob Android App ID + interstitial/rewarded unit IDs (`USE_TEST_ADS=false`) — **wired in repo (REAL-ADMOB-IDS)**
- [x] Internal tester list **ColorTube-internal** includes `lancechung@gmail.com` + `hanwen16888@gmail.com`; license testers **RESPOND_NORMALLY**; opt-in URL live (**INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**)
- [ ] Device three green lights (interstitial / rewarded full-watch / remove_ads purchase+restore) — **not met; #7 still Fail**
- [ ] Play product `remove_ads` **device-verified** Billing purchase path (Console product Active; license tester configured; purchase+restore on device still open)
- [ ] Device-verified SDK ads (no mid-pour ads) + real unit wiring
- [ ] Production / open testing publish (forbidden until monetization green lights)

See `docs/PLAY_POST_APPROVAL_CHECKLIST.md` / `MILLION_USER_BAR`. **Do not claim the app is published** until listing is live. **Do not mark MILLION_USER_BAR #7 Pass/Partial** from account approval, Manifest patch, or test-ID AABs alone.

---

## Signing steps (when keystore is configured)

Do this on the machine that can run Gradle.

1. Create an upload keystore (once; keep offline backup):
   ```bash
   keytool -genkey -v -keystore color-tube-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias color-tube
   ```
2. Prefer a **local** `android/keystore.properties` (gitignored) rather than committing secrets:
   ```properties
   storeFile=/absolute/path/color-tube-upload.jks
   storePassword=…
   keyAlias=color-tube
   keyPassword=…
   ```
3. Wire `signingConfigs` + `buildTypes.release.signingConfig` in `android/app/build.gradle` (Capacitor default has no release signing).
4. Build:
   ```bash
   npm run aab:internal
   # or: npm run build:www && npx cap sync && bash scripts/patch-android-admob.sh && cd android && ./gradlew bundleRelease
   ```
   AAB: `android/app/build/outputs/bundle/release/app-release.aab`
5. Upload to Play **internal testing**; verify test ads + that shop “remove ads” does **not** grant without a real Billing success.

---

## Commands cheat sheet

| Goal | Command |
|------|---------|
| Refresh Capacitor web assets | `npm run build:www` |
| Add Android platform (once) | `npm run cap:add:android` / `npx cap add android` |
| Sync web + plugins | `npm run cap:sync` |
| Patch AdMob Manifest / strings / BILLING | `bash scripts/patch-android-admob.sh` |
| One-shot internal AAB (sync → patch → bundle) | `npm run aab:internal` |
| Open in Android Studio | `npm run cap:android` |

`android/` and `ios/` stay **gitignored**. Re-run `cap add` / `cap sync` + **patch script** on each packaging machine; keep Manifest snippets aligned with `native-templates/android/`.

---

## DONE vs NOT Pass (acceptance for this packaging track)

**DONE (repo + this env):** Capacitor deps, **REAL-ADMOB-IDS** (Android prod App/units + `USE_TEST_ADS=false`), billing skeleton, `index.html` script order, `build:www`, `cap add android` + `cap sync` with both plugins, idempotent Manifest / Billing≥8 / **versionCode 4** patch scripts (prior vc3 uploaded), JDK 17 + ANDROID_HOME on this box, signing steps documented, signed internal AABs including **vc3 prodAdMob** (current) and historical **vc2 + billing8 + testids**, **Play developer account APPROVED** (2026-09-21 Asia/Taipei).

**NOT ship-ready / #7 still Fail:** Device three green lights (interstitial, rewarded full-watch, `remove_ads` purchase+restore). Repo wiring + internal AAB + tester Gmail ≠ #7 Pass. Production untouched. Testers configured (`lancechung@gmail.com` + `hanwen16888@gmail.com` / ColorTube-internal / RESPOND_NORMALLY) — **INTERNAL-TESTER-SYNC** · **INTERNAL-TESTER-HANWEN-SYNC**.

**OUT OF SCOPE:** Production publish, UA creatives, enabling free/fake `remove_ads`, Bus Jam.

---

Also see operational acceptance: [`docs/NATIVE_ACCEPTANCE.md`](NATIVE_ACCEPTANCE.md) (`npm run native:check` / `npm run aab:internal`).

### versionCode (Play uploads) — ANDROID-VERSION-CODE-4

- Play rejects reuse of the same `versionCode` (prior uploads used **1**, **2**, then **3**). After `cap sync`, run `bash scripts/patch-android-version.sh` (hooked in `npm run aab:internal` after Billing-8, before AdMob) to set **versionCode 4** / **versionName 1.0.3** (override via `COLOR_TUBE_VERSION_CODE` / `COLOR_TUBE_VERSION_NAME`). Repo `package.json` `"version"` aligns to **1.0.3**. Accept gate: `ANDROID-VERSION-CODE-4`. Does **not** claim MILLION_USER_BAR **#7 Pass**. Historical Play current remains `ANDROID-VERSION-CODE-3` / vc3 until the next internal upload.
