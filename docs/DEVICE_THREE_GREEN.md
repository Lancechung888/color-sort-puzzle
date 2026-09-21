# DEVICE-THREE-GREEN — Seeker device verification

> Honesty sync marker: **DEVICE-THREE-GREEN** · `docs/DEVICE_THREE_GREEN.md`  
> Records **assistant self-verified** AdMob / Billing three green lights.  
> **Does not** authorize Production publish or soft-launch.

## Verification (2026-09-21 ~19:28–19:49 Asia/Taipei)

| Field | Value |
|-------|-------|
| Device | **Seeker** (serial `SM02G4061932272`) via DESKTOP-EBT4G1I ADB |
| Build | Sideload **vc6** APK **1.0.5** / `1.0.5-internal-vc6-iapBusy` (after uninstall for `UPDATE_INCOMPATIBLE`) |
| Account | License tester `hanwen16888@gmail.com` + sandbox test card |
| Play Active | `1.0.5-internal-vc6-iapBusy` / versionCode **6** / **UNCAP-ONE-TAP** + **IAP-PURCHASE-BUSY** / `USE_TEST_ADS=false` |

## Three green lights — **Pass**

1. **Interstitial Pass** — Stuck? → Keep restarting → `AdActivity` shown on device.
2. **Rewarded full-watch Pass** — Watch ad & restart → reward granted（已發放獎勵）.
3. **`remove_ads` purchase + restore Pass** — order `GPA.3327-2483-8031-49087`, `purchaseState=0`, restore OK.

## Guardrails still in force

- Mid-pour ads remain **guarded in source** (`ads.js` / pouring checks) — never interrupt an active pour.
- **MILLION_USER_BAR #7 → Pass** on this Seeker evidence (not wiring-only).
- **Production / soft-launch still forbidden** while **#1** and **#3** remain **Partial** (external 3s competitor playtest / 15s UA clip missing; UA frozen, no budget).
- Gate **CLOSED** until all 1–9 Pass. **Do not** claim ship-ready.

## Pointers

- Score table: `MILLION_USER_BAR.md` (#7 Pass, #9 Pass when accept 0 Blocked).
- ACCEPTANCE P0②③: `ACCEPTANCE.md` (Pass with this evidence).
- Accept automation: `scripts/acceptance-check.js` (P0-2 / P0-3 / M-IAP Pass when this doc + bar/acceptance markers exist).
