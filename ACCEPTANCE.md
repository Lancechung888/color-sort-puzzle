# ACCEPTANCE · ColorTube Sort

> Manual / QA gate. Any **Fail** blocks store submission.  
> Do **not** mark AdMob / real IAP as Pass without publisher account + SDK proof.

## P0 — must be green

| ID | Check | Expected | Status |
|----|-------|----------|--------|
| P0-1 | Shop「去除廣告」click | Toast **即將開放／需商店帳號**; `save.removeAds` stays **false** (unless `localStorage.colorTubeSort_devIap=1`) | **Pass** (fixed) |
| P0-2 | Fail-sheet「去除廣告」 | Same as P0-1; does **not** grant remove-ads or pretend purchase succeeded | **Pass** (fixed) |
| P0-3 | Level skip | No double-click / dblclick on level label to advance; start CTA must not click-through into tubes | **Pass** (fixed) |
| P0-4 | Infinite undo SKU | UI「本關無限撤銷」= unlimited undos this level + no star penalty; history not soft-capped at 100 while active | **Pass** (fixed) |
| P0-5 | Fake AdMob as Done | Must remain **TODO** needing account; stubs OK; never claim ship-ready monetization | **Pass** (policy) |

## Economy / curve (accepted rulings)

| ID | Check | Expected | Status |
|----|-------|----------|--------|
| E-1 | New save coins / hints | 70 coins, 2 free hints | **Pass** |
| E-2 | Hint coin cost | 40 | **Pass** |
| E-3 | Star rewards | 8 / 15 / 28 | **Pass** |
| E-4 | Fail wall | index &lt; 10 → threshold 3; index ≥ 10 → 2 | **Pass** |
| E-5 | Daily challenge | Adaptive near `maxUnlocked`, not hard late-catalog pull | **Pass** |
| C-1 | L1–2 | Zero caps, pour-only | **Pass** |
| C-2 | L3 | 2 colors + 1 cap + teach | **Pass** |
| C-3 | Cap density | 40–60% mainline; consec uncapped ≤3; ≤2 caps/level | **Pass** (50%, max consec 3) |
| C-4 | Level count | ≥50 solid; aim 80 | **Pass** (80) |
| C-5 | First 4-color | After solid 3-color stretch | **Pass** (~L11) |

## Juice

| ID | Check | Expected | Status |
|----|-------|----------|--------|
| J-1 | WebAudio | pour, land, complete tube, uncap, win | **Pass** (oscillators) |
| J-2 | Vibrate | complete / illegal (optional API) | **Pass** |
| J-3 | Uncap feel | Signature lid motion + feedback | **Pass** (CSS + sparks + SFX) |

## Still Fail / open (not this turn)

| ID | Check | Status | Notes |
|----|-------|--------|-------|
| M-1 | Real AdMob rewarded + interstitial on device | **Fail** | Needs `@capacitor-community/admob` + publisher / app IDs |
| M-2 | Real `remove_ads` IAP (Play Billing / StoreKit) | **Fail** | Gated「即將開放」until wired |
| B-1 | Final icon 1024 + 5 store shots | **Fail** | Concept drafts only |
| A-1 | Automated ACCEPTANCE runner all green | **Fail** | This doc is manual; no CI suite yet |
| R-1 | Meta return reasons first-tier thick | **Fail** | Daily adaptive OK; streak / 3★ replay still thin |
| J-4 | 15s UA creative validated on device | **Fail** | Juice present; creative not shot / approved |

## Smoke steps (manual)

1. Clear site data → confirm 70 coins / 2 hints on HUD.  
2. Play L1–2: no lids. L3: one lid + teach tip.  
3. Restart early level 3× → fail sheet on 3rd; on L11+ sheet on 2nd.  
4. Shop → 去除廣告 → must toast 即將開放; reload → ads path still active.  
5. Confirm level label double-click does nothing.  
6. Pour / complete / uncap / win: hear tones; illegal pour vibrates if supported.  
7. DEV only: `localStorage.setItem('colorTubeSort_devIap','1')` then IAP may grant; default must be off.

**Suite result:** P0 + economy/curve/juice checks Pass; monetization / brand / automation **Fail** → **not ship-ready**.
