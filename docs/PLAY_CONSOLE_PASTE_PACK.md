# Play Console paste pack — ColorTube Sort (post-approval)

**App ID (package):** `com.lancechung.colortubesort`  
**Status:** Developer account approved (2026-09-21). Create the Play app next, then paste below.  
**Do not** claim AdMob production units or #7 Pass until real IDs exist.

---

## 1) Privacy policy URL (verified live HTTPS)

```
https://lancechung888.github.io/color-sort-puzzle/privacy/
```

- GitHub Pages: `main` → `/docs` · HTTP 200 confirmed 2026-09-21  
- Source: `docs/privacy/index.html` · markdown: `docs/PRIVACY_POLICY_EN.md`  
- **Still needed:** replace `[replace with public support email]` in policy HTML before final store submit

---

## 2) Store listing — EN primary (paste into default locale)

| Field | Value |
|-------|--------|
| **App name / Title** | `ColorTube Sort: Lid Puzzle` |
| **Short description** | `Water color sort — lids lock tubes. Uncap, pour, 3-star clears. Daily!` |

**Full description (EN):**

```
See the lid before you pour. ColorTube Sort — capped tubes lock; tap to uncap (free move), then pour and sort.

HOW TO PLAY
• Tap a tube to lift its top liquid layers, then tap a valid tube to pour
• Pour only into an empty tube, or one with the same top color and free space
• Clear a level when every tube is empty or a single solid color
• Matching contiguous layers pour together for a snappy, satisfying loop

WHY IT CLICKS
• Glass tubes, pour splash, complete-tube glow, and confetti on win
• 3-star ratings: beat the par and skip undo for a perfect clear
• Coins, hints, and unlockable themes — progress saves on device
• Daily Challenge + login streak so there’s always a reason to return
• No timers and no lives — play at your own pace

WHAT’S INSIDE
• 80+ levels: early stages teach the rule; later stages add colors, height, and more tubes
• Themes: Classic Glass, Neon Club, Cozy Cat (unlockable)
• Undo / Restart / Hint when you’re stuck

FREE TO PLAY + OPTIONAL PURCHASES
• The full puzzle loop is free
• Optional rewarded ads for hints or continue
• Optional one-time Remove Ads (skips interstitials; rewarded stays optional)
• Optional theme packs and hint packs

Download ColorTube Sort and turn messy tubes into clean colors.
```

**zh-Hant (TW/HK secondary only — not default):**

| Field | Value |
|-------|--------|
| **Title** | `彩管分類：揭蓋倒水益智` |
| **Short** | `有蓋倒不出。揭蓋、倒水、三星過關。今日挑戰免費解壓！` |

---

## 3) App content declarations

- [ ] **Ads:** Yes, contains ads  
- [ ] **In-app purchases:** Yes  
- [ ] **Privacy policy URL:** paste URL in §1  
- [ ] Target audience: **not** Designed for children (prefer 18+ or mixed / not primarily children)

---

## 4) Data safety — overview (paste answers)

| Question | Answer |
|----------|--------|
| Collect / share user data? | **Yes** |
| Encrypted in transit? | **Yes** |
| Users can request deletion? | **Yes** (clear app data / uninstall; ads/billing per Google) |

### Data types (typical AdMob + IAP — confirm vs live SDK)

| Type | Collect | Share | Purposes |
|------|---------|-------|----------|
| Device or other IDs | Yes | Yes (Google/ad partners) | Advertising; Fraud prevention |
| Approximate location | Yes (often via ads/IP) | Yes | Advertising |
| App interactions | Yes if AdMob analytics | Per SDK | Advertising / Analytics |
| Purchase history | Yes (if IAP) | Via Play | App functionality |
| Name / Email / Precise location / Mic / Camera | **No** | — | — |

Purposes must include **Advertising or marketing**.

Full checklist: `docs/PLAY_DATA_SAFETY.md`

---

## 5) After Play app exists — create `remove_ads` IAP

Play Console → Monetize → Products → In-app products → Create:

| Field | Value |
|-------|--------|
| **Product ID** | `remove_ads` (must match `assets/js/billing.js` / Billing constant) |
| **Type** | Non-consumable / one-time (Managed product) |
| **Name** | Remove Ads |
| **Description** | Removes interstitial ads. Rewarded ads may remain optional. |
| **Default price** | **USD $2.99** (local equivalents OK) |
| **Status** | Activate |

### License testers (authorized test accounts)

Play Console → Settings → License testing:

1. Add Gmail accounts that will install internal-test builds  
2. License response: **RESPOND_NORMALLY** (or test responses as needed)  
3. Those accounts can buy `remove_ads` without real charges in licensed test  
4. **Never** enable `colorTubeSort_devIap` / fake IAP in release or internal-test AAB  

Verify: purchase → `removeAds=true`; Restore purchases works; cold start still owned.

---

## 6) AdMob — after Play app is created & linkable

**Blocked until Play listing package exists.** Do **not** invent unit IDs or mark gate Pass.

When ready:

1. AdMob → Apps → Add app → Android → link Play app `com.lancechung.colortubesort`  
2. Copy **App ID** (`ca-app-pub-XXXX~YYYY`)  
3. Create units:
   - Interstitial  
   - Rewarded  
4. Report **real** App ID + both unit IDs to CEO / 上架變現  
5. Then swap in repo (`capacitor.config.json`, `ads.js`): `USE_TEST_ADS=false`; never ship Google sample IDs in release  

Until then: keep Google **sample** IDs + `USE_TEST_ADS=true`.

---

## 7) Monetization gates (unchanged)

1. Interstitial only fail-loop / level clear — **never mid-pour**  
2. Rewarded: grant only after earn  
3. Real `remove_ads` + restore; no fake IAP; no leftover test IDs in release  
4. Price **$2.99**  
5. Store/UA EN-first; thick gold lid in first 3s  

---

*Generated for post-approval sprint 2026-09-21. Source of truth: `STORE.md` + `docs/PLAY_DATA_SAFETY.md`.*
