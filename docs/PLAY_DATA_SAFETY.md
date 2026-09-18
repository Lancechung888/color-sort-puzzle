# Play Console — Data safety form (draft) · ColorTube Sort: Lid Puzzle

**Aligned with:** AdMob + optional Play Billing (`remove_ads` @ **$2.99**) + on-device save only · **no account / no cloud sync**  
**Primary locale:** en-US · Update if you add Firebase Analytics / Crashlytics later.

Use with the English privacy policy: `docs/PRIVACY_POLICY_EN.md` (host HTTPS URL first).

---

## A. Before filling the form

- [ ] Privacy policy HTTPS URL live and linked in Play Console + in-app About
- [ ] App content → Ads: **Yes, my app contains ads**
- [ ] In-app products: `remove_ads` non-consumable, display name **Remove Ads**, price **$2.99**
- [ ] Target audience: **not** “Designed for children”; prefer 18+ or mixed / not primarily children
- [ ] AdMob app + units created; production builds do not leave `initializeForTesting: true`

---

## B. Data safety — overview answers

| Question | Answer | Notes |
|----------|--------|--------|
| Does your app collect or share user data? | **Yes** | AdMob (and Billing entitlement handled with Play) |
| Is all user data encrypted in transit? | **Yes** | HTTPS / official Google SDKs |
| Do you provide a way for users to request data deletion? | **Yes** | Clear app data / uninstall for on-device progress; ad/billing data per Google policies (state this in the privacy policy) |

---

## C. Data types to declare (typical with AdMob + IAP)

Check **Yes, collected** then add rows. Confirm against your live AdMob / UMP config before submit.

| Data type | Collect? | Share with third parties? | Purposes | Ephemeral? | Required / Optional |
|-----------|----------|---------------------------|----------|------------|---------------------|
| **Device or other IDs** | **Yes** | **Yes** (Google / ad partners) | Advertising; Fraud prevention; Analytics (if enabled) | No | Optional (ads path) |
| **Approximate location** | Often **Yes** (IP-based via ads) | **Yes** | Advertising; Analytics | No | Optional |
| **App interactions** | **Yes** if AdMob/Firebase analytics | Per SDK | Advertising; Analytics | No | Optional |
| **Crash logs / Diagnostics** | Only if Crashlytics/etc. | Per SDK | App functionality / Analytics | No | Optional |
| **Purchase history** | **Yes** (IAP) | Handled with Google Play; do not over-claim “sold” | App functionality; Account management (Play) | No | Optional (only if user buys) |
| Name / Email / Phone / Photos / Contacts | **No** | — | — | — | — |
| Precise location / Mic / Camera | **No** | — | — | — | — |

### Advertising declarations
- [ ] Purposes include **Advertising or marketing**
- [ ] Note in privacy policy: Remove Ads stops interstitials; rewarded may remain optional

### Children
- [ ] Do **not** enable child-directed AdMob flags unless product is redesigned for kids
- [ ] Do **not** select Designed for Families / primarily children for this hybrid-casual title

---

## D. Data safety — narrative snippets (paste-friendly)

**Data collected:** Advertising identifiers and related device/app signals via Google AdMob when ads are shown; approximate region from IP; optional purchase records via Google Play for Remove Ads and other IAPs. Game progress stays on-device.

**Why:** Serve and measure ads, prevent fraud, process optional purchases, operate the game.

**Sharing:** Shared with Google (AdMob / Play) as needed to provide those services. No developer-operated user account cloud.

**Deletion:** Uninstall or clear app storage removes on-device progress. Ad and purchase records follow Google’s retention policies.

---

## E. Monetization gates (must stay true at submission)

1. Interstitials **only** on fail-loop / level clear — **never mid-pour**
2. Rewarded: grant reward **only after** user earns it
3. `remove_ads` real purchase + restore; **no fake IAP**; **no leftover test ad unit IDs** in release
4. Price target **$2.99** USD (local currency equivalents OK)

---

## F. Third-party policy links (link from privacy page)

- Google Privacy Policy: https://policies.google.com/privacy  
- Google Play Terms: https://play.google.com/about/play-terms/  
- AdMob Help (publishers): https://support.google.com/admob/

---

*Draft for launch sprint — replace contact email and hosted privacy URL before Play submission.*
