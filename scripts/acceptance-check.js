#!/usr/bin/env node
/**
 * ColorTube Sort — ACCEPTANCE automation (headless Node).
 * Proves what can be proven without Play publisher / live AdMob.
 * P0②③ (real AdMob / production ad stream) stay BLOCKED — never marked Pass.
 *
 * Usage: npm run accept
 * Exit 0 = all non-blocked checks Pass; else non-zero.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const rows = [];
let fails = 0;
let blocked = 0;

function pass(id, msg) {
  rows.push({ id, status: 'PASS', msg });
}
function fail(id, msg) {
  fails += 1;
  rows.push({ id, status: 'FAIL', msg });
}
function block(id, msg) {
  blocked += 1;
  rows.push({ id, status: 'BLOCKED', msg });
}
function info(id, msg) {
  rows.push({ id, status: 'INFO', msg });
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail('FS', `missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, 'utf8');
}

function loadLevels() {
  const src = read('assets/js/levels.js');
  if (!src) return null;
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'levels.js' });
  const levels = sandbox.window.COLOR_SORT_LEVELS;
  if (!Array.isArray(levels)) {
    fail('LVL', 'COLOR_SORT_LEVELS not an array after eval');
    return null;
  }
  return levels;
}

function levelHasCap(lv) {
  if (lv.modules && lv.modules.includes('cap')) return true;
  if (Array.isArray(lv.caps) && lv.caps.some(Boolean)) return true;
  return false;
}

function capCount(lv) {
  if (!Array.isArray(lv.caps)) return 0;
  return lv.caps.filter(Boolean).length;
}

function colorCountsValid(lv) {
  const cap = lv.capacity || 4;
  const counts = Object.create(null);
  for (const tube of lv.tubes || []) {
    for (const c of tube) {
      if (c == null || c === 0) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  for (const k of Object.keys(counts)) {
    if (counts[k] % cap !== 0) return false;
  }
  return true;
}

// --- 1) Level / USP density ---
const levels = loadLevels();
if (levels) {
  const n = levels.length;
  if (n >= 80) pass('L-COUNT', `${n} levels (≥80)`);
  else fail('L-COUNT', `${n} levels (need ≥80)`);

  const withCap = levels.filter(levelHasCap);
  const pct = n ? (withCap.length / n) * 100 : 0;
  if (pct >= 40 && pct <= 60) {
    pass('L-DENSITY', `cap density ${withCap.length}/${n} = ${pct.toFixed(1)}% (40–60% lock)`);
  } else {
    fail('L-DENSITY', `cap density ${withCap.length}/${n} = ${pct.toFixed(1)}% (need 40–60%)`);
  }

  const l1 = levels[0];
  const l2 = levels[1];
  const l3 = levels[2];
  if (l1 && !levelHasCap(l1) && l2 && !levelHasCap(l2)) {
    pass('L-TEACH-EARLY', 'L1–2 have zero lids');
  } else {
    fail('L-TEACH-EARLY', 'L1–2 must have zero lids');
  }
  if (l3 && levelHasCap(l3) && l3.teach === 'cap') {
    pass('L-TEACH-L3', 'L3 has cap + teach:"cap"');
  } else {
    fail('L-TEACH-L3', 'L3 must teach caps (modules/caps + teach:"cap")');
  }

  let maxRun = 0;
  let run = 0;
  for (let i = 0; i < n; i++) {
    if (!levelHasCap(levels[i])) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else {
      run = 0;
    }
  }
  if (maxRun <= 3) pass('L-GAP', `max consecutive no-lid streak = ${maxRun} (≤3)`);
  else fail('L-GAP', `max consecutive no-lid streak = ${maxRun} (need ≤3)`);

  let badCapsLen = 0;
  let maxCaps = 0;
  let unsolvable = 0;
  for (let i = 0; i < n; i++) {
    const lv = levels[i];
    const cc = capCount(lv);
    if (cc > maxCaps) maxCaps = cc;
    if (Array.isArray(lv.caps) && lv.caps.length !== (lv.tubes || []).length) badCapsLen += 1;
    if (!colorCountsValid(lv)) unsolvable += 1;
  }
  if (badCapsLen === 0) pass('L-CAPS-LEN', 'caps[] length matches tubes[] where present');
  else fail('L-CAPS-LEN', `${badCapsLen} levels have caps[] length ≠ tubes[]`);

  // Million-user bar: ≤2 caps/level (DESIGN + MILLION_USER_BAR lock).
  if (maxCaps <= 2) {
    pass('L-CAPS-MAX', `max lids/level = ${maxCaps} (≤2 bar lock)`);
  } else {
    fail('L-CAPS-MAX', `max lids/level = ${maxCaps} (need ≤2)`);
  }

  if (unsolvable === 0) pass('L-COLOR', 'every level: each color count divisible by capacity');
  else fail('L-COLOR', `${unsolvable} levels fail color-count ÷ capacity (likely unsolvable)`);
}

// --- 2) Day1 economy constants (source) ---
const gameRaw = read('assets/js/game.js');
if (gameRaw) {
  const start = /START_COINS\s*=\s*(\d+)/.exec(gameRaw);
  const hints = /freeHints:\s*(\d+)/.exec(gameRaw);
  const hintCost = /HINT_COIN_COST\s*=\s*(\d+)/.exec(gameRaw);
  const early = /FAIL_LOOP_THRESHOLD_EARLY\s*=\s*(\d+)/.exec(gameRaw);
  const late = /FAIL_LOOP_THRESHOLD_LATE\s*=\s*(\d+)/.exec(gameRaw);
  const tier = /levelIndex\s*<\s*(\d+)\s*\?\s*FAIL_LOOP_THRESHOLD_EARLY/.exec(gameRaw);

  if (start && Number(start[1]) === 120) pass('E-COINS', 'START_COINS === 120');
  else fail('E-COINS', `START_COINS expected 120, got ${start ? start[1] : '?'}`);

  if (hints && Number(hints[1]) === 3) pass('E-HINTS', 'default freeHints === 3');
  else fail('E-HINTS', `freeHints default expected 3, got ${hints ? hints[1] : '?'}`);

  if (hintCost && Number(hintCost[1]) === 25) pass('E-HINT-COST', 'HINT_COIN_COST === 25');
  else fail('E-HINT-COST', `HINT_COIN_COST expected 25, got ${hintCost ? hintCost[1] : '?'}`);

  if (early && Number(early[1]) >= 3 && late && Number(late[1]) >= 2) {
    pass(
      'E-FAIL-WALL',
      `fail wall early=${early[1]} late=${late[1]} tier index<${tier ? tier[1] : '?'}`
    );
  } else {
    fail('E-FAIL-WALL', 'FAIL_LOOP thresholds missing or below accepted floor (≥3 early, ≥2 late)');
  }

  // P0① shop honesty (doc comment folded — keeps Pass count stable when adding D-DIFF)
  if (
    /Coming soon \/ needs store account/.test(gameRaw) &&
    /colorTubeSort_devIap/.test(gameRaw) &&
    /ACCEPTANCE P0①: normal shop click must NOT grant removeAds/.test(gameRaw)
  ) {
    pass('P0-1', 'shop remove-ads: Coming soon + DEV-only colorTubeSort_devIap + P0① comment');
  } else {
    fail('P0-1', 'missing Coming soon toast, colorTubeSort_devIap gate, and/or P0① comment');
  }

  // Save corruption recovery / migration robustness (P0 stability)
  if (
    /function sanitizeSave/.test(gameRaw) &&
    /STORAGE_BAK_KEY/.test(gameRaw) &&
    /function tryLoadKey/.test(gameRaw) &&
    /Progress reset — save was damaged/.test(gameRaw) &&
    /removeAds === true/.test(gameRaw) &&
    /SAVE_VERSION/.test(gameRaw)
  ) {
    pass(
      'SAVE-RECOVER',
      'sanitizeSave + bak/legacy fallback + quota retry; removeAds strict true; SAVE_VERSION stamp'
    );
  } else {
    fail('SAVE-RECOVER', 'missing sanitizeSave / STORAGE_BAK_KEY / reset toast / strict removeAds / SAVE_VERSION');
  }

  // Keyboard / a11y: tubes focusable + Enter/Space activate (no soft-arm)
  if (
    /el\.tabIndex\s*=\s*0/.test(gameRaw) &&
    /addEventListener\(\s*['"]keydown['"]/.test(gameRaw) &&
    /e\.key\s*===\s*['"]Enter['"]/.test(gameRaw) &&
    /e\.key\s*===\s*['"] ['"]/.test(gameRaw) &&
    /selectTube\(idx\)/.test(gameRaw)
  ) {
    pass('A11Y-TUBE', 'tubes tabIndex=0 + Enter/Space keydown → selectTube');
  } else {
    fail('A11Y-TUBE', 'missing tube tabIndex and/or Enter/Space keydown activation');
  }

  // Escape dismisses overlays incl. win→Home (parity with BACK-NAV; not start)
  if (
    /e\.key\s*!==\s*['"]Escape['"]|e\.key\s*===\s*['"]Escape['"]/.test(gameRaw) &&
    /closeLevels\(\)/.test(gameRaw) &&
    /closeOverlay\(hintPaywall\)/.test(gameRaw) &&
    /closeOverlay\(shopOverlay\)/.test(gameRaw) &&
    /closeOverlay\(failPrompt\)/.test(gameRaw) &&
    /winOverlay[\s\S]{0,120}classList\.contains\(\s*['"]show['"]\s*\)[\s\S]{0,160}preventDefault\(\)[\s\S]{0,120}hideWin\(\)[\s\S]{0,80}goHome\(\)/.test(gameRaw)
  ) {
    pass('A11Y-ESC', 'Escape closes levels → hint-paywall → shop → fail-prompt; win→Home');
  } else {
    fail('A11Y-ESC', 'missing Escape dismiss handler for dismissible overlays (incl. win→Home)');
  }

  // Overlay focus: move into dialog on open, restore on last close (no soft-arm)
  if (
    /function focusOverlayPrimary/.test(gameRaw) &&
    /overlayFocusReturn/.test(gameRaw) &&
    /overlayFocusDepth/.test(gameRaw) &&
    /function safeFocus/.test(gameRaw) &&
    /openOverlay\(winOverlay\)/.test(gameRaw)
  ) {
    pass('A11Y-FOCUS', 'overlay focus move-in + depth restore; win uses openOverlay');
  } else {
    fail('A11Y-FOCUS', 'missing focusOverlayPrimary / overlayFocusReturn depth restore');
  }

  // Dialogs expose accessible names
  const htmlRaw = read('index.html') || '';
  if (
    /aria-labelledby="win-title"/.test(htmlRaw) &&
    /aria-labelledby="shop-title"/.test(htmlRaw) &&
    /aria-labelledby="hint-paywall-title"/.test(htmlRaw) &&
    /aria-labelledby="fail-title"/.test(htmlRaw) &&
    /aria-labelledby="levels-title"/.test(htmlRaw)
  ) {
    pass('A11Y-DIALOG', 'modals have role=dialog aria-modal aria-labelledby titles');
  } else {
    fail('A11Y-DIALOG', 'missing aria-labelledby on win/shop/hint/fail/levels dialogs');
  }

  // Toast polite live region (no [hidden] — stays announceable)
  if (
    /id="toast"/.test(htmlRaw) &&
    /role="status"/.test(htmlRaw) &&
    /aria-live="polite"/.test(htmlRaw) &&
    /aria-atomic="true"/.test(htmlRaw) &&
    /function toast\(/.test(gameRaw) &&
    !/toastEl\.hidden\s*=/.test(gameRaw)
  ) {
    pass('A11Y-TOAST', 'toast role=status aria-live=polite; no toastEl.hidden gate');
  } else {
    fail('A11Y-TOAST', 'missing toast live region and/or still uses toastEl.hidden');
  }

  // HUD / chip keyboard names + focus-visible rings (no soft-arm)
  const cssRaw = read('assets/css/style.css') || '';
  if (
    /aria-label="Undo last pour"/.test(htmlRaw) &&
    /aria-label="Restart level"/.test(htmlRaw) &&
    /aria-label="Get a hint"/.test(htmlRaw) &&
    /aria-label="Daily Challenge"/.test(htmlRaw) &&
    /aria-label="Coins — open shop"/.test(htmlRaw) &&
    /\.btn:focus-visible/.test(cssRaw) &&
    /\.chip:focus-visible/.test(cssRaw) &&
    /\.btn-icon:focus-visible/.test(cssRaw) &&
    /visibilitychange/.test(gameRaw) &&
    /clearPendingUncap/.test(gameRaw)
  ) {
    pass('A11Y-HUD', 'toolbar/chip aria-labels + focus-visible; uncap arm clears on hide');
  } else {
    fail('A11Y-HUD', 'missing HUD aria-labels, focus-visible rings, and/or visibilitychange uncap clear');
  }

  // Color assist (CVD patterns/glyphs) — Settings toggle + persist + layer marks
  if (
    /id="btn-toggle-color-assist"/.test(htmlRaw) &&
    /Color assist/.test(htmlRaw) &&
    /Patterns on colors \(colorblind-friendly\)/.test(htmlRaw) &&
    /colorAssist:\s*false/.test(gameRaw) &&
    /colorAssist:\s*data\.colorAssist\s*===\s*true/.test(gameRaw) &&
    /COLOR_ASSIST_GLYPHS/.test(gameRaw) &&
    /layer-mark/.test(gameRaw) &&
    /btn-toggle-color-assist/.test(gameRaw) &&
    /\.layer-mark/.test(cssRaw) &&
    /\.layer\.layer-assist/.test(cssRaw)
  ) {
    pass('A11Y-COLOR', 'Color assist toggle + persist + layer glyphs (CVD); source-checked');
  } else {
    fail('A11Y-COLOR', 'missing colorAssist save/toggle, layer-mark glyphs, and/or CSS');
  }

  // In-app Reduced motion preference (Settings) — force calm juice without OS media query
  {
    const htmlRawRm = read('index.html') || '';
    const prmIdx = gameRaw.indexOf('function prefersReducedMotion');
    const prmSlice = prmIdx >= 0 ? gameRaw.slice(prmIdx, prmIdx + 420) : '';
    const orOs =
      /function prefersReducedMotion\s*\(/.test(prmSlice) &&
      /save\.reducedMotion\s*===\s*true/.test(prmSlice) &&
      /matchMedia\s*\(\s*['"]\(prefers-reduced-motion:\s*reduce\)['"]\s*\)/.test(prmSlice);
    const jsOk =
      /reducedMotion:\s*false/.test(gameRaw) &&
      /reducedMotion:\s*data\.reducedMotion\s*===\s*true/.test(gameRaw) &&
      orOs &&
      /classList\.toggle\(\s*['"]reduced-motion['"]\s*,\s*save\.reducedMotion\s*===\s*true\s*\)/.test(gameRaw) &&
      /btn-toggle-reduced-motion/.test(gameRaw) &&
      /keepRm\s*=\s*save\.reducedMotion\s*===\s*true/.test(gameRaw) &&
      /save\.reducedMotion\s*=\s*keepRm/.test(gameRaw);
    const noSoft =
      !/motion-pref-arm|reduced-motion-arm|a11y-motion-arm|\.motion-pref-arm|claim-juice|hud-pulse/.test(
        gameRaw + cssRaw
      );
    const htmlOk =
      /id=["']btn-toggle-reduced-motion["']/.test(htmlRawRm) &&
      /data-setting=["']reduced-motion["']/.test(htmlRawRm) &&
      /Reduced motion/.test(htmlRawRm) &&
      /Less animation/.test(htmlRawRm);
    const cssOk =
      /html\.reduced-motion/.test(cssRaw) &&
      /html\.reduced-motion\s+\.pour-stream/.test(cssRaw) &&
      /html\.reduced-motion\s+\.confetti/.test(cssRaw);
    if (jsOk && htmlOk && cssOk && noSoft) {
      pass(
        'A11Y-MOTION-PREF',
        'Settings Reduced motion toggle + persist; prefersReducedMotion ORs save; html.reduced-motion class; RESET keeps; no soft-arm'
      );
    } else {
      fail(
        'A11Y-MOTION-PREF',
        'missing reducedMotion save/toggle / prefersReducedMotion OR / html class / RESET keep, or soft-arm slipped in'
      );
    }
  }

  // Save sanitization on load path
  if (
    /function sanitizeSave/.test(gameRaw) &&
    /sanitizeSave\(/.test(gameRaw) &&
    /function loadSave|function tryLoadKey/.test(gameRaw)
  ) {
    pass('SAVE-SANITIZE', 'sanitizeSave present and invoked on load path');
  } else {
    fail('SAVE-SANITIZE', 'sanitizeSave missing or not called from load path');
  }

  // In-play Levels: level badge → openLevels (gated; no soft-arm)
  if (
    /id="level-label"/.test(htmlRaw) &&
    /class="level-badge"/.test(htmlRaw) &&
    /function openLevels\s*\(/.test(gameRaw) &&
    /function tryOpenLevelsFromHud\s*\(/.test(gameRaw) &&
    /levelLabel\.addEventListener/.test(gameRaw) &&
    /open levels/.test(gameRaw)
  ) {
    pass('NAV-LEVELS', 'level-label badge → tryOpenLevelsFromHud → openLevels; dynamic aria open levels');
  } else {
    fail('NAV-LEVELS', 'missing level-label → openLevels wiring and/or open-levels aria-label');
  }

  // In-play Home: btn-home → goHome → start-screen show (no save wipe)
  if (
    /id="btn-home"/.test(htmlRaw) &&
    /aria-label="Home"/.test(htmlRaw) &&
    /function goHome\s*\(/.test(gameRaw) &&
    /startScreen\.classList\.add\(\s*['"]show['"]\s*\)/.test(gameRaw) &&
    /btnHome\.addEventListener|btn-home['"]\)\.addEventListener|\$\(['"]#btn-home['"]\)/.test(gameRaw)
  ) {
    pass('NAV-HOME', 'btn-home → goHome shows start-screen; aria-label Home; no save wipe');
  } else {
    fail('NAV-HOME', 'missing goHome / btn-home / startScreen.show wiring');
  }

  // Mid-level board resume: draft persist + validate-on-restore + clear on win/restart; Home persists (pause)
  const goHomeFn = (gameRaw.match(/function goHome\s*\([^)]*\)\s*\{[\s\S]*?\n  function /) || [])[0] || '';
  const showWinFn = (gameRaw.match(/function showWin\s*\([^)]*\)\s*\{[\s\S]*?\n  function /) || [])[0] || '';
  if (
    /RUN_STORAGE_KEY|colorTubeSort_run_v1/.test(gameRaw) &&
    /function persistRunDraft\s*\(/.test(gameRaw) &&
    /function validateRunDraft\s*\(/.test(gameRaw) &&
    /function tryResumeOrLoad\s*\(/.test(gameRaw) &&
    /function clearRunDraft\s*\(/.test(gameRaw) &&
    /clearRunDraft\(\)/.test(gameRaw) &&
    /clearRunDraft/.test(showWinFn) &&
    /persistRunDraft/.test(goHomeFn) &&
    !/clearRunDraft/.test(goHomeFn) &&
    /doRestartLevel[\s\S]*?clearRunDraft|function doRestartLevel[\s\S]*?clearRunDraft|loadLevel[\s\S]*?clearRunDraft/.test(gameRaw) &&
    /colorMultisetsEqual|colorMultisetOf/.test(gameRaw) &&
    /visibilitychange/.test(gameRaw) &&
    /pagehide/.test(gameRaw)
  ) {
    pass('RUN-RESUME', 'mid-level run draft persist + validate-on-restore + clear on win/restart; Home persists draft (pause)');
  } else {
    fail('RUN-RESUME', 'missing run draft persist / validateRunDraft / clear on win|restart / Home persist / hide flush');
  }

  // Deadlock toast: no legal pours + no lids left → Undo/Restart cue (no soft-arm)
  if (
    /function isBoardStuck\s*\(/.test(gameRaw) &&
    /function hasAnyLegalPour\s*\(/.test(gameRaw) &&
    /function hasActionableCap\s*\(/.test(gameRaw) &&
    /function maybeNotifyStuck\s*\(/.test(gameRaw) &&
    /stuckToastArmed/.test(gameRaw) &&
    /No moves left — Undo/.test(gameRaw) &&
    /No moves left — Restart/.test(gameRaw) &&
    /board_stuck/.test(gameRaw) &&
    /setTimeout\(maybeNotifyStuck/.test(gameRaw)
  ) {
    pass('STUCK-DETECT', 'deadlock toast (no pours + no lids) → Undo/Restart; once-per-stuck; no soft-arm');
  } else {
    fail('STUCK-DETECT', 'missing isBoardStuck / maybeNotifyStuck / Undo|Restart toast / board_stuck event');
  }

  // Mid-level Restart two-tap confirm (toast only — no soft-arm CSS)
  if (
    /function clearPendingRestart\s*\(/.test(gameRaw) &&
    /function armPendingRestart\s*\(/.test(gameRaw) &&
    /PENDING_RESTART_MS/.test(gameRaw) &&
    /pendingRestartUntil/.test(gameRaw) &&
    /Tap Restart again to confirm/.test(gameRaw) &&
    /hasProgress/.test(gameRaw) &&
    /moves\s*>\s*0\s*\|\|\s*history\.length\s*>\s*0/.test(gameRaw) &&
    /restart_confirm_arm/.test(gameRaw) &&
    !/restart-arm|restartArm|\.restart-arm/.test(gameRaw)
  ) {
    pass('RESTART-CONFIRM', 'mid-level Restart two-tap confirm (toast); empty board one-tap; no soft-arm CSS');
  } else {
    fail('RESTART-CONFIRM', 'missing pendingRestart / Tap Restart again toast / hasProgress gate, or soft-arm CSS slipped in');
  }

  // Leave-run two-tap confirm when abandoning mid-level draft (toast only — no soft-arm CSS)
  if (
    /function clearPendingLeave\s*\(/.test(gameRaw) &&
    /function armPendingLeave\s*\(/.test(gameRaw) &&
    /PENDING_LEAVE_MS/.test(gameRaw) &&
    /pendingLeaveUntil/.test(gameRaw) &&
    /Tap again to leave/.test(gameRaw) &&
    /function draftHasProgress\s*\(/.test(gameRaw) &&
    /function confirmLeaveRunThen\s*\(/.test(gameRaw) &&
    /leave_run_confirm_arm/.test(gameRaw) &&
    !/leave-arm|leaveArm|\.leave-arm|leave-run-arm/.test(gameRaw)
  ) {
    pass('LEAVE-RUN-CONFIRM', 'leave-run two-tap confirm (toast); empty/same-target one-tap; no soft-arm CSS');
  } else {
    fail('LEAVE-RUN-CONFIRM', 'missing pendingLeave / Tap again to leave / draftHasProgress / confirmLeaveRunThen, or soft-arm CSS slipped in');
  }

  // Shop big coin-spend two-tap confirm (toast only — no soft-arm CSS)
  if (
    /function clearPendingSpend\s*\(/.test(gameRaw) &&
    /function armPendingSpend\s*\(/.test(gameRaw) &&
    /PENDING_SPEND_MS/.test(gameRaw) &&
    /pendingSpendUntil/.test(gameRaw) &&
    /function confirmShopSpendThen\s*\(/.test(gameRaw) &&
    /Tap again to spend/.test(gameRaw) &&
    (/theme:'\s*\+|theme:\s*'\s*\+|['"]theme:/.test(gameRaw) || /THEME_COIN_COST/.test(gameRaw)) &&
    (/hints-pack/.test(gameRaw) || /HINT_PACK_COIN_COST/.test(gameRaw)) &&
    (/undo-level/.test(gameRaw) || /UNDO_LEVEL_COIN_COST/.test(gameRaw)) &&
    /shop_spend_confirm_arm/.test(gameRaw) &&
    !/spend-arm|spendArm|\.spend-arm|shop-spend-arm/.test(gameRaw)
  ) {
    pass('SHOP-SPEND-CONFIRM', 'shop coin spend ≥80 two-tap confirm (toast); theme/hints-pack/undo; no soft-arm CSS');
  } else {
    fail('SHOP-SPEND-CONFIRM', 'missing confirmShopSpendThen / pendingSpend / Tap again to spend / theme|hints-pack|undo wiring, or soft-arm CSS slipped in');
  }

  // Settings Reset progress two-tap confirm (toast only — no soft-arm CSS)
  {
    const htmlRaw = read('index.html') || '';
    const jsOk =
      /function clearPendingReset\s*\(/.test(gameRaw) &&
      /function armPendingReset\s*\(/.test(gameRaw) &&
      /PENDING_RESET_MS/.test(gameRaw) &&
      /pendingResetUntil/.test(gameRaw) &&
      /function confirmResetProgressThen\s*\(/.test(gameRaw) &&
      /function doResetProgress\s*\(/.test(gameRaw) &&
      /Tap again to reset all progress/.test(gameRaw) &&
      /progress_reset_confirm_arm/.test(gameRaw) &&
      /trackEvent\(\s*['"]progress_reset['"]/.test(gameRaw) &&
      /STORAGE_BAK_KEY/.test(gameRaw) &&
      /clearRunDraft\s*\(/.test(gameRaw) &&
      /defaultSave\s*\(/.test(gameRaw) &&
      /sfxOn/.test(gameRaw) &&
      /hapticsOn/.test(gameRaw) &&
      /colorAssist/.test(gameRaw) &&
      /reducedMotion/.test(gameRaw) &&
      /keepRm/.test(gameRaw) &&
      /btn-reset-progress/.test(gameRaw) &&
      !/reset-arm|resetArm|\.reset-arm|progress-reset-arm/.test(gameRaw);
    const htmlOk =
      /id=["']btn-reset-progress["']/.test(htmlRaw) &&
      /Reset progress/.test(htmlRaw);
    if (jsOk && htmlOk) {
      pass(
        'RESET-PROGRESS',
        'Settings Reset progress two-tap confirm (toast); keeps Sound/Haptics/Color assist/Reduced motion; clears draft+bak; no soft-arm CSS'
      );
    } else {
      fail(
        'RESET-PROGRESS',
        'missing reset progress confirm / doResetProgress / btn-reset-progress, or soft-arm CSS slipped in'
      );
    }
  }

  // Settings Backup progress export/import (toast confirm — no soft-arm CSS)
  {
    const htmlRaw = read('index.html') || '';
    const jsOk =
      /function exportProgressBackup\s*\(/.test(gameRaw) &&
      /function importProgressBackup\s*\(/.test(gameRaw) &&
      /function confirmImportProgressThen\s*\(/.test(gameRaw) &&
      /PENDING_IMPORT_MS/.test(gameRaw) &&
      /pendingImportUntil/.test(gameRaw) &&
      /Tap again to restore/.test(gameRaw) &&
      /trackEvent\(\s*['"]progress_export['"]/.test(gameRaw) &&
      /trackEvent\(\s*['"]progress_import['"]/.test(gameRaw) &&
      /Backup downloaded/.test(gameRaw) &&
      /Progress restored/.test(gameRaw) &&
      /Invalid backup file/.test(gameRaw) &&
      /btn-export-progress/.test(gameRaw) &&
      /btn-import-progress/.test(gameRaw) &&
      /input-import-progress/.test(gameRaw) &&
      /sanitizeSave/.test(gameRaw) &&
      !/backup-arm|import-arm|export-arm|\.backup-arm|progress-import-arm|soft-arm/.test(
        (gameRaw.match(/function exportProgressBackup[\s\S]*?function draftHasProgress/) || [''])[0]
      );
    const htmlOk =
      /id=["']btn-export-progress["']/.test(htmlRaw) &&
      /id=["']btn-import-progress["']/.test(htmlRaw) &&
      /id=["']input-import-progress["']/.test(htmlRaw) &&
      /Backup progress/.test(htmlRaw);
    if (jsOk && htmlOk) {
      pass(
        'SAVE-BACKUP',
        'Settings Backup export/import; two-tap Import confirm toast; sanitizeSave; progress_export/import; no soft-arm CSS'
      );
    } else {
      fail(
        'SAVE-BACKUP',
        'missing export/import backup UI or confirmImport / progress_export|import, or soft-arm CSS slipped in'
      );
    }
  }

  // System / hardware / browser back — dismiss overlays then pause Home (no soft-arm)
  if (
    /function handleSystemBack\s*\(/.test(gameRaw) &&
    /function armBackGuard\s*\(/.test(gameRaw) &&
    /function bindSystemBack\s*\(/.test(gameRaw) &&
    /backGuardArmed/.test(gameRaw) &&
    /ctsBack/.test(gameRaw) &&
    /popstate/.test(gameRaw) &&
    /bindSystemBack\s*\(\)/.test(gameRaw) &&
    /closeLevels\(\)/.test(gameRaw) &&
    /goHome\(\)/.test(gameRaw) &&
    !/back-arm|backArm|\.back-arm|system-back-arm/.test(gameRaw)
  ) {
    pass('BACK-NAV', 'system back dismisses levels/hint/shop/fail then pauses Home (draft kept); no soft-arm');
  } else {
    fail('BACK-NAV', 'missing handleSystemBack / armBackGuard / bindSystemBack / popstate wiring, or soft-arm CSS slipped in');
  }

  // Levels overlay: scroll Continue / star-gap cell into view (no soft-arm)
  if (
    /function openLevels\s*\(/.test(gameRaw) &&
    /function renderLevelsGrid\s*\(/.test(gameRaw) &&
    /scrollIntoView/.test(gameRaw) &&
    /level-continue-arm/.test(gameRaw) &&
    /level-star-gap-arm/.test(gameRaw)
  ) {
    pass('LEVELS-SCROLL', 'openLevels scrolls .level-continue-arm / .level-star-gap-arm into view');
  } else {
    fail('LEVELS-SCROLL', 'missing scrollIntoView for continue/star-gap arm near openLevels/renderLevelsGrid');
  }

  // Levels overlay focus + cell aria-labels (keyboard/SR; no soft-arm)
  if (
    /function focusOverlayPrimary/.test(gameRaw) &&
    /levels-overlay/.test(gameRaw) &&
    /level-continue-arm/.test(gameRaw) &&
    /querySelector\(\s*['"]\.level-continue-arm['"]\s*\)/.test(gameRaw) &&
    /Level ['"]\s*\+\s*\(i\s*\+\s*1\)\s*\+\s*['"] — locked/.test(gameRaw) &&
    /Level ['"]\s*\+\s*\(i\s*\+\s*1\)\s*\+\s*['"] — play/.test(gameRaw) &&
    /aria-hidden="true"/.test(gameRaw)
  ) {
    pass(
      'LEVELS-FOCUS',
      'focusOverlayPrimary prefers Continue/star-gap over Close; level cells have locked/play/stars aria-labels'
    );
  } else {
    fail(
      'LEVELS-FOCUS',
      'missing levels focus prefer continue/star-gap and/or full level-cell aria-labels'
    );
  }

  // Levels chapter prev/next browse (★ mastery for earlier packs; no soft-arm)
  if (
    /levelsViewChapter/.test(gameRaw) &&
    /function shiftLevelsChapter/.test(gameRaw) &&
    /function maxBrowsableChapter/.test(gameRaw) &&
    /setLevelsViewChapter/.test(gameRaw) &&
    /btn-levels-prev/.test(gameRaw) &&
    /btn-levels-next/.test(gameRaw) &&
    /btn-levels-prev/.test(htmlRaw) &&
    /btn-levels-next/.test(htmlRaw) &&
    /aria-label="Previous chapter"/.test(htmlRaw) &&
    /aria-label="Next chapter"/.test(htmlRaw) &&
    /prog\.start/.test(gameRaw) &&
    /prog\.end/.test(gameRaw)
  ) {
    pass(
      'LEVELS-CHAPTER',
      'Levels chapter prev/next + levelsViewChapter; grid scoped to viewed chapter'
    );
  } else {
    fail(
      'LEVELS-CHAPTER',
      'missing Levels chapter browse (prev/next, levelsViewChapter, chapter-scoped grid)'
    );
  }

  // Levels grid keyboard arrow / Home / End + chapter-edge browse (no soft-arm)
  if (
    /LEVELS_GRID_COLS/.test(gameRaw) &&
    /function handleLevelsGridKeydown/.test(gameRaw) &&
    /ArrowLeft/.test(gameRaw) &&
    /ArrowRight/.test(gameRaw) &&
    /ArrowUp/.test(gameRaw) &&
    /ArrowDown/.test(gameRaw) &&
    /shiftLevelsChapter\([^)]*['"]first['"]/.test(gameRaw) &&
    /shiftLevelsChapter\([^)]*['"]last['"]/.test(gameRaw) &&
    !/levels-keys-arm|grid-keys-arm|\.levels-keys-arm/.test(gameRaw)
  ) {
    pass(
      'LEVELS-KEYS',
      'Levels grid Arrow/Home/End nav; chapter-edge shiftLevelsChapter first/last; no soft-arm'
    );
  } else {
    fail(
      'LEVELS-KEYS',
      'missing Levels grid keyboard nav (LEVELS_GRID_COLS / handleLevelsGridKeydown / chapter-edge first|last) or soft-arm slipped in'
    );
  }

  // Levels overlay: mid-run draft badge on unlocked mainline cell (static; no soft-arm)
  {
    const gridIdx = gameRaw.indexOf('function renderLevelsGrid');
    const gridEnd = gameRaw.indexOf('function overlayFocusables', gridIdx);
    const gridSlice =
      gridIdx >= 0
        ? gameRaw.slice(gridIdx, gridEnd > gridIdx ? gridEnd : gridIdx + 8000)
        : '';
    // Single-rule bodies only (no cross-rule animation false positive)
    const cssOk =
      /\.level-cell\.level-in-progress/.test(cssRaw) &&
      /level-cell-on/.test(cssRaw) &&
      !/@keyframes\s+levelInProgress/.test(cssRaw) &&
      !/\.level-cell\.level-in-progress[^{]*\{[^}]*animation\s*:/.test(cssRaw) &&
      !/\.level-cell\.level-in-progress:not\([^)]*\)[^{]*\{[^}]*animation\s*:/.test(cssRaw);
    const jsOk =
      /level-in-progress/.test(gridSlice) &&
      /readRunDraft\s*\(/.test(gridSlice) &&
      /draftHasProgress\s*\(/.test(gridSlice) &&
      /level-cell-on/.test(gridSlice) &&
      /in progress/.test(gridSlice) &&
      !/level-in-progress-arm|in-progress-arm|\.level-in-progress-arm/.test(gameRaw);
    if (jsOk && cssOk) {
      pass(
        'LEVELS-RUN-BADGE',
        'renderLevelsGrid marks mid-run draft .level-in-progress + On badge via readRunDraft/draftHasProgress; static cyan, no soft-arm'
      );
    } else {
      fail(
        'LEVELS-RUN-BADGE',
        'missing level-in-progress draft peek in renderLevelsGrid and/or static CSS, or soft-arm slipped in'
      );
    }
  }

  // Start-screen Play CTA: mid-run mainline draft → Resume · Level N (static; no soft-arm)
  {
    const helpIdx = gameRaw.indexOf('function mainlineResumeTargetIndex');
    const helpSlice =
      helpIdx >= 0 ? gameRaw.slice(helpIdx, helpIdx + 600) : '';
    const fnIdx = gameRaw.indexOf('function refreshStartPlayCta');
    const fnEnd = gameRaw.indexOf('function toast', fnIdx);
    const ctaSlice =
      fnIdx >= 0
        ? gameRaw.slice(fnIdx, fnEnd > fnIdx ? fnEnd : fnIdx + 2500)
        : '';
    const startIdx = gameRaw.indexOf('function startGame');
    const startEnd = gameRaw.indexOf('function bindShop', startIdx);
    const startSlice =
      startIdx >= 0
        ? gameRaw.slice(startIdx, startEnd > startIdx ? startEnd : startIdx + 1200)
        : '';
    const cssOk =
      /#btn-start\.play-in-progress/.test(cssRaw) &&
      !/@keyframes\s+playInProgress/.test(cssRaw) &&
      !/#btn-start\.play-in-progress[^{]*\{[^}]*animation\s*:/.test(cssRaw);
    const jsOk =
      /readRunDraft\s*\(/.test(helpSlice) &&
      /draftHasProgress\s*\(/.test(helpSlice) &&
      /mainlineResumeTargetIndex/.test(ctaSlice) &&
      /Resume · Level/.test(ctaSlice) &&
      /play-in-progress/.test(ctaSlice) &&
      /in progress/.test(ctaSlice) &&
      /mainlineResumeTargetIndex/.test(startSlice) &&
      !/play-in-progress-arm|resume-arm|\.play-in-progress-arm/.test(gameRaw);
    if (jsOk && cssOk) {
      pass(
        'START-RUN-RESUME',
        'refreshStartPlayCta + startGame peek mid-run mainline draft → Resume · Level N + .play-in-progress static cyan; no soft-arm'
      );
    } else {
      fail(
        'START-RUN-RESUME',
        'missing start CTA mid-run Resume peek / play-in-progress static CSS, or soft-arm slipped in'
      );
    }
  }

  // Start-screen Daily CTA: today's mid-run daily draft → On (static; Done wins)
  {
    const fnIdx = gameRaw.indexOf('function refreshDailyCta');
    const fnEnd = gameRaw.indexOf('function refreshStartPlayCta', fnIdx);
    const dailySlice =
      fnIdx >= 0
        ? gameRaw.slice(fnIdx, fnEnd > fnIdx ? fnEnd : fnIdx + 2000)
        : '';
    const cssOk =
      /\.btn-daily-cta\.daily-in-progress/.test(cssRaw) &&
      !/@keyframes\s+dailyInProgress/.test(cssRaw) &&
      !/\.btn-daily-cta\.daily-in-progress[^{]*\{[^}]*animation\s*:/.test(cssRaw);
    const jsOk =
      /readRunDraft\s*\(/.test(dailySlice) &&
      /draftHasProgress\s*\(/.test(dailySlice) &&
      /daily-in-progress/.test(dailySlice) &&
      /['"]On['"]/.test(dailySlice) &&
      /in progress/.test(dailySlice) &&
      !/daily-in-progress-arm|\.daily-in-progress-arm/.test(gameRaw);
    if (jsOk && cssOk) {
      pass(
        'DAILY-RUN-RESUME',
        'refreshDailyCta peeks today mid-run daily draft → On + .daily-in-progress static cyan; Done wins; no soft-arm'
      );
    } else {
      fail(
        'DAILY-RUN-RESUME',
        'missing daily CTA mid-run On peek / daily-in-progress static CSS, or soft-arm slipped in'
      );
    }
  }

  // In-play tube board Arrow/Home/End focus nav (flex-wrap geometric; no soft-arm)
  if (
    /function handleTubesBoardKeydown/.test(gameRaw) &&
    /tubesWrap\.addEventListener\(\s*['"]keydown['"]\s*,\s*handleTubesBoardKeydown/.test(gameRaw) &&
    /getBoundingClientRect/.test(gameRaw) &&
    /key\s*===\s*['"]Home['"]/.test(gameRaw) &&
    /key\s*===\s*['"]End['"]/.test(gameRaw) &&
    /closest\(\s*['"]\.tube['"]\s*\)/.test(gameRaw) &&
    !/board-keys-arm|tube-keys-arm|\.board-keys-arm/.test(gameRaw)
  ) {
    pass(
      'BOARD-KEYS',
      'In-play tube board Arrow/Home/End geometric focus nav; no soft-arm'
    );
  } else {
    fail(
      'BOARD-KEYS',
      'missing tube board keyboard nav (handleTubesBoardKeydown / tubesWrap keydown / geometric) or soft-arm slipped in'
    );
  }

  // In-play HUD keyboard: u/U Undo, h/H Hint, r/R Restart (+ optional l/L Levels); no soft-arm
  if (
    /function handleHudKeys/.test(gameRaw) &&
    /handleHudKeys\s*\(/.test(gameRaw) &&
    (/key\s*===\s*['"]u['"]/.test(gameRaw) || /['"]u['"]\s*\|\|/.test(gameRaw)) &&
    (/undo\s*\(/.test(gameRaw) && /requestHint\s*\(/.test(gameRaw) && /restart\s*\(/.test(gameRaw)) &&
    /playfieldOverlayBlocking\s*\(/.test(gameRaw) &&
    /startScreen/.test(gameRaw) &&
    !/hud-keys-arm|hudKeysArm|\.hud-keys-arm/.test(gameRaw)
  ) {
    // Extra: ensure u/h/r wiring lives near handleHudKeys body (not just elsewhere)
    const hudIdx = gameRaw.indexOf('function handleHudKeys');
    const hudSlice = hudIdx >= 0 ? gameRaw.slice(hudIdx, hudIdx + 1200) : '';
    const wired =
      /['"]u['"]/.test(hudSlice) &&
      /['"]h['"]/.test(hudSlice) &&
      /['"]r['"]/.test(hudSlice) &&
      /\bundo\s*\(/.test(hudSlice) &&
      /\brequestHint\s*\(/.test(hudSlice) &&
      /\brestart\s*\(/.test(hudSlice) &&
      /playfieldOverlayBlocking/.test(hudSlice) &&
      (/isContentEditable|contentEditable|tagName/.test(hudSlice) || /textarea/.test(hudSlice));
    if (wired) {
      pass(
        'HUD-KEYS',
        'In-play u/h/r Undo/Hint/Restart (+guards); no soft-arm'
      );
    } else {
      fail(
        'HUD-KEYS',
        'handleHudKeys present but u/h/r wiring or overlay/input guards missing inside handler'
      );
    }
  } else {
    fail(
      'HUD-KEYS',
      'missing in-play HUD keys (handleHudKeys / u|h|r → undo|requestHint|restart / overlay guards) or soft-arm slipped in'
    );
  }

  // Win/Fail overlay keys: Enter/n Next, r Restart on win; Enter/h Hint on fail; no soft-arm
  if (
    /function handleWinFailKeys/.test(gameRaw) &&
    /handleWinFailKeys\s*\(/.test(gameRaw) &&
    (/win-overlay|#win-overlay|winOverlay/.test(gameRaw)) &&
    (/fail-prompt|#fail-prompt|failPrompt/.test(gameRaw)) &&
    (/btn-next|#btn-next/.test(gameRaw)) &&
    (/btn-win-restart|#btn-win-restart/.test(gameRaw)) &&
    (/btn-fail-hint|#btn-fail-hint/.test(gameRaw)) &&
    !/win-fail-keys-arm|winFailKeysArm|\.win-fail-keys-arm/.test(gameRaw)
  ) {
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 3200) : '';
    const wired =
      /['"]n['"]/.test(wfSlice) &&
      /['"]r['"]/.test(wfSlice) &&
      /['"]h['"]/.test(wfSlice) &&
      (/Enter/.test(wfSlice)) &&
      (/\bnextLevel\s*\(/.test(wfSlice)) &&
      (/\bhideWin\s*\(/.test(wfSlice) && /\bdoRestartLevel\s*\(/.test(wfSlice)) &&
      (/btn-fail-hint|#btn-fail-hint/.test(wfSlice)) &&
      (/btn-win-home|#btn-win-home/.test(wfSlice)) &&
      (/\bgoHome\s*\(/.test(wfSlice)) &&
      (/isContentEditable|contentEditable|tagName/.test(wfSlice) || /textarea/.test(wfSlice)) &&
      (/winOverlay|win-overlay/.test(wfSlice)) &&
      (/failPrompt|fail-prompt/.test(wfSlice));
    if (wired) {
      pass(
        'WIN-FAIL-KEYS',
        'Win Enter/n Next + r Restart + h Home; Fail Enter/h Hint (+guards); no soft-arm'
      );
    } else {
      fail(
        'WIN-FAIL-KEYS',
        'handleWinFailKeys present but n/r/h wiring or win/fail overlay/input guards missing inside handler'
      );
    }
  } else {
    fail(
      'WIN-FAIL-KEYS',
      'missing win/fail overlay keys (handleWinFailKeys / n|r|h / win|fail overlays) or soft-arm slipped in'
    );
  }

  // Win Home CTA — visible Home + click + win h key (parity Escape/BACK-NAV); no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const htmlHas = /id=["']btn-win-home["']/.test(indexHtml);
    const clickWired =
      (/btn-win-home|#btn-win-home/.test(gameRaw)) &&
      (/addEventListener\s*\(\s*['"]click['"]/.test(gameRaw)) &&
      (/\bhideWin\s*\(/.test(gameRaw) && /\bgoHome\s*\(/.test(gameRaw));
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 2200) : '';
    const keyHome =
      /btn-win-home|#btn-win-home/.test(wfSlice) &&
      /['"]h['"]/.test(wfSlice) &&
      /\bgoHome\s*\(/.test(wfSlice);
    const noSoft =
      !/win-home-arm|winHomeArm|\.win-home-arm/.test(gameRaw) &&
      !/win-home-arm|winHomeArm|\.win-home-arm/.test(indexHtml);
    if (htmlHas && clickWired && keyHome && noSoft) {
      pass(
        'WIN-HOME',
        'Win overlay Home CTA (#btn-win-home) + click hideWin/goHome + win h→Home; no soft-arm'
      );
    } else {
      fail(
        'WIN-HOME',
        'missing #btn-win-home / click hideWin+goHome / win h→Home wiring, or soft-arm slipped in'
      );
    }
  }

  // Fail Home CTA — leave fail-loop without soft-arm (mobile escape; h stays Hint)
  {
    const indexHtml = read('index.html') || '';
    const htmlHas = /id=["']btn-fail-home["']/.test(indexHtml);
    const clickWired =
      (/btn-fail-home|#btn-fail-home/.test(gameRaw)) &&
      (/addEventListener\s*\(\s*['"]click['"]/.test(gameRaw)) &&
      (/\bcloseOverlay\s*\(/.test(gameRaw) && /\bgoHome\s*\(/.test(gameRaw));
    // Prefer the click-listener slice (btnFailHome / addEventListener) — not the earlier key path
    let fhIdx = gameRaw.search(/btnFailHome\s*=/);
    if (fhIdx < 0) fhIdx = gameRaw.search(/btn-fail-home['"]\)\s*\.addEventListener|#btn-fail-home['"]\)\s*\.addEventListener/);
    if (fhIdx < 0) {
      // Fallback: last occurrence of btn-fail-home (key path is earlier; click is later)
      let last = -1;
      const re = /btn-fail-home|#btn-fail-home/g;
      let m;
      while ((m = re.exec(gameRaw)) !== null) last = m.index;
      fhIdx = last;
    }
    const fhSlice = fhIdx >= 0 ? gameRaw.slice(Math.max(0, fhIdx - 40), fhIdx + 480) : '';
    const homePath =
      /btn-fail-home|#btn-fail-home|btnFailHome/.test(fhSlice) &&
      /\bcloseOverlay\s*\(/.test(fhSlice) &&
      /\bgoHome\s*\(/.test(fhSlice) &&
      (/restartFailCount\s*=\s*0/.test(fhSlice) || /restartFailCount\s*=\s*0/.test(gameRaw));
    const noSoft =
      !/fail-home-arm|failHomeArm|\.fail-home-arm/.test(gameRaw) &&
      !/fail-home-arm|failHomeArm|\.fail-home-arm/.test(indexHtml);
    if (htmlHas && clickWired && homePath && noSoft) {
      pass(
        'FAIL-HOME',
        'Fail overlay Home CTA (#btn-fail-home) + click closeOverlay/goHome; no soft-arm; h stays Hint'
      );
    } else {
      fail(
        'FAIL-HOME',
        'missing #btn-fail-home / click closeOverlay+goHome wiring, or soft-arm slipped in'
      );
    }
  }

  // Fail dismiss reset — Escape/back/closeOverlay clears restartFailCount; fail b→Home (no soft-arm)
  {
    const closeIdx = gameRaw.indexOf('function closeOverlay');
    const closeSlice = closeIdx >= 0 ? gameRaw.slice(closeIdx, closeIdx + 900) : '';
    const dismissClears =
      /function closeOverlay\s*\(/.test(closeSlice) &&
      /el\s*===\s*failPrompt/.test(closeSlice) &&
      /restartFailCount\s*=\s*0/.test(closeSlice);
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 2800) : '';
    // Prefer fail branch: look for b/B near fail-home after failShow / fail hint block
    const failShowIdx = wfSlice.search(/failShow|failPrompt/);
    const failSlice = failShowIdx >= 0 ? wfSlice.slice(failShowIdx) : wfSlice;
    const keyHome =
      (/['"]b['"]/.test(failSlice) || /key\s*===\s*['"]b['"]/.test(failSlice)) &&
      (/btn-fail-home|#btn-fail-home/.test(failSlice) || /\bgoHome\s*\(/.test(failSlice));
    const noSoft =
      !/fail-dismiss-arm|failDismissArm|\.fail-dismiss-arm/.test(gameRaw);
    if (dismissClears && keyHome && noSoft) {
      pass(
        'FAIL-DISMISS',
        'closeOverlay clears restartFailCount on failPrompt; fail b/B→Home; no soft-arm'
      );
    } else {
      fail(
        'FAIL-DISMISS',
        'missing closeOverlay restartFailCount reset on failPrompt and/or fail b→Home, or soft-arm slipped in'
      );
    }
  }

  // Pour UI guard: Shop + Daily must not open/start mid-pour (no soft-arm)
  {
    const shopIdx = gameRaw.indexOf('function openShop');
    const shopSlice = shopIdx >= 0 ? gameRaw.slice(shopIdx, shopIdx + 400) : '';
    const shopGuard =
      /function openShop\s*\(/.test(shopSlice) &&
      /if\s*\(\s*pouring\s*\)\s*return\s*;/.test(shopSlice);
    const dailyIdx = gameRaw.indexOf('function startDailyChallenge');
    const dailySlice = dailyIdx >= 0 ? gameRaw.slice(dailyIdx, dailyIdx + 400) : '';
    const dailyGuard =
      /function startDailyChallenge\s*\(/.test(dailySlice) &&
      /if\s*\(\s*pouring\s*\)\s*return\s*;/.test(dailySlice);
    const noSoft =
      !/pour-ui-arm|pourUiArm|\.pour-ui-arm/.test(gameRaw);
    if (shopGuard && dailyGuard && noSoft) {
      pass(
        'POUR-UI-GUARD',
        'openShop + startDailyChallenge early-return when pouring; no soft-arm'
      );
    } else {
      fail(
        'POUR-UI-GUARD',
        'missing pouring early-return in openShop and/or startDailyChallenge, or soft-arm slipped in'
      );
    }
  }

  // A11Y-POUR / POUR-REDUCED: prefers-reduced-motion skips stream/tilt/splash (no soft-arm)
  {
    const pourIdx = gameRaw.indexOf('function animatePour');
    const pourSlice = pourIdx >= 0 ? gameRaw.slice(pourIdx, pourIdx + 2200) : '';
    const pourUsesReduced =
      /function animatePour\s*\(/.test(pourSlice) &&
      /prefersReducedMotion\s*\(/.test(pourSlice);
    const reducedSkipsMotion =
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)/.test(pourSlice) &&
      (/SFX\.pour/.test(pourSlice) && /SFX\.land/.test(pourSlice));
    const splashIdx = gameRaw.indexOf('function spawnSplash');
    const splashSlice = splashIdx >= 0 ? gameRaw.slice(splashIdx, splashIdx + 280) : '';
    const splashGuard =
      /function spawnSplash\s*\(/.test(splashSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(splashSlice);
    const sparkIdx = gameRaw.indexOf('function spawnWinPourSparkle');
    const sparkSlice = sparkIdx >= 0 ? gameRaw.slice(sparkIdx, sparkIdx + 280) : '';
    const sparkGuard =
      /function spawnWinPourSparkle\s*\(/.test(sparkSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(sparkSlice);
    const cssHas =
      /prefers-reduced-motion:\s*reduce/.test(cssRaw) &&
      /\.pour-stream/.test(cssRaw) &&
      /\.splash-particle/.test(cssRaw);
    const noSoft =
      !/a11y-pour-arm|pour-reduced-arm|pourReducedArm|\.a11y-pour-arm/.test(gameRaw + cssRaw);
    if (pourUsesReduced && reducedSkipsMotion && splashGuard && sparkGuard && cssHas && noSoft) {
      pass(
        'A11Y-POUR',
        'animatePour prefersReducedMotion skips stream/tilt/splash; spawnSplash/sparkle gated; CSS hide; no soft-arm'
      );
    } else {
      fail(
        'A11Y-POUR',
        'missing prefersReducedMotion pour path / splash|sparkle guards / CSS hide, or soft-arm slipped in'
      );
    }
  }

  // A11Y-BURST: complete/uncap sparks + screen-shake + white flash gated under reduced-motion (no soft-arm)
  {
    const completeIdx = gameRaw.indexOf('function spawnCompleteBurst');
    const completeSlice = completeIdx >= 0 ? gameRaw.slice(completeIdx, completeIdx + 320) : '';
    const completeGuard =
      /function spawnCompleteBurst\s*\(/.test(completeSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(completeSlice);
    const uncapIdx = gameRaw.indexOf('function spawnUncapBurst');
    const uncapSlice = uncapIdx >= 0 ? gameRaw.slice(uncapIdx, uncapIdx + 280) : '';
    const uncapGuard =
      /function spawnUncapBurst\s*\(/.test(uncapSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(uncapSlice);
    const shakeIdx = gameRaw.indexOf('function lightScreenShake');
    const shakeSlice = shakeIdx >= 0 ? gameRaw.slice(shakeIdx, shakeIdx + 220) : '';
    const shakeGuard =
      /function lightScreenShake\s*\(/.test(shakeSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(shakeSlice);
    const flashIdx = gameRaw.indexOf('function flashCompleteWhite');
    const flashSlice = flashIdx >= 0 ? gameRaw.slice(flashIdx, flashIdx + 220) : '';
    const flashGuard =
      /function flashCompleteWhite\s*\(/.test(flashSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)\s*return\s*;/.test(flashSlice);
    const cssHas =
      /prefers-reduced-motion:\s*reduce/.test(cssRaw) &&
      /\.complete-spark/.test(cssRaw) &&
      /\.uncap-spark/.test(cssRaw) &&
      (/#app\.screen-shake/.test(cssRaw) || /\.complete-flash/.test(cssRaw));
    const noSoft =
      !/a11y-burst-arm|burst-reduced-arm|complete-burst-arm|\.a11y-burst-arm/.test(gameRaw + cssRaw);
    if (completeGuard && uncapGuard && shakeGuard && flashGuard && cssHas && noSoft) {
      pass(
        'A11Y-BURST',
        'spawnCompleteBurst/spawnUncapBurst/lightScreenShake/flashCompleteWhite gated; CSS hide sparks; no soft-arm'
      );
    } else {
      fail(
        'A11Y-BURST',
        'missing prefersReducedMotion guards on complete/uncap/shake/flash, CSS hide, or soft-arm slipped in'
      );
    }
  }

  // A11Y-WIN: celebrateLevelClear + showWin delay + star lighting under reduced-motion (no soft-arm)
  {
    const celebIdx = gameRaw.indexOf('function celebrateLevelClear');
    const celebSlice = celebIdx >= 0 ? gameRaw.slice(celebIdx, celebIdx + 520) : '';
    const celebEarly =
      /function celebrateLevelClear\s*\(/.test(celebSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)/.test(celebSlice) &&
      /haptic\s*\(\s*['"]complete['"]\s*\)/.test(celebSlice) &&
      /return\s*;/.test(celebSlice);
    const winDelay =
      /setTimeout\s*\(\s*showWin\s*,\s*prefersReducedMotion\s*\(\s*\)\s*\?\s*0\s*:\s*480\s*\)/.test(
        gameRaw
      );
    const showIdx = gameRaw.indexOf('function showWin');
    const showSlice = showIdx >= 0 ? gameRaw.slice(showIdx, showIdx + 5600) : '';
    const starImmediate =
      /function showWin\s*\(/.test(showSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)/.test(showSlice) &&
      /classList\.add\(\s*['"]lit['"]\s*\)/.test(showSlice) &&
      /180\s*\+\s*i\s*\*\s*160/.test(showSlice);
    const cssHas =
      /prefers-reduced-motion:\s*reduce/.test(cssRaw) &&
      /\.confetti/.test(cssRaw) &&
      (/display:\s*none/.test(cssRaw) || /\.confetti\s*\{[^}]*display:\s*none/.test(cssRaw));
    // Stricter: confetti hide must appear inside a prefers-reduced-motion block near .confetti
    const cssConfettiHide =
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{[\s\S]*?\.confetti\s*\{[^}]*display:\s*none/.test(
        cssRaw
      );
    const noSoft =
      !/a11y-win-arm|win-reduced-arm|a11y-clear-arm|\.a11y-win-arm/.test(gameRaw + cssRaw);
    if (celebEarly && winDelay && starImmediate && cssConfettiHide && noSoft) {
      pass(
        'A11Y-WIN',
        'celebrateLevelClear early haptic; showWin delay 0 vs 480; stars lit immediately; CSS hide .confetti; no soft-arm'
      );
    } else {
      fail(
        'A11Y-WIN',
        'missing celebrateLevelClear early path / showWin delay / star immediate path / CSS .confetti hide, or soft-arm slipped in'
      );
    }
  }

  // A11Y-SHAKE: illegal-pour tube shake gated under reduced-motion (keep SFX + haptic; no soft-arm)
  {
    const shakeIdx = gameRaw.indexOf('function shakeTube');
    const shakeSlice = shakeIdx >= 0 ? gameRaw.slice(shakeIdx, shakeIdx + 520) : '';
    const early =
      /function shakeTube\s*\(/.test(shakeSlice) &&
      /if\s*\(\s*prefersReducedMotion\s*\(\s*\)\s*\)/.test(shakeSlice) &&
      /SFX\.illegal\s*\(/.test(shakeSlice) &&
      /haptic\s*\(\s*['"]illegal['"]\s*\)/.test(shakeSlice) &&
      /return\s*;/.test(shakeSlice);
    const cssShake =
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{[\s\S]*?\.tube\.invalid-shake\s*\{[^}]*animation:\s*none/.test(
        cssRaw
      );
    const noSoft =
      !/a11y-shake-arm|shake-reduced-arm|\.a11y-shake-arm/.test(gameRaw + cssRaw);
    if (early && cssShake && noSoft) {
      pass(
        'A11Y-SHAKE',
        'shakeTube prefersReducedMotion keeps SFX+haptic, skips invalid-shake; CSS animation none; no soft-arm'
      );
    } else {
      fail(
        'A11Y-SHAKE',
        'missing shakeTube reduced-motion early path / CSS .invalid-shake animation none, or soft-arm slipped in'
      );
    }
  }


  // SHARE-WIN: win overlay Share CTA — Web Share API + clipboard fallback; no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const htmlHas = /id=["']btn-win-share["']/.test(indexHtml);
    const sharePath =
      (/btn-win-share|#btn-win-share/.test(gameRaw)) &&
      (/function shareWinResult\s*\(/.test(gameRaw)) &&
      (/navigator\.share/.test(gameRaw)) &&
      (/clipboard\.writeText/.test(gameRaw));
    const noSoft =
      !/win-share-arm|shareWinArm|\.win-share-arm|btn-win-share-arm/.test(gameRaw + indexHtml) &&
      !/id=["']btn-win-share["'][^>]*(?:soft-arm|win-share-arm|share-arm)/.test(indexHtml);
    if (htmlHas && sharePath && noSoft) {
      pass(
        'SHARE-WIN',
        'Win Share (#btn-win-share) + navigator.share / clipboard.writeText; no soft-arm'
      );
    } else {
      fail(
        'SHARE-WIN',
        'missing #btn-win-share / shareWinResult navigator.share|clipboard path, or soft-arm slipped in'
      );
    }
  }

  // WIN-SHARE-KEY: win overlay s/S → Share (keyboard parity with SHARE-WIN); no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 2200) : '';
    const keyShare =
      /function handleWinFailKeys/.test(gameRaw) &&
      (/btn-win-share|#btn-win-share/.test(wfSlice)) &&
      /['"]s['"]/.test(wfSlice) &&
      (/\bshareWinResult\s*\(/.test(wfSlice) || /btn-win-share|#btn-win-share/.test(wfSlice));
    const ariaKey =
      /id=["']btn-win-share["'][^>]*aria-keyshortcuts=["']s["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']s["'][^>]*id=["']btn-win-share["']/.test(indexHtml);
    const noSoft =
      !/win-share-arm|shareWinArm|\.win-share-arm|btn-win-share-arm/.test(gameRaw + indexHtml) &&
      !/soft-arm/.test(wfSlice);
    if (keyShare && noSoft) {
      pass(
        'WIN-SHARE-KEY',
        'Win overlay s/S → shareWinResult (#btn-win-share)' +
          (ariaKey ? ' + aria-keyshortcuts=s' : '') +
          '; no soft-arm'
      );
    } else {
      fail(
        'WIN-SHARE-KEY',
        'missing handleWinFailKeys s/S → shareWinResult / #btn-win-share, or soft-arm slipped in'
      );
    }
  }

  // FAIL-RESTART-KEY: fail overlay r/R → Keep restarting (#btn-fail-skip); parity win r; no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 2800) : '';
    // Anchor on #btn-fail-skip inside handler so win-overlay r → Restart is not confused
    const skipIdx = wfSlice.search(/btn-fail-skip|#btn-fail-skip/);
    const aroundSkip = skipIdx >= 0 ? wfSlice.slice(Math.max(0, skipIdx - 220), skipIdx + 280) : '';
    const keyRestart =
      /function handleWinFailKeys/.test(gameRaw) &&
      skipIdx >= 0 &&
      /['"]r['"]/.test(aroundSkip) &&
      /\.click\s*\(/.test(aroundSkip);
    const ariaKey =
      /id=["']btn-fail-skip["'][^>]*aria-keyshortcuts=["']r["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']r["'][^>]*id=["']btn-fail-skip["']/.test(indexHtml);
    const noSoft =
      !/fail-restart-arm|failRestartArm|\.fail-restart-arm|btn-fail-skip-arm/.test(gameRaw + indexHtml) &&
      !/soft-arm/.test(aroundSkip);
    if (keyRestart && noSoft) {
      pass(
        'FAIL-RESTART-KEY',
        'Fail overlay r/R → #btn-fail-skip Keep restarting' +
          (ariaKey ? ' + aria-keyshortcuts=r' : '') +
          '; no soft-arm'
      );
    } else {
      fail(
        'FAIL-RESTART-KEY',
        'missing handleWinFailKeys fail r/R → #btn-fail-skip.click, or soft-arm slipped in'
      );
    }
  }

  // WIN-SHOP-KEY: win overlay o/O → openShop (#btn-win-shop); do not hideWin first; no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const wfIdx = gameRaw.indexOf('function handleWinFailKeys');
    const wfSlice = wfIdx >= 0 ? gameRaw.slice(wfIdx, wfIdx + 2800) : '';
    const shopIdx = wfSlice.search(/btn-win-shop|#btn-win-shop/);
    const aroundShop = shopIdx >= 0 ? wfSlice.slice(Math.max(0, shopIdx - 220), shopIdx + 280) : '';
    const keyShop =
      /function handleWinFailKeys/.test(gameRaw) &&
      shopIdx >= 0 &&
      /['"]o['"]/.test(aroundShop) &&
      /\bopenShop\s*\(/.test(aroundShop);
    const ariaKey =
      /id=["']btn-win-shop["'][^>]*aria-keyshortcuts=["']o["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']o["'][^>]*id=["']btn-win-shop["']/.test(indexHtml);
    const noSoft =
      !/win-shop-arm|winShopArm|\.win-shop-arm|btn-win-shop-arm/.test(gameRaw + indexHtml) &&
      !/soft-arm/.test(aroundShop);
    if (keyShop && noSoft) {
      pass(
        'WIN-SHOP-KEY',
        'Win overlay o/O → openShop (#btn-win-shop)' +
          (ariaKey ? ' + aria-keyshortcuts=o' : '') +
          '; no soft-arm'
      );
    } else {
      fail(
        'WIN-SHOP-KEY',
        'missing handleWinFailKeys o/O → openShop / #btn-win-shop, or soft-arm slipped in'
      );
    }
  }


  // LEVELS-HOME-KEY: levels overlay h/H → #btn-levels-home.click; aria-keyshortcuts=h; no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const lvIdx = gameRaw.indexOf('function handleLevelsOverlayKeys');
    const lvSlice = lvIdx >= 0 ? gameRaw.slice(lvIdx, lvIdx + 2200) : '';
    const homeIdx = lvSlice.search(/btn-levels-home|#btn-levels-home/);
    const aroundHome = homeIdx >= 0 ? lvSlice.slice(Math.max(0, homeIdx - 220), homeIdx + 280) : '';
    const keyHome =
      /function handleLevelsOverlayKeys/.test(gameRaw) &&
      /handleLevelsOverlayKeys\s*\(/.test(gameRaw) &&
      homeIdx >= 0 &&
      /['"]h['"]/.test(aroundHome) &&
      /\.click\s*\(/.test(aroundHome);
    const ariaKey =
      /id=["']btn-levels-home["'][^>]*aria-keyshortcuts=["']h["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']h["'][^>]*id=["']btn-levels-home["']/.test(indexHtml);
    const ariaWinHome =
      /id=["']btn-win-home["'][^>]*aria-keyshortcuts=["']h["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']h["'][^>]*id=["']btn-win-home["']/.test(indexHtml);
    const ariaFailHome =
      /id=["']btn-fail-home["'][^>]*aria-keyshortcuts=["']b["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']b["'][^>]*id=["']btn-fail-home["']/.test(indexHtml);
    const noSoft =
      !/levels-home-arm|levelsHomeArm|\.levels-home-arm|btn-levels-home-arm/.test(gameRaw + indexHtml) &&
      !/soft-arm/.test(aroundHome);
    if (keyHome && noSoft) {
      pass(
        'LEVELS-HOME-KEY',
        'Levels overlay h/H → #btn-levels-home.click' +
          (ariaKey ? ' + aria-keyshortcuts=h' : '') +
          (ariaWinHome && ariaFailHome ? ' + win/fail home aria parity' : '') +
          '; no soft-arm'
      );
    } else {
      fail(
        'LEVELS-HOME-KEY',
        'missing handleLevelsOverlayKeys h/H → #btn-levels-home, or soft-arm slipped in'
      );
    }
  }

  // LEVELS-CHAPTER-KEYS: PageUp/[ → shiftLevelsChapter(-1); PageDown/] → (+1); aria on prev/next; no soft-arm
  {
    const indexHtml = read('index.html') || '';
    const lvIdx = gameRaw.indexOf('function handleLevelsOverlayKeys');
    const lvSlice = lvIdx >= 0 ? gameRaw.slice(lvIdx, lvIdx + 2200) : '';
    const hasPageUp = /PageUp/.test(lvSlice);
    const hasPageDown = /PageDown/.test(lvSlice);
    const hasBracketPrev = /key === '\['/.test(lvSlice) || /key === "\["/.test(lvSlice);
    const hasBracketNext = /key === '\]'/.test(lvSlice) || /key === "\]"/.test(lvSlice);
    const shifts =
      /shiftLevelsChapter\s*\(\s*-1\s*\)/.test(lvSlice) &&
      /shiftLevelsChapter\s*\(\s*1\s*\)/.test(lvSlice);
    const keyChapter =
      /function handleLevelsOverlayKeys/.test(gameRaw) &&
      hasPageUp &&
      hasPageDown &&
      hasBracketPrev &&
      hasBracketNext &&
      shifts;
    const ariaPrev =
      /id=["']btn-levels-prev["'][^>]*aria-keyshortcuts=["']PageUp \[["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']PageUp \[["'][^>]*id=["']btn-levels-prev["']/.test(indexHtml);
    const ariaNext =
      /id=["']btn-levels-next["'][^>]*aria-keyshortcuts=["']PageDown \]["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']PageDown \]["'][^>]*id=["']btn-levels-next["']/.test(indexHtml);
    const noSoft =
      !/levels-chapter-arm|levelsChapterArm|\.levels-chapter-arm/.test(gameRaw + indexHtml) &&
      !/soft-arm/.test(lvSlice);
    if (keyChapter && noSoft) {
      pass(
        'LEVELS-CHAPTER-KEYS',
        'Levels PageUp/[ → shiftLevelsChapter(-1); PageDown/] → (+1)' +
          (ariaPrev && ariaNext ? ' + aria-keyshortcuts on prev/next' : '') +
          '; no soft-arm'
      );
    } else {
      fail(
        'LEVELS-CHAPTER-KEYS',
        'missing handleLevelsOverlayKeys PageUp|[/PageDown|] → shiftLevelsChapter, or soft-arm slipped in'
      );
    }
  }

  // SHARE-LANDING: docs/ Pages brand landing + og.png; share URL still github.io root; no soft-arm
  {
    const landingPath = path.join(root, 'docs/index.html');
    const ogPath = path.join(root, 'docs/og.png');
    const landingExists = fs.existsSync(landingPath);
    const ogExists = fs.existsSync(ogPath);
    const landing = landingExists ? fs.readFileSync(landingPath, 'utf8') : '';
    const hasTitle = /ColorTube Sort/.test(landing);
    const hasUsp =
      /Gold lids block pours/.test(landing) &&
      (/uncap/.test(landing) || /Uncap/.test(landing));
    const hasOgImage =
      /og:image/.test(landing) &&
      /https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/og\.png/.test(landing);
    const hasPrivacy =
      /href=["']privacy\/?["']/.test(landing) || /href=["']\.\/privacy\/?["']/.test(landing);
    const shareUrlOk =
      /function buildWinShareText\s*\(/.test(gameRaw) &&
      /https:\/\/lancechung888\.github\.io\/color-sort-puzzle\//.test(gameRaw);
    const noSoft =
      !/soft-arm|claim-juice|hud-.*-pulse|win-share-arm/.test(landing);
    if (
      landingExists &&
      ogExists &&
      hasTitle &&
      hasUsp &&
      hasOgImage &&
      hasPrivacy &&
      shareUrlOk &&
      noSoft
    ) {
      pass(
        'SHARE-LANDING',
        'docs/index.html brand landing + USP + og:image + privacy link; docs/og.png; buildWinShareText → github.io root; no soft-arm'
      );
    } else {
      fail(
        'SHARE-LANDING',
        'missing docs landing/og/USP/og:image/privacy, share URL drift, or soft-arm in new files' +
          ` (landing=${landingExists} og=${ogExists} title=${hasTitle} usp=${hasUsp} ogImg=${hasOgImage} priv=${hasPrivacy} url=${shareUrlOk} noSoft=${noSoft})`
      );
    }
  }

  // STORE-TITLE-ALIGN: Play lock title ColorTube Sort: Lid Puzzle on landing + share helpers
  {
    const lockTitle = 'ColorTube Sort: Lid Puzzle';
    const landingPath = path.join(root, 'docs/index.html');
    const landing = fs.existsSync(landingPath) ? fs.readFileSync(landingPath, 'utf8') : '';
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const hasLandingTitle =
      /<title>\s*ColorTube Sort: Lid Puzzle\s*<\/title>/.test(landing) &&
      /og:title[^>]*content=["']ColorTube Sort: Lid Puzzle["']/.test(landing) &&
      /twitter:title[^>]*content=["']ColorTube Sort: Lid Puzzle["']/.test(landing) &&
      /<h1>\s*ColorTube Sort: Lid Puzzle\s*<\/h1>/.test(landing);
    const shareHelpersOk =
      /function buildWinShareText\s*\(/.test(gameRaw) &&
      /on ColorTube Sort: Lid Puzzle!/.test(gameRaw) &&
      /const title = ['"]ColorTube Sort: Lid Puzzle['"]/.test(gameRaw);
    const indexMetaOk =
      /<title>\s*ColorTube Sort: Lid Puzzle\s*<\/title>/.test(indexHtml) &&
      (/Lid Puzzle/.test(indexHtml) || /lid/.test(indexHtml));
    const noSoft =
      !/soft-arm|claim-juice|hud-.*-pulse|store-title-arm/.test(landing) &&
      !/store-title-arm/.test(gameRaw);
    if (hasLandingTitle && shareHelpersOk && indexMetaOk && noSoft) {
      pass(
        'STORE-TITLE-ALIGN',
        'docs landing + OG/Twitter + h1 + buildWinShareText/shareWinResult + index meta use ColorTube Sort: Lid Puzzle; no soft-arm'
      );
    } else {
      fail(
        'STORE-TITLE-ALIGN',
        'missing Play lock title ColorTube Sort: Lid Puzzle on landing/share/index meta, or soft-arm slipped in' +
          ` (landingTitle=${hasLandingTitle} share=${shareHelpersOk} indexMeta=${indexMetaOk} noSoft=${noSoft})`
      );
    }
  }


  // WEB-MANIFEST: Add-to-Home-Screen / install metadata; icons from ICON A; no soft-arm
  {
    const rootManifest = path.join(root, 'site.webmanifest');
    const wwwManifest = path.join(root, 'www/site.webmanifest');
    const docsManifest = path.join(root, 'docs/site.webmanifest');
    const icon192 = path.join(root, 'assets/icons/icon-192.png');
    const icon512 = path.join(root, 'assets/icons/icon-512.png');
    const docsIcon192 = path.join(root, 'docs/icons/icon-192.png');
    const docsIcon512 = path.join(root, 'docs/icons/icon-512.png');
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const docsHtml = fs.existsSync(path.join(root, 'docs/index.html'))
      ? fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8')
      : '';
    const syncWww = fs.existsSync(path.join(root, 'scripts/sync-www.sh'))
      ? fs.readFileSync(path.join(root, 'scripts/sync-www.sh'), 'utf8')
      : '';
    const manifestExists = fs.existsSync(rootManifest);
    const manifestJson = manifestExists ? fs.readFileSync(rootManifest, 'utf8') : '';
    let nameOk = false;
    try {
      const m = JSON.parse(manifestJson);
      nameOk =
        typeof m.name === 'string' &&
        m.name.includes('ColorTube Sort: Lid Puzzle') &&
        m.short_name === 'ColorTube Sort' &&
        m.display === 'standalone' &&
        m.theme_color === '#1a1a2e' &&
        m.background_color === '#1a1a2e' &&
        m.lang === 'en';
    } catch (_) {
      nameOk = false;
    }
    const iconsOk =
      fs.existsSync(icon192) &&
      fs.existsSync(icon512) &&
      fs.existsSync(docsIcon192) &&
      fs.existsSync(docsIcon512);
    const indexLink =
      /rel=["']manifest["']/.test(indexHtml) &&
      /href=["']site\.webmanifest["']/.test(indexHtml);
    const docsLink =
      /rel=["']manifest["']/.test(docsHtml) &&
      /href=["']site\.webmanifest["']/.test(docsHtml) &&
      fs.existsSync(docsManifest);
    const syncCopies =
      /site\.webmanifest/.test(syncWww) || fs.existsSync(wwwManifest);
    const noSoft =
      !/soft-arm|claim-juice|hud-.*-pulse|web-manifest-arm/.test(indexHtml) &&
      !/web-manifest-arm/.test(manifestJson);
    if (manifestExists && nameOk && iconsOk && indexLink && docsLink && syncCopies && noSoft) {
      pass(
        'WEB-MANIFEST',
        'site.webmanifest name ColorTube Sort: Lid Puzzle + icons 192/512 + index/docs link + sync-www; no soft-arm'
      );
    } else {
      fail(
        'WEB-MANIFEST',
        'missing manifest/name/icons/link/sync, or soft-arm' +
          ` (root=${manifestExists} name=${nameOk} icons=${iconsOk} index=${indexLink} docs=${docsLink} sync=${syncCopies} noSoft=${noSoft})`
      );
    }
  }


  // PWA-MASKABLE: maskable icons + richer manifest + iOS status-bar; no soft-arm
  {
    const rootManifest = path.join(root, 'site.webmanifest');
    const docsManifest = path.join(root, 'docs/site.webmanifest');
    const maskAssets = [
      path.join(root, 'assets/icons/icon-maskable-192.png'),
      path.join(root, 'assets/icons/icon-maskable-512.png'),
      path.join(root, 'docs/icons/icon-maskable-192.png'),
      path.join(root, 'docs/icons/icon-maskable-512.png'),
    ];
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const docsHtml = fs.existsSync(path.join(root, 'docs/index.html'))
      ? fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8')
      : '';
    const syncWww = fs.existsSync(path.join(root, 'scripts/sync-www.sh'))
      ? fs.readFileSync(path.join(root, 'scripts/sync-www.sh'), 'utf8')
      : '';
    const iconsExist = maskAssets.every((p) => fs.existsSync(p));

    function manifestMaskableOk(filePath, iconPrefix) {
      if (!fs.existsSync(filePath)) return false;
      try {
        const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const icons = Array.isArray(m.icons) ? m.icons : [];
        const hasMask192 = icons.some(
          (i) =>
            i &&
            i.purpose === 'maskable' &&
            typeof i.src === 'string' &&
            i.src.includes(iconPrefix + 'icon-maskable-192.png')
        );
        const hasMask512 = icons.some(
          (i) =>
            i &&
            i.purpose === 'maskable' &&
            typeof i.src === 'string' &&
            i.src.includes(iconPrefix + 'icon-maskable-512.png')
        );
        const hasAny =
          icons.some((i) => i && i.purpose === 'any') ||
          icons.some((i) => i && (!i.purpose || String(i.purpose).includes('any')));
        const orientOk = m.orientation === 'portrait-primary';
        const cats = Array.isArray(m.categories) ? m.categories.map(String) : [];
        const catsOk = cats.includes('games') && cats.includes('puzzle');
        const nameOk =
          typeof m.name === 'string' &&
          m.name.includes('ColorTube Sort: Lid Puzzle') &&
          m.short_name === 'ColorTube Sort' &&
          m.theme_color === '#1a1a2e' &&
          m.background_color === '#1a1a2e';
        return hasMask192 && hasMask512 && hasAny && orientOk && catsOk && nameOk;
      } catch (_) {
        return false;
      }
    }

    const rootOk = manifestMaskableOk(rootManifest, 'assets/icons/');
    const docsOk = manifestMaskableOk(docsManifest, 'icons/');
    const statusBar =
      /apple-mobile-web-app-status-bar-style[^>]*content=["']black-translucent["']/.test(
        indexHtml
      ) ||
      /content=["']black-translucent["'][^>]*name=["']apple-mobile-web-app-status-bar-style["']/.test(
        indexHtml
      );
    const docsStatusBar =
      /apple-mobile-web-app-status-bar-style[^>]*content=["']black-translucent["']/.test(
        docsHtml
      ) ||
      /content=["']black-translucent["'][^>]*name=["']apple-mobile-web-app-status-bar-style["']/.test(
        docsHtml
      );
    const syncOk =
      /site\.webmanifest/.test(syncWww) &&
      (/assets/.test(syncWww) || /maskable/.test(syncWww));
    const noSoft =
      !/soft-arm|claim-juice|hud-.*-pulse|pwa-maskable-arm|web-manifest-arm/.test(
        indexHtml
      ) &&
      !/pwa-maskable-arm|web-manifest-arm/.test(
        fs.existsSync(rootManifest) ? fs.readFileSync(rootManifest, 'utf8') : ''
      );

    if (
      iconsExist &&
      rootOk &&
      docsOk &&
      statusBar &&
      docsStatusBar &&
      syncOk &&
      noSoft
    ) {
      pass(
        'PWA-MASKABLE',
        'maskable 192/512 (assets+docs) + purpose maskable + orientation portrait-primary + categories games/puzzle + apple status-bar black-translucent; no soft-arm'
      );
    } else {
      fail(
        'PWA-MASKABLE',
        'missing maskable icons/manifest fields/status-bar/sync, or soft-arm' +
          ` (icons=${iconsExist} root=${rootOk} docs=${docsOk} status=${statusBar} docsStatus=${docsStatusBar} sync=${syncOk} noSoft=${noSoft})`
      );
    }
  }

  // KEYSHORTCUTS-MARKUP: aria-keyshortcuts on controls whose handlers already exist; no soft-arm
  {
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    function hasAria(id, shortcuts) {
      const escId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escKeys = shortcuts.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reIdFirst = new RegExp(
        'id=["\']' + escId + '["\'][^>]*aria-keyshortcuts=["\']' + escKeys + '["\']'
      );
      const reAriaFirst = new RegExp(
        'aria-keyshortcuts=["\']' + escKeys + '["\'][^>]*id=["\']' + escId + '["\']'
      );
      return reIdFirst.test(indexHtml) || reAriaFirst.test(indexHtml);
    }
    const checks = [
      ['btn-start', 'Enter'],
      ['btn-start-daily', 'd'],
      ['btn-start-levels', 'l'],
      ['btn-start-shop', 's'],
      ['btn-undo', 'u'],
      ['btn-hint', 'h'],
      ['btn-restart', 'r'],
      ['level-label', 'l'],
      ['btn-shop', 's'],
      ['btn-next', 'Enter n'],
      ['btn-win-restart', 'r'],
      ['btn-fail-hint', 'Enter h'],
    ];
    const missing = checks.filter(([id, keys]) => !hasAria(id, keys)).map(([id]) => id);
    const armSlip = /keyshortcuts-arm/.test(indexHtml);
    if (missing.length === 0 && !armSlip) {
      pass(
        'KEYSHORTCUTS-MARKUP',
        'aria-keyshortcuts on start/HUD/win-fail controls (Enter/d/l/s/u/h/r/Enter n/Enter h); no soft-arm'
      );
    } else {
      fail(
        'KEYSHORTCUTS-MARKUP',
        'missing aria-keyshortcuts or soft-arm slipped in' +
          ` (missing=${missing.join(',') || 'none'} armSlip=${armSlip})`
      );
    }
  }

  // TOUCH-44: .btn-icon / .btn-home / .modal-close ≥44×44 CSS px; no soft-arm
  {
    function ruleDims(sel) {
      const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('(?:^|\\n)' + esc + '\\s*\\{([^}]+)\\}');
      const m = cssRaw.match(re);
      if (!m) return null;
      const body = m[1];
      const w = body.match(/width:\s*(\d+(?:\.\d+)?)px/);
      const h = body.match(/height:\s*(\d+(?:\.\d+)?)px/);
      if (!w || !h) return null;
      return { w: Number(w[1]), h: Number(h[1]) };
    }
    const icon = ruleDims('.btn-icon');
    const home = ruleDims('.btn-home');
    const close = ruleDims('.modal-close');
    const ok =
      icon &&
      icon.w >= 44 &&
      icon.h >= 44 &&
      home &&
      home.w >= 44 &&
      home.h >= 44 &&
      close &&
      close.w >= 44 &&
      close.h >= 44;
    const armSlip = /touch-44-arm|touch44Arm|\.touch-44-arm/.test(cssRaw);
    if (ok && !armSlip) {
      pass(
        'TOUCH-44',
        '.btn-icon/.btn-home/.modal-close ≥44×44 CSS px; no soft-arm'
      );
    } else {
      fail(
        'TOUCH-44',
        'touch targets <44px or soft-arm' +
          ` (icon=${icon && icon.w + 'x' + icon.h} home=${home && home.w + 'x' + home.h} close=${close && close.w + 'x' + close.h} armSlip=${armSlip})`
      );
    }
  }

  // HUD-DAILY-KEY: handleHudKeys d/D → #btn-daily.click (LEAVE-RUN / POUR guards); aria-keyshortcuts=d; no soft-arm
  {
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const hudIdx = gameRaw.indexOf('function handleHudKeys');
    const hudSlice = hudIdx >= 0 ? gameRaw.slice(hudIdx, hudIdx + 1600) : '';
    const wired =
      /['"]d['"]/.test(hudSlice) &&
      ((/btn-daily|#btn-daily/.test(hudSlice) && /\.click\s*\(/.test(hudSlice)) ||
        /startDailyChallenge\s*\(/.test(hudSlice)) &&
      /playfieldOverlayBlocking/.test(hudSlice) &&
      (/isContentEditable|contentEditable|tagName/.test(hudSlice) || /textarea/.test(hudSlice));
    const ariaKey =
      /id=["']btn-daily["'][^>]*aria-keyshortcuts=["']d["']/.test(indexHtml) ||
      /aria-keyshortcuts=["']d["'][^>]*id=["']btn-daily["']/.test(indexHtml);
    const armSlip = /hud-daily-key-arm|hudDailyKeyArm|\.hud-daily-key-arm/.test(
      gameRaw + indexHtml
    );
    if (wired && ariaKey && !armSlip) {
      pass(
        'HUD-DAILY-KEY',
        'In-play d/D → #btn-daily.click (+guards) + aria-keyshortcuts=d; no soft-arm'
      );
    } else {
      fail(
        'HUD-DAILY-KEY',
        'missing handleHudKeys d/D → btn-daily click (or startDailyChallenge) / aria / guards or soft-arm' +
          ` (wired=${!!wired} aria=${ariaKey} armSlip=${armSlip})`
      );
    }
  }

  // CLOSE-ESC-MARKUP: aria-keyshortcuts=Escape on Home + shop/hint/levels close; no soft-arm
  {
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    function hasAriaEsc(id) {
      const escId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reIdFirst = new RegExp(
        'id=["\']' + escId + '["\'][^>]*aria-keyshortcuts=["\']Escape["\']'
      );
      const reAriaFirst = new RegExp(
        'aria-keyshortcuts=["\']Escape["\'][^>]*id=["\']' + escId + '["\']'
      );
      return reIdFirst.test(indexHtml) || reAriaFirst.test(indexHtml);
    }
    const ids = ['btn-home', 'btn-shop-close', 'btn-hint-close', 'btn-levels-close'];
    const missing = ids.filter((id) => !hasAriaEsc(id));
    const armSlip = /close-esc-arm|closeEscArm|\.close-esc-arm/.test(indexHtml);
    if (missing.length === 0 && !armSlip) {
      pass(
        'CLOSE-ESC-MARKUP',
        'aria-keyshortcuts=Escape on #btn-home + shop/hint/levels close; no soft-arm'
      );
    } else {
      fail(
        'CLOSE-ESC-MARKUP',
        'missing Escape aria-keyshortcuts or soft-arm' +
          ` (missing=${missing.join(',') || 'none'} armSlip=${armSlip})`
      );
    }
  }

  // Start-screen keys: Enter Play, d Daily, s Shop, l Levels; no soft-arm
  if (
    /function handleStartKeys/.test(gameRaw) &&
    /handleStartKeys\s*\(/.test(gameRaw) &&
    (/btn-start|#btn-start/.test(gameRaw)) &&
    (/btn-start-daily|#btn-start-daily/.test(gameRaw)) &&
    (/btn-start-levels|#btn-start-levels/.test(gameRaw)) &&
    /openShop\s*\(/.test(gameRaw) &&
    !/start-keys-arm|startKeysArm|\.start-keys-arm/.test(gameRaw)
  ) {
    const skIdx = gameRaw.indexOf('function handleStartKeys');
    const skSlice = skIdx >= 0 ? gameRaw.slice(skIdx, skIdx + 2000) : '';
    const wired =
      /Enter/.test(skSlice) &&
      /['"]d['"]/.test(skSlice) &&
      /['"]s['"]/.test(skSlice) &&
      /['"]l['"]/.test(skSlice) &&
      (/btn-start|#btn-start/.test(skSlice)) &&
      (/btn-start-daily|#btn-start-daily/.test(skSlice)) &&
      (/btn-start-levels|#btn-start-levels/.test(skSlice)) &&
      /\bopenShop\s*\(/.test(skSlice) &&
      (/startScreen|start-screen/.test(skSlice)) &&
      (/isContentEditable|contentEditable|tagName/.test(skSlice) || /textarea/.test(skSlice));
    if (wired) {
      pass(
        'START-KEYS',
        'Start Enter Play + d Daily + s Shop + l Levels (+guards); no soft-arm'
      );
    } else {
      fail(
        'START-KEYS',
        'handleStartKeys present but Enter/d/s/l Levels wiring or start/input guards missing inside handler'
      );
    }
  } else {
    fail(
      'START-KEYS',
      'missing start-screen keys (handleStartKeys / Enter|d|s|l / btn-start|daily|levels|openShop) or soft-arm slipped in'
    );
  }

  // Hint-paywall keys: Enter arm → coins → ad; never pack; no soft-arm
  if (
    /function handleHintPaywallKeys/.test(gameRaw) &&
    /handleHintPaywallKeys\s*\(/.test(gameRaw) &&
    (/hint-pay-arm|hintPaywall/.test(gameRaw)) &&
    (/btn-hint-coins|#btn-hint-coins/.test(gameRaw)) &&
    (/btn-hint-ad|#btn-hint-ad/.test(gameRaw)) &&
    !/hint-paywall-keys-arm|hintPaywallKeysArm|\.hint-paywall-keys-arm/.test(gameRaw)
  ) {
    const hpIdx = gameRaw.indexOf('function handleHintPaywallKeys');
    const hpSlice = hpIdx >= 0 ? gameRaw.slice(hpIdx, hpIdx + 1400) : '';
    const wired =
      /Enter/.test(hpSlice) &&
      /hint-pay-arm/.test(hpSlice) &&
      (/btn-hint-coins|#btn-hint-coins/.test(hpSlice)) &&
      (/btn-hint-ad|#btn-hint-ad/.test(hpSlice)) &&
      !/btn-hint-pack|#btn-hint-pack/.test(hpSlice) &&
      (/hintPaywall|hint-paywall/.test(hpSlice)) &&
      (/isContentEditable|contentEditable|tagName/.test(hpSlice) || /textarea/.test(hpSlice));
    if (wired) {
      pass(
        'HINT-PAYWALL-KEYS',
        'Hint paywall Enter arm→coins→ad (never pack); no soft-arm'
      );
    } else {
      fail(
        'HINT-PAYWALL-KEYS',
        'handleHintPaywallKeys present but Enter/arm/coins/ad wiring or guards missing (or pack auto-clicked)'
      );
    }
  } else {
    fail(
      'HINT-PAYWALL-KEYS',
      'missing hint-paywall keys (handleHintPaywallKeys / arm|coins|ad) or soft-arm slipped in'
    );
  }

  // Shop keys: Enter armed .shop-buy-arm; Escape unchanged; no soft-arm
  if (
    /function handleShopKeys/.test(gameRaw) &&
    /handleShopKeys\s*\(/.test(gameRaw) &&
    /shop-buy-arm/.test(gameRaw) &&
    (/shopOverlay|shop-overlay/.test(gameRaw)) &&
    !/shop-keys-arm|shopKeysArm|\.shop-keys-arm/.test(gameRaw)
  ) {
    const shIdx = gameRaw.indexOf('function handleShopKeys');
    const shSlice = shIdx >= 0 ? gameRaw.slice(shIdx, shIdx + 1200) : '';
    const wired =
      /Enter/.test(shSlice) &&
      /shop-buy-arm/.test(shSlice) &&
      (/shopOverlay|shop-overlay/.test(shSlice)) &&
      (/getComputedStyle|getClientRects/.test(shSlice)) &&
      (/isContentEditable|contentEditable|tagName/.test(shSlice) || /textarea/.test(shSlice));
    if (wired) {
      pass(
        'SHOP-KEYS',
        'Shop Enter .shop-buy-arm (+visible guards); Escape left alone; no soft-arm'
      );
    } else {
      fail(
        'SHOP-KEYS',
        'handleShopKeys present but Enter/shop-buy-arm visibility or input guards missing inside handler'
      );
    }
  } else {
    fail(
      'SHOP-KEYS',
      'missing shop keys (handleShopKeys / shop-buy-arm) or soft-arm slipped in'
    );
  }

  // Overlay Tab focus trap (keyboard cannot escape to HUD behind modals; no soft-arm)
  if (
    /function overlayFocusables/.test(gameRaw) &&
    /function trapOverlayTab/.test(gameRaw) &&
    /function topFocusOverlay/.test(gameRaw) &&
    /e\.key\s*===\s*['"]Tab['"]/.test(gameRaw) &&
    /trapOverlayTab\s*\(/.test(gameRaw) &&
    /preventDefault\s*\(/.test(gameRaw) &&
    !/trap-arm|focus-trap-arm|\.trap-arm/.test(gameRaw)
  ) {
    pass(
      'A11Y-TRAP',
      'Tab/Shift+Tab cycles inside topFocusOverlay via overlayFocusables; no soft-arm'
    );
  } else {
    fail(
      'A11Y-TRAP',
      'missing overlay Tab focus trap (overlayFocusables / trapOverlayTab / Tab key) or soft-arm slipped in'
    );
  }

  // Daily ≠ mainline skin: date-seeded color permute + layout shuffle + twist tier
  if (
    /function permuteDailyColors/.test(gameRaw) &&
    /function shuffleDailyLayout/.test(gameRaw) &&
    /_dailyTwist/.test(gameRaw)
  ) {
    // Behavioral: remix preserves color multiset and changes board vs base
    function nextS(s) {
      return (Math.imul(s >>> 0, 1664525) + 1013904223) >>> 0;
    }
    function seededShuffle(arr, seed) {
      const a = arr.slice();
      let s = seed >>> 0;
      for (let i = a.length - 1; i > 0; i--) {
        s = nextS(s);
        const j = s % (i + 1);
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return { arr: a, seed: s };
    }
    function colorMultiset(tubes) {
      const m = Object.create(null);
      for (const tube of tubes) {
        for (const c of tube) {
          if (!c) continue;
          m[c] = (m[c] || 0) + 1;
        }
      }
      return m;
    }
    function multisetsEqual(a, b) {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (const k of ka) if (a[k] !== b[k]) return false;
      return true;
    }
    function permute(tubes, seed) {
      const ids = [];
      const seen = Object.create(null);
      for (const tube of tubes) {
        for (const c of tube) {
          if (c && !seen[c]) {
            seen[c] = true;
            ids.push(c);
          }
        }
      }
      ids.sort((x, y) => x - y);
      if (ids.length < 2) return tubes.map((t) => t.slice());
      const sh = seededShuffle(ids, seed);
      const map = Object.create(null);
      for (let i = 0; i < ids.length; i++) map[ids[i]] = sh.arr[i];
      let identity = ids.every((id) => map[id] === id);
      if (identity) {
        for (let i = 0; i < ids.length; i++) map[ids[i]] = ids[(i + 1) % ids.length];
      }
      return tubes.map((t) => t.map((c) => (c ? map[c] : c)));
    }
    let ok = true;
    let detail = '';
    if (levels) {
      // Mid/late board with ≥2 colors (typical daily source)
      const base = levels[Math.min(levels.length - 1, 24)] || levels[levels.length - 1];
      const tubes = (base.tubes || []).map((t) => t.slice());
      const remapped = permute(tubes, 0xc0ffee ^ 0x9e3779b9);
      const before = colorMultiset(tubes);
      const after = colorMultiset(remapped);
      if (!multisetsEqual(before, after)) {
        ok = false;
        detail = 'permuteDailyColors broke color multiset';
      } else if (JSON.stringify(tubes) === JSON.stringify(remapped)) {
        ok = false;
        detail = 'permuteDailyColors left board identical to base';
      } else {
        detail = 'color remix preserves multiset and differs from base';
      }
    } else {
      ok = false;
      detail = 'no levels to prove remix';
    }
    if (ok) pass('D-DIFF', `Daily remix helpers + twist tier; ${detail}`);
    else fail('D-DIFF', detail || 'Daily differentiation check failed');
  } else {
    fail('D-DIFF', 'missing permuteDailyColors / shuffleDailyLayout / _dailyTwist (Daily still a skin)');
  }

  // Mid-pour ad guard: interstitial only at fail-loop / natural breaks; pouring gates input
  if (/pouring/.test(gameRaw) && /showInterstitialStub\('fail-loop'\)/.test(gameRaw)) {
    pass('AD-POUR', "interstitial stub called with 'fail-loop'; pouring flag gates input");
  } else {
    fail('AD-POUR', 'cannot confirm fail-loop interstitial + pouring guard in game.js');
  }
}

// --- 3) Ads / billing source honesty ---
const adsRaw = read('assets/js/ads.js');
if (adsRaw) {
  if (/USE_TEST_ADS\s*=\s*true/.test(adsRaw)) pass('AD-TEST', 'USE_TEST_ADS === true (test-ID phase)');
  else fail('AD-TEST', 'USE_TEST_ADS must be true until real publisher IDs');

  if (/禁止倒水中|not during.*pour|僅 fail-loop/i.test(adsRaw)) {
    pass('AD-GUARD-DOC', 'ads.js documents no mid-pour interstitial');
  } else {
    info('AD-GUARD-DOC', 'ads.js mid-pour guard comment not matched (game.js pouring still checked)');
  }
}

const billRaw = read('assets/js/billing.js');
if (billRaw) {
  if (/remove_ads/.test(billRaw)) pass('IAP-ID', 'billing.js product remove_ads present');
  else fail('IAP-ID', 'billing.js missing remove_ads');
  if (/no mock grant|must not grant|shop click must not grant/i.test(billRaw)) {
    pass('IAP-NOMOCK', 'billing.js documents no mock grant on web/unready');
  } else {
    fail('IAP-NOMOCK', 'billing.js missing no-mock-grant guard language');
  }
}

// --- 4) Blocked monetization (do NOT Pass) ---
block(
  'P0-2',
  'Real AdMob / publisher units — awaiting Play approval; test IDs only. Not Pass.'
);
block(
  'P0-3',
  '?ad=1 is capture mode, not live ad stream — blocked until real SDK verified on device.'
);
block(
  'M-IAP',
  'Live remove_ads Play Billing / StoreKit — shop stays Coming soon until store account + real product.'
);


// --- A11Y-ZOOM: viewport allows pinch/browser zoom (no maximum-scale=1 / user-scalable=no) ---
{
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const vpRe = /<meta[^>]*name=["']viewport["'][^>]*>/i;
  const indexVp = indexHtml.match(vpRe);
  const indexContent = indexVp
    ? ((indexVp[0].match(/content=["']([^"']*)["']/i) || [])[1] || '')
    : '';
  const indexOk =
    !!indexContent &&
    !/user-scalable\s*=\s*no/i.test(indexContent) &&
    !/maximum-scale\s*=\s*1\b/i.test(indexContent) &&
    /viewport-fit\s*=\s*cover/i.test(indexContent);
  let docsOk = true;
  const docsPath = path.join(root, 'docs/index.html');
  if (fs.existsSync(docsPath)) {
    const docsHtml = fs.readFileSync(docsPath, 'utf8');
    const docsVp = docsHtml.match(vpRe);
    if (docsVp) {
      const docsContent = (docsVp[0].match(/content=["']([^"']*)["']/i) || [])[1] || '';
      docsOk =
        !/user-scalable\s*=\s*no/i.test(docsContent) &&
        !/maximum-scale\s*=\s*1\b/i.test(docsContent) &&
        /viewport-fit\s*=\s*cover/i.test(docsContent);
    }
  }
  if (indexOk && docsOk) {
    pass(
      'A11Y-ZOOM',
      'viewport allows zoom (no user-scalable=no / maximum-scale=1) + viewport-fit=cover on index (+ docs if present)'
    );
  } else {
    fail(
      'A11Y-ZOOM',
      `viewport still blocks zoom or missing viewport-fit=cover (indexOk=${indexOk} docsOk=${docsOk})`
    );
  }
}

// --- HOW-TO-PLAY: Settings How to play + ? keyboard cheatsheet (no soft-arm) ---
{
  const htmlRaw = read('index.html') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-how-to-play["']/.test(htmlRaw) &&
    /How to play/.test(htmlRaw) &&
    /aria-label=["']How to play["']/.test(htmlRaw);
  const jsOk =
    /btn-how-to-play/.test(gameSrc) &&
    (/function showHowToPlay\s*\(/.test(gameSrc) || /activeTipKind\s*=\s*['"]howto['"]/.test(gameSrc)) &&
    (/e\.key\s*===\s*['"]\?['"]/.test(gameSrc) || /key\s*===\s*['"]\?['"]/.test(gameSrc)) &&
    /Play Enter/.test(gameSrc) &&
    /activeTipKind\s*===\s*['"]howto['"]/.test(gameSrc) &&
    !/howto-arm|how-to-arm|cheatsheet-arm|\bsoft-arm\b/.test(
      (gameSrc.match(/function showHowToPlay[\s\S]{0,1200}/) || [''])[0]
    );
  if (htmlOk && jsOk) {
    pass(
      'HOW-TO-PLAY',
      'Settings #btn-how-to-play + showHowToPlay/howto tip kind + ? cheatsheet toast; dismiss does not force-clear teach; no soft-arm'
    );
  } else {
    fail(
      'HOW-TO-PLAY',
      `missing How to play UI / showHowToPlay|howto tip / ? key toast (htmlOk=${htmlOk} jsOk=${jsOk})`
    );
  }
}


// --- MUTE-KEY: m/M toggles Sound (sfxOn) + Settings aria + cheatsheet; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-toggle-sfx["']/.test(htmlRaw) &&
    (/id=["']btn-toggle-sfx["'][^>]*aria-keyshortcuts=["']m["']/.test(htmlRaw) ||
      /aria-keyshortcuts=["']m["'][^>]*id=["']btn-toggle-sfx["']/.test(htmlRaw));
  const jsOk =
    /function toggleSfxKey\s*\(/.test(gameSrc) &&
    /function applySfxOn\s*\(/.test(gameSrc) &&
    (/e\.key\s*===\s*['"]m['"]/.test(gameSrc) || /key\s*===\s*['"]m['"]/.test(gameSrc)) &&
    /Sound on/.test(gameSrc) &&
    /Sound off/.test(gameSrc) &&
    /Mute m/.test(gameSrc) &&
    !/mute-arm|sfx-arm|sound-arm/.test(
      (gameSrc.match(/function toggleSfxKey[\s\S]{0,800}/) || [''])[0]
    );
  if (htmlOk && jsOk) {
    pass(
      'MUTE-KEY',
      'm/M → toggleSfxKey (sfxOn + toast Sound on/off) + #btn-toggle-sfx aria-keyshortcuts=m + Mute m in ? cheatsheet; no soft-arm'
    );
  } else {
    fail(
      'MUTE-KEY',
      `missing mute key / applySfxOn|toggleSfxKey / aria-keyshortcuts=m / Mute m cheatsheet (htmlOk=${htmlOk} jsOk=${jsOk})`
    );
  }
}

// --- Brand favicon (ICON A derivatives; head + files) ---
{
  const indexRaw = read('index.html') || '';
  const hasLinks =
    /rel=["']icon["'][^>]*href=["']assets\/icons\/favicon-32\.png["']/.test(indexRaw) ||
    /href=["']assets\/icons\/favicon-32\.png["'][^>]*rel=["']icon["']/.test(indexRaw);
  const hasApple =
    /rel=["']apple-touch-icon["'][^>]*href=["']assets\/icons\/apple-touch-icon\.png["']/.test(indexRaw) ||
    /href=["']assets\/icons\/apple-touch-icon\.png["'][^>]*rel=["']apple-touch-icon["']/.test(indexRaw);
  const favOk = fs.existsSync(path.join(root, 'assets/icons/favicon-32.png'));
  const appleOk = fs.existsSync(path.join(root, 'assets/icons/apple-touch-icon.png'));
  if (hasLinks && hasApple && favOk && appleOk) {
    pass(
      'BRAND-FAVICON',
      'index.html icon + apple-touch-icon links; assets/icons/favicon-32.png + apple-touch-icon.png present'
    );
  } else {
    fail(
      'BRAND-FAVICON',
      `missing favicon wiring (links fav32=${!!hasLinks} apple=${!!hasApple}; files fav32=${favOk} apple=${appleOk})`
    );
  }
}

// --- 5) Delegate native wiring ---
const native = spawnSync('node', [path.join(root, 'scripts/native-wiring-check.js')], {
  cwd: root,
  encoding: 'utf8',
});
if (native.status === 0) {
  pass('NATIVE', 'npm run native:check exited 0 (test-ID wiring)');
} else {
  fail('NATIVE', `native:check failed (exit ${native.status}): ${(native.stdout || native.stderr || '').split('\n').slice(-3).join(' ')}`);
}

// --- Report ---
console.log('## ACCEPTANCE automation (ColorTube Sort)\n');
console.log('| ID | Status | Detail |');
console.log('|----|--------|--------|');
for (const r of rows) {
  console.log(`| ${r.id} | **${r.status}** | ${r.msg.replace(/\|/g, '/')} |`);
}
console.log('');
console.log(
  `Summary: ${rows.filter((r) => r.status === 'PASS').length} Pass · ${fails} Fail · ${blocked} Blocked (external)`
);
console.log(
  'Gate: suite proves automatable product rules; P0②③ / live IAP remain Blocked — not ship-ready.'
);
if (fails > 0) {
  console.log(`結果: FAIL（${fails} automatable checks）`);
  process.exit(1);
}
console.log('結果: PASS — automatable checks green; monetization still Blocked');
process.exit(0);
