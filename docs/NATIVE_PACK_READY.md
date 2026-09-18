# Native Android packaging readiness (ColorTube Sort)

> AppId: `com.lancechung.colortubesort` · Capacitor 6 · **No Play approval / real AdMob / real Billing IDs required for this checklist.**  
> Verified in packaging environment: **2026-09-19** (Asia/Taipei).  
> Out of scope here: UA creatives, real unit IDs, enabling fake free `remove_ads`.  
> **Do not claim ship-ready** from this doc alone.

---

## Status at a glance

| Item | Status |
|------|--------|
| Capacitor / AdMob / Billing npm deps present | **DONE** |
| `npm run build:www` (`scripts/sync-www.sh`) | **DONE** |
| Web load order: `ads.js` / `billing.js` before `game.js` | **DONE** |
| Test AdMob App IDs in `capacitor.config.json` | **DONE** (Google sample) |
| Test AdMob unit IDs + `USE_TEST_ADS=true` in `assets/js/ads.js` | **DONE** |
| Billing skeleton (`assets/js/billing.js`, product `remove_ads`) | **DONE** (no fake grant) |
| `npx cap add android` in this environment | **DONE** (local `android/` generated; **gitignored**) |
| `npx cap sync` + plugins discovered | **DONE** (AdMob + NativePurchases) |
| AdMob `APPLICATION_ID` Manifest patch | **SCRIPT READY** (`scripts/patch-android-admob.sh`; run after sync / via `aab:internal`) |
| JDK 17 + Android SDK on this packaging box | **DONE** (`JAVA_HOME=/home/box/sdk/jdk-17.0.20.1+1`, `ANDROID_HOME=/home/box/sdk/android`) |
| Release signing + `bundleRelease` AAB | **MACHINE-DEPENDENT** (keystore local; see signing §) |
| Play Console / real AdMob / real IAP IDs | **OUT OF SCOPE** (post-approval; see checklist) |

---

## Checkbox detail

### DONE in repo (no Play / real IDs needed)

- [x] **Capacitor deps** in `package.json`:
  - `@capacitor/core` ^6.2.0
  - `@capacitor/cli` / `@capacitor/android` ^6.2.0 (dev)
  - `@capacitor-community/admob` ^6.2.0
  - `@capgo/native-purchases` ^6.0.42
- [x] **`webDir`**: `www/` via `capacitor.config.json`; sync script `scripts/sync-www.sh` (`npm run build:www`).
- [x] **Test AdMob App IDs** (`capacitor.config.json` → `plugins.AdMob`):
  - Android: `ca-app-pub-3940256099942544~3347511713`
  - iOS: `ca-app-pub-3940256099942544~1458002511`
  - `initializeForTesting: true`
  - Notes: `capacitor.config.notes.md`
- [x] **Test AdMob unit IDs** in `assets/js/ads.js` (`TEST_UNITS`, `USE_TEST_ADS = true`); `PROD_UNITS` placeholders only.
- [x] **Billing skeleton** in `assets/js/billing.js`:
  - Product ID constant `remove_ads` (matches config / Play checklist)
  - Non-native / missing plugin → **does not** grant `removeAds`
  - Fake IAP only via `localStorage.colorTubeSort_devIap===1` (game.js; default off)
- [x] **Script order** in `index.html` / synced `www/index.html`:
  ```text
  levels.js → ads.js → billing.js → analytics.js → game.js
  ```
- [x] **Native templates** for post-`cap add` Manifest / Billing / build: `native-templates/android/README.md`
- [x] **Idempotent patch script**: `scripts/patch-android-admob.sh` (strings `admob_app_id` + Manifest `APPLICATION_ID` + `BILLING` permission)
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

- [ ] Play Console app + internal testing track
- [ ] Real AdMob App ID + interstitial/rewarded unit IDs (`USE_TEST_ADS=false`)
- [ ] Play product `remove_ads` enabled + license testers
- [ ] Device-verified SDK ads + real Billing purchase path
- [ ] Release keystore + signed AAB upload to Play

See `docs/PLAY_POST_APPROVAL_CHECKLIST.md`. **Do not claim the app is published** until listing is live. **Do not mark MILLION_USER_BAR #7 Pass** from Manifest patch alone.

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

**DONE (repo + this env):** Capacitor deps, test AdMob IDs in config + `ads.js`, billing skeleton, `index.html` script order, `build:www`, `cap add android` + `cap sync` with both plugins, idempotent Manifest patch script, JDK 17 + ANDROID_HOME on this box, signing steps documented.

**NOT ship-ready / #7 still Fail:** Device-verified AdMob SDK ads, real `remove_ads` IAP, Play approval, real unit IDs. Manifest patch prevents init crash with the **Google sample** App ID only.

**OUT OF SCOPE:** Real AdMob/Billing IDs, Play approval, UA creatives, enabling free/fake `remove_ads`.

---

Also see operational acceptance: [`docs/NATIVE_ACCEPTANCE.md`](NATIVE_ACCEPTANCE.md) (`npm run native:check` / `npm run aab:internal`).
