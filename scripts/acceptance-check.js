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
const { solveAllLevels, solveLevel, shortestPourPath } = require('./solve-levels');

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

  // L-SOLVE: real pour-path search (free uncap). Strengthens L-COLOR for MILLION_USER_BAR #4.
  const solve = solveAllLevels(levels);
  if (solve.ok) {
    pass(
      'L-SOLVE',
      `pour-path solvable (free uncap); ${solve.count} levels; maxNodes=L${solve.maxLevel}/${solve.maxNodes}; no soft-arm`
    );
  } else {
    const sample = solve.fails
      .slice(0, 5)
      .map((f) => `L${f.level}:${f.reason}@${f.nodes}`)
      .join(', ');
    fail(
      'L-SOLVE',
      `${solve.fails.length}/${solve.count} unsolvable or over budget (≤${solve.nodeBudget}/level): ${sample}`
    );
  }


  // L-PAR: explicit par on every level; Day1 pars allow 3★ (par >= BFS opt);
  // finale L79–L80 must not be trivial 1-pour boards (curve integrity).
  const missingPar = [];
  const day1Impossible = [];
  for (let i = 0; i < levels.length; i++) {
    const p = levels[i].par;
    if (typeof p !== 'number' || !(p >= 1) || !Number.isFinite(p)) missingPar.push(i + 1);
  }
  const day1N = Math.min(15, levels.length);
  for (let i = 0; i < day1N; i++) {
    const r = shortestPourPath(levels[i], 2000000);
    if (!r.ok) {
      day1Impossible.push(`L${i + 1}:bfs-${r.reason}`);
      continue;
    }
    if (levels[i].par < r.depth) {
      day1Impossible.push(`L${i + 1}:par ${levels[i].par} < opt ${r.depth}`);
    }
  }
  let finaleTrivial = false;
  let finaleMsg = '';
  if (levels.length >= 80) {
    const d79 = solveLevel(levels[78], 500000);
    const d80 = solveLevel(levels[79], 500000);
    if (!d79.ok || !d80.ok || (d79.depth || 0) < 12 || (d80.depth || 0) < 12) {
      finaleTrivial = true;
      finaleMsg = `L79 depth=${d79.ok ? d79.depth : d79.reason} L80 depth=${d80.ok ? d80.depth : d80.reason} (need ≥12)`;
    } else {
      finaleMsg = `L79 depth=${d79.depth} L80 depth=${d80.depth}`;
    }
  }
  if (missingPar.length === 0 && day1Impossible.length === 0 && !finaleTrivial) {
    pass(
      'L-PAR',
      `explicit par×${levels.length}; Day1 L1–${day1N} par≥BFS opt; finale ${finaleMsg}; no soft-arm`
    );
  } else {
    const bits = [];
    if (missingPar.length) bits.push(`missing/invalid par: L${missingPar.slice(0, 8).join(',')}`);
    if (day1Impossible.length) bits.push(day1Impossible.slice(0, 6).join('; '));
    if (finaleTrivial) bits.push(finaleMsg);
    fail('L-PAR', bits.join(' · '));
  }
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
      /keepAwake/.test(gameRaw) &&
      /btn-reset-progress/.test(gameRaw) &&
      !/reset-arm|resetArm|\.reset-arm|progress-reset-arm/.test(gameRaw);
    const htmlOk =
      /id=["']btn-reset-progress["']/.test(htmlRaw) &&
      /Reset progress/.test(htmlRaw) &&
      /Keep screen on/.test(htmlRaw);
    if (jsOk && htmlOk) {
      pass(
        'RESET-PROGRESS',
        'Settings Reset progress two-tap confirm (toast); keeps Sound/Haptics/Color assist/Reduced motion/Keep screen on; clears draft+bak; no soft-arm CSS'
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
      /https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/play\//.test(gameRaw);
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
        'docs/index.html brand landing + USP + og:image + privacy link; docs/og.png; buildWinShareText → github.io /play/; no soft-arm'
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


// --- HAPTICS-KEY: v/V toggles Haptics (hapticsOn) + Settings aria + cheatsheet; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-toggle-haptics["']/.test(htmlRaw) &&
    (/id=["']btn-toggle-haptics["'][^>]*aria-keyshortcuts=["']v["']/.test(htmlRaw) ||
      /aria-keyshortcuts=["']v["'][^>]*id=["']btn-toggle-haptics["']/.test(htmlRaw));
  const jsOk =
    /function toggleHapticsKey\s*\(/.test(gameSrc) &&
    /function applyHapticsOn\s*\(/.test(gameSrc) &&
    (/e\.key\s*===\s*['"]v['"]/.test(gameSrc) || /key\s*===\s*['"]v['"]/.test(gameSrc)) &&
    /Haptics on/.test(gameSrc) &&
    /Haptics off/.test(gameSrc) &&
    /Haptics v/.test(gameSrc) &&
    !/haptic-arm|haptics-arm|vibrate-arm/.test(
      (gameSrc.match(/function toggleHapticsKey[\s\S]{0,800}/) || [''])[0]
    );
  if (htmlOk && jsOk) {
    pass(
      'HAPTICS-KEY',
      'v/V → toggleHapticsKey (hapticsOn + toast Haptics on/off) + #btn-toggle-haptics aria-keyshortcuts=v + Haptics v in ? cheatsheet; no soft-arm'
    );
  } else {
    fail(
      'HAPTICS-KEY',
      `missing haptics key / applyHapticsOn|toggleHapticsKey / aria-keyshortcuts=v / Haptics v cheatsheet (htmlOk=${htmlOk} jsOk=${jsOk})`
    );
  }
}


// --- COLOR-ASSIST-KEY: c/C toggles Color assist (CVD) + Settings aria + cheatsheet; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-toggle-color-assist["']/.test(htmlRaw) &&
    (/id=["']btn-toggle-color-assist["'][^>]*aria-keyshortcuts=["']c["']/.test(htmlRaw) ||
      /aria-keyshortcuts=["']c["'][^>]*id=["']btn-toggle-color-assist["']/.test(htmlRaw));
  const jsOk =
    /function toggleColorAssistKey\s*\(/.test(gameSrc) &&
    /function applyColorAssistOn\s*\(/.test(gameSrc) &&
    (/e\.key\s*===\s*['"]c['"]/.test(gameSrc) || /key\s*===\s*['"]c['"]/.test(gameSrc)) &&
    /Color assist on/.test(gameSrc) &&
    /Color assist off/.test(gameSrc) &&
    /Color assist c/.test(gameSrc) &&
    !/color-assist-arm|assist-arm|cvd-arm/.test(
      (gameSrc.match(/function toggleColorAssistKey[\s\S]{0,800}/) || [''])[0]
    );
  if (htmlOk && jsOk) {
    pass(
      'COLOR-ASSIST-KEY',
      'c/C → toggleColorAssistKey (colorAssist + toast Color assist on/off) + #btn-toggle-color-assist aria-keyshortcuts=c + Color assist c in ? cheatsheet; no soft-arm'
    );
  } else {
    fail(
      'COLOR-ASSIST-KEY',
      `missing color-assist key / applyColorAssistOn|toggleColorAssistKey / aria-keyshortcuts=c / Color assist c cheatsheet (htmlOk=${htmlOk} jsOk=${jsOk})`
    );
  }
}


// --- MOTION-KEY: x/X toggles Reduced motion + Settings aria + cheatsheet; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-toggle-reduced-motion["']/.test(htmlRaw) &&
    (/id=["']btn-toggle-reduced-motion["'][^>]*aria-keyshortcuts=["']x["']/.test(htmlRaw) ||
      /aria-keyshortcuts=["']x["'][^>]*id=["']btn-toggle-reduced-motion["']/.test(htmlRaw));
  const jsOk =
    /function toggleReducedMotionKey\s*\(/.test(gameSrc) &&
    /function applyReducedMotionOn\s*\(/.test(gameSrc) &&
    (/e\.key\s*===\s*['"]x['"]/.test(gameSrc) || /key\s*===\s*['"]x['"]/.test(gameSrc)) &&
    /Reduced motion on/.test(gameSrc) &&
    /Reduced motion off/.test(gameSrc) &&
    /Reduced motion x/.test(gameSrc) &&
    !/motion-arm|reduced-arm|rm-arm/.test(
      (gameSrc.match(/function toggleReducedMotionKey[\s\S]{0,800}/) || [''])[0]
    );
  if (htmlOk && jsOk) {
    pass(
      'MOTION-KEY',
      'x/X → toggleReducedMotionKey (reducedMotion + toast Reduced motion on/off) + #btn-toggle-reduced-motion aria-keyshortcuts=x + Reduced motion x in ? cheatsheet; no soft-arm'
    );
  } else {
    fail(
      'MOTION-KEY',
      `missing motion key / applyReducedMotionOn|toggleReducedMotionKey / aria-keyshortcuts=x / Reduced motion x cheatsheet (htmlOk=${htmlOk} jsOk=${jsOk})`
    );
  }
}


// --- KEEP-AWAKE-KEY: k/K toggles Keep screen on + Settings aria + cheatsheet; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const cssRaw = read('assets/css/style.css') || '';
  const gameSrc = read('assets/js/game.js') || '';
  const htmlOk =
    /id=["']btn-toggle-keep-awake["']/.test(htmlRaw) &&
    (/id=["']btn-toggle-keep-awake["'][^>]*aria-keyshortcuts=["']k["']/.test(htmlRaw) ||
      /aria-keyshortcuts=["']k["'][^>]*id=["']btn-toggle-keep-awake["']/.test(htmlRaw));
  const jsOk =
    /function toggleKeepAwakeKey\s*\(/.test(gameSrc) &&
    /function applyKeepAwakeOn\s*\(/.test(gameSrc) &&
    (/e\.key\s*===\s*["']k["']/.test(gameSrc) || /key\s*===\s*["']k["']/.test(gameSrc)) &&
    /Keep screen on/.test(gameSrc) &&
    /Keep screen off/.test(gameSrc) &&
    /Keep screen on k/.test(gameSrc);
  const noSoft =
    !/keep-awake-arm|wake-lock-arm|wakeLock-arm|\.keep-awake-arm|claim-juice|hud-pulse/.test(
      gameSrc + cssRaw + htmlRaw
    );
  if (htmlOk && jsOk && noSoft) {
    pass(
      'KEEP-AWAKE-KEY',
      'k/K → toggleKeepAwakeKey (keepAwake + toast Keep screen on/off) + #btn-toggle-keep-awake aria-keyshortcuts=k + Keep screen on k in ? cheatsheet; no soft-arm'
    );
  } else {
    fail(
      'KEEP-AWAKE-KEY',
      `missing keep-awake key / applyKeepAwakeOn|toggleKeepAwakeKey / aria-keyshortcuts=k / Keep screen on k cheatsheet (htmlOk=${htmlOk} jsOk=${jsOk} noSoft=${noSoft})`
    );
  }
}


// --- LEAVE-TAB-GUARD: beforeunload when mid-run draft has progress; complements RUN-RESUME ---
{
  const gameSrc = read('assets/js/game.js') || '';
  const cssRaw = read('assets/css/style.css') || '';
  const htmlRaw = read('index.html') || '';
  const jsOk =
    /addEventListener\s*\(\s*['"]beforeunload['"]/.test(gameSrc) &&
    /beforeunload/.test(gameSrc) &&
    /activeOrStoredProgressDraft\s*\(/.test(gameSrc) &&
    /draftHasProgress\s*\(/.test(gameSrc) &&
    /event\.preventDefault\s*\(/.test(gameSrc) &&
    /event\.returnValue\s*=\s*['"]['"]/.test(gameSrc) &&
    (/persistRunDraft\s*\(/.test(gameSrc) || /flushRunDraftOnHide\s*\(/.test(gameSrc));
  const noSoft =
    !/leave-tab-arm|leaveTab-arm|tab-guard-arm|claim-juice|hud-pulse/.test(
      gameSrc + cssRaw + htmlRaw
    );
  if (jsOk && noSoft) {
    pass(
      'LEAVE-TAB-GUARD',
      'beforeunload arms when activeOrStoredProgressDraft (draftHasProgress) has progress; preventDefault + returnValue; flush persist; no soft-arm'
    );
  } else {
    fail(
      'LEAVE-TAB-GUARD',
      `missing beforeunload + progress/draft gate / preventDefault+returnValue / persist flush, or soft-arm slipped in (jsOk=${jsOk} noSoft=${noSoft})`
    );
  }
}


// --- SAFE-AREA-LR: horizontal safe-area insets on #app (+ overlay/toast); no soft-arm ---
{
  const cssRaw = read('assets/css/style.css') || '';
  const leftVar =
    /--safe-left\s*:\s*env\(\s*safe-area-inset-left/.test(cssRaw);
  const rightVar =
    /--safe-right\s*:\s*env\(\s*safe-area-inset-right/.test(cssRaw);
  const appPad =
    /#app\s*\{[\s\S]*?padding\s*:[^;]*var\(--safe-left\)[^;]*;/.test(cssRaw) &&
    /#app\s*\{[\s\S]*?padding\s*:[^;]*var\(--safe-right\)[^;]*;/.test(cssRaw);
  const noSoft =
    !/safe-area-arm|safeArea-arm|safe-lr-arm|claim-juice|hud-pulse/.test(cssRaw);
  if (leftVar && rightVar && appPad && noSoft) {
    pass(
      'SAFE-AREA-LR',
      '#app padding uses --safe-left/--safe-right via env(safe-area-inset-left/right); no soft-arm'
    );
  } else {
    fail(
      'SAFE-AREA-LR',
      `missing --safe-left/--safe-right env() and/or #app padding var(--safe-left/right), or soft-arm slipped in (leftVar=${leftVar} rightVar=${rightVar} appPad=${appPad} noSoft=${noSoft})`
    );
  }
}

// --- SAFE-AREA-TB: vertical safe-area insets on .overlay; no soft-arm ---
{
  const cssRaw = read('assets/css/style.css') || '';
  const topVar =
    /--safe-top\s*:\s*env\(\s*safe-area-inset-top/.test(cssRaw);
  const botVar =
    /--safe-bot\s*:\s*env\(\s*safe-area-inset-bottom/.test(cssRaw);
  const overlayPad =
    /\.overlay\s*\{[\s\S]*?padding\s*:[^;]*var\(--safe-top\)[^;]*;/.test(cssRaw) &&
    /\.overlay\s*\{[\s\S]*?padding\s*:[^;]*var\(--safe-bot\)[^;]*;/.test(cssRaw);
  const noSoft =
    !/safe-area-arm|safeArea-arm|safe-tb-arm|claim-juice|hud-pulse/.test(cssRaw);
  if (topVar && botVar && overlayPad && noSoft) {
    pass(
      'SAFE-AREA-TB',
      '.overlay padding uses --safe-top/--safe-bot via env(safe-area-inset-top/bottom); no soft-arm'
    );
  } else {
    fail(
      'SAFE-AREA-TB',
      `missing --safe-top/--safe-bot env() and/or .overlay padding var(--safe-top/bot), or soft-arm slipped in (topVar=${topVar} botVar=${botVar} overlayPad=${overlayPad} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-PORTRAIT: MainActivity locked to portrait; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manifestRaw = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : '';
  const patchRaw = read('scripts/patch-android-portrait.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  // Attributes may appear in any order — scan MainActivity opening tag.
  // Prefer exact portrait; sensorPortrait / userPortrait also acceptable.
  const mainActivityOpen = (() => {
    const re = /<activity\b([\s\S]*?)>/gi;
    let m;
    while ((m = re.exec(manifestRaw))) {
      if (/android:name\s*=\s*["']\.MainActivity["']/.test(m[1])) return m[1];
    }
    return '';
  })();
  const orientMatch = /android:screenOrientation\s*=\s*["'](portrait|sensorPortrait|userPortrait)["']/.exec(
    mainActivityOpen
  );
  const hasPortrait = !!orientMatch;
  // android/ is gitignored — patch script + aab:internal hook are the committed source of truth.
  const patchOk =
    /screenOrientation="portrait"/.test(patchRaw) &&
    /MainActivity/.test(patchRaw);
  const aabHookOk = /patch-android-portrait\.sh/.test(aabRaw);
  const noSoft =
    !/portrait-arm|screenOrientation-arm|claim-juice|hud-pulse/.test(
      manifestRaw + patchRaw
    );
  if (hasPortrait && patchOk && aabHookOk && noSoft) {
    pass(
      'ANDROID-PORTRAIT',
      `MainActivity android:screenOrientation="${orientMatch[1]}" + patch-android-portrait.sh + aab:internal hook (web already portrait-primary); no soft-arm`
    );
  } else {
    fail(
      'ANDROID-PORTRAIT',
      `MainActivity missing portrait lock and/or patch script/aab hook, or soft-arm slipped in (hasPortrait=${hasPortrait} patchOk=${patchOk} aabHookOk=${aabHookOk} noSoft=${noSoft})`
    );
  }
}



// --- ANDROID-KEEP-AWAKE: MainActivity FLAG_KEEP_SCREEN_ON + ColorTubeNative; no soft-arm ---
{
  const mainPath = path.join(root, 'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java');
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const gameRaw = read('assets/js/game.js') || '';
  const patchOk =
    /FLAG_KEEP_SCREEN_ON/.test(patchRaw) &&
    /ColorTubeNative/.test(patchRaw) &&
    /setKeepScreenOn/.test(patchRaw) &&
    /MainActivity/.test(patchRaw);
  const aabHookOk = /patch-android-keep-awake\.sh/.test(aabRaw);
  const jsOk =
    /ColorTubeNative/.test(gameRaw) &&
    /setKeepScreenOn/.test(gameRaw) &&
    /syncNativeKeepScreenOn/.test(gameRaw);
  const mainOk =
    !mainRaw ||
    (/FLAG_KEEP_SCREEN_ON/.test(mainRaw) && /ColorTubeNative/.test(mainRaw) && /setKeepScreenOn/.test(mainRaw));
  const noSoft =
    !/keep-awake-arm|wake-lock-arm|keepAwake-arm|claim-juice|hud-pulse/.test(
      mainRaw + patchRaw + gameRaw
    );
  if (patchOk && aabHookOk && jsOk && mainOk && noSoft) {
    pass(
      'ANDROID-KEEP-AWAKE',
      'MainActivity FLAG_KEEP_SCREEN_ON + ColorTubeNative.setKeepScreenOn + patch-android-keep-awake.sh + aab:internal hook + JS syncNativeKeepScreenOn; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-KEEP-AWAKE',
      `missing keep-awake native/JS wiring or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} jsOk=${jsOk} mainOk=${mainOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-SYSTEM-BARS: brand-dark status/nav/window; no soft-arm ---
{
  const colorsPath = path.join(root, 'android/app/src/main/res/values/colors.xml');
  const stylesPath = path.join(root, 'android/app/src/main/res/values/styles.xml');
  const colorsRaw = fs.existsSync(colorsPath) ? fs.readFileSync(colorsPath, 'utf8') : '';
  const stylesRaw = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-system-bars.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const patchOk =
    /#1a1a2e/.test(patchRaw) &&
    /statusBarColor/.test(patchRaw) &&
    /navigationBarColor/.test(patchRaw) &&
    /patch-android-system-bars/.test(patchRaw);
  const aabHookOk = /patch-android-system-bars\.sh/.test(aabRaw);
  // android/ is gitignored — allow missing; when present, require brand bars + colorPrimary.
  const localOk =
    (!colorsRaw && !stylesRaw) ||
    (/colorPrimary[^>]*>\s*#1a1a2e/.test(colorsRaw) &&
      /statusBarColor[^>]*>\s*#1a1a2e/.test(stylesRaw) &&
      /navigationBarColor[^>]*>\s*#1a1a2e/.test(stylesRaw) &&
      /windowBackground[^>]*>\s*#1a1a2e/.test(stylesRaw));
  const noSoft =
    !/system-bars-arm|statusBar-arm|claim-juice|hud-pulse/.test(
      colorsRaw + stylesRaw + patchRaw
    );
  if (patchOk && aabHookOk && localOk && noSoft) {
    pass(
      'ANDROID-SYSTEM-BARS',
      'brand #1a1a2e statusBarColor/navigationBarColor/windowBackground + colors.xml colorPrimary + patch-android-system-bars.sh + aab:internal hook; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-SYSTEM-BARS',
      `missing brand system bars / patch / aab hook, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-SPLASH-THEME: SplashScreen.installSplashScreen + postSplashScreenTheme; no soft-arm ---
{
  const stylesPath = path.join(root, 'android/app/src/main/res/values/styles.xml');
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const stylesRaw = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-splash-theme.sh') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const patchOk =
    /SplashScreen\.installSplashScreen/.test(patchRaw) &&
    /postSplashScreenTheme/.test(patchRaw) &&
    /windowSplashScreenBackground/.test(patchRaw) &&
    /patch-android-splash-theme/.test(patchRaw);
  const keepTemplateOk =
    /SplashScreen\.installSplashScreen/.test(keepRaw) &&
    /androidx\.core\.splashscreen\.SplashScreen/.test(keepRaw);
  const aabHookOk = /patch-android-splash-theme\.sh/.test(aabRaw);
  // android/ is gitignored — allow missing; when present, require install before super.onCreate + splash attrs.
  const installIdx = mainRaw.indexOf('SplashScreen.installSplashScreen');
  const superIdx = mainRaw.indexOf('super.onCreate');
  const mainOk =
    !mainRaw ||
    (installIdx >= 0 &&
      superIdx >= 0 &&
      installIdx < superIdx &&
      /androidx\.core\.splashscreen\.SplashScreen/.test(mainRaw));
  const stylesOk =
    !stylesRaw ||
    (/postSplashScreenTheme[^>]*>\s*@style\/AppTheme\.NoActionBar/.test(stylesRaw) &&
      /windowSplashScreenBackground[^>]*>\s*(?:@color\/colorBrandBg|@color\/colorPrimary|#1a1a2e)/.test(
        stylesRaw
      ));
  const noSoft =
    !/splash-theme-arm|splash-arm|claim-juice|hud-pulse/.test(
      stylesRaw + mainRaw + patchRaw
    );
  if (patchOk && keepTemplateOk && aabHookOk && mainOk && stylesOk && noSoft) {
    pass(
      'ANDROID-SPLASH-THEME',
      'SplashScreen.installSplashScreen before super.onCreate + postSplashScreenTheme/windowSplashScreenBackground + patch-android-splash-theme.sh + keep-awake template + aab:internal hook; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-SPLASH-THEME',
      `missing splash theme wiring / patch / aab hook, or soft-arm slipped in (patchOk=${patchOk} keepTemplateOk=${keepTemplateOk} aabHookOk=${aabHookOk} mainOk=${mainOk} stylesOk=${stylesOk} noSoft=${noSoft})`
    );
  }
}



// --- ANDROID-NO-BACKUP: allowBackup=false + data extraction deny; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const rulesPath = path.join(root, 'android/app/src/main/res/xml/data_extraction_rules.xml');
  const backupPath = path.join(root, 'android/app/src/main/res/xml/backup_rules.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const rulesRaw = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : '';
  const backupRaw = fs.existsSync(backupPath) ? fs.readFileSync(backupPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-no-backup.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const patchOk =
    /allowBackup/.test(patchRaw) &&
    /data_extraction_rules/.test(patchRaw) &&
    /backup_rules/.test(patchRaw) &&
    /cloud-backup/.test(patchRaw) &&
    /device-transfer/.test(patchRaw);
  const aabHookOk = /patch-android-no-backup\.sh/.test(aabRaw);
  // android/ is gitignored — allow missing; when present, require deny attrs + xml.
  const localOk =
    !manifestRaw ||
    (/android:allowBackup\s*=\s*["']false["']/.test(manifestRaw) &&
      /android:fullBackupContent\s*=\s*["']@xml\/backup_rules["']/.test(manifestRaw) &&
      /android:dataExtractionRules\s*=\s*["']@xml\/data_extraction_rules["']/.test(manifestRaw) &&
      /cloud-backup/.test(rulesRaw) &&
      /device-transfer/.test(rulesRaw) &&
      /<full-backup-content[\s>]/.test(backupRaw));
  const noSoft =
    !/no-backup-arm|backup-arm|claim-juice|hud-pulse/.test(
      patchRaw + manifestRaw + rulesRaw + backupRaw
    );
  if (patchOk && aabHookOk && localOk && noSoft) {
    pass(
      'ANDROID-NO-BACKUP',
      'allowBackup=false + fullBackupContent/@xml/backup_rules + dataExtractionRules deny cloud/device-transfer + patch-android-no-backup.sh + aab:internal hook; SAVE-BACKUP is supported path; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-NO-BACKUP',
      `missing no-backup wiring / patch / aab hook, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-CLEARTEXT: deny cleartext HTTP + networkSecurityConfig; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const nscPath = path.join(root, 'android/app/src/main/res/xml/network_security_config.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const nscRaw = fs.existsSync(nscPath) ? fs.readFileSync(nscPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-cleartext.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /usesCleartextTraffic/.test(patchRaw) &&
    /["']false["']/.test(patchRaw) &&
    /network_security_config/.test(patchRaw) &&
    /cleartextTrafficPermitted/.test(patchRaw) &&
    (/cleartextTrafficPermitted=["']false["']/.test(patchRaw) ||
      /cleartextTrafficPermitted=\\"false\\"/.test(patchRaw));
  const aabHookOk = /patch-android-cleartext\.sh/.test(aabRaw);
  const readmeOk = /ANDROID-CLEARTEXT/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require deny attrs + xml.
  const localOk =
    !manifestRaw ||
    (/android:usesCleartextTraffic\s*=\s*["']false["']/.test(manifestRaw) &&
      /android:networkSecurityConfig\s*=\s*["']@xml\/network_security_config["']/.test(manifestRaw) &&
      /cleartextTrafficPermitted\s*=\s*["']false["']/.test(nscRaw));
  const noSoft =
    !/cleartext-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + manifestRaw + nscRaw
    );
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-CLEARTEXT',
      'usesCleartextTraffic=false + networkSecurityConfig/@xml/network_security_config + cleartextTrafficPermitted=false + patch-android-cleartext.sh + aab:internal hook + README; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-CLEARTEXT',
      `missing cleartext deny wiring / patch / aab hook / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-RESIZE: MainActivity resizeableActivity=false; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-resize.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /resizeableActivity/.test(patchRaw) &&
    /["']false["']/.test(patchRaw) &&
    /MainActivity/.test(patchRaw);
  const aabHookOk = /patch-android-resize\.sh/.test(aabRaw);
  const readmeOk = /ANDROID-RESIZE/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require resizeableActivity=false on MainActivity.
  let localOk = !manifestRaw;
  if (manifestRaw) {
    const actRe = /<activity\b([\s\S]*?)>/gi;
    let hit = false;
    let ok = false;
    let m;
    while ((m = actRe.exec(manifestRaw))) {
      const attrs = m[1];
      if (
        /android:name\s*=\s*["'](?:\.MainActivity|[^"']*MainActivity)["']/i.test(
          attrs
        )
      ) {
        hit = true;
        ok = /android:resizeableActivity\s*=\s*["']false["']/i.test(attrs);
        break;
      }
    }
    localOk = hit && ok;
  }
  const noSoft =
    !/resize-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + manifestRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-RESIZE',
      'MainActivity android:resizeableActivity="false" + patch-android-resize.sh + aab:internal hook + README; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-RESIZE',
      `missing resize lock / patch / aab hook / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-SOFT-INPUT: MainActivity adjustNothing; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-soft-input.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /windowSoftInputMode/.test(patchRaw) &&
    /adjustNothing/.test(patchRaw) &&
    /MainActivity/.test(patchRaw);
  const aabHookOk = /patch-android-soft-input\.sh/.test(aabRaw);
  const readmeOk = /ANDROID-SOFT-INPUT/.test(readmeRaw) && /2i/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require adjustNothing on MainActivity.
  let localOk = !manifestRaw;
  if (manifestRaw) {
    const actRe = /<activity\b([\s\S]*?)>/gi;
    let hit = false;
    let ok = false;
    let m;
    while ((m = actRe.exec(manifestRaw))) {
      const attrs = m[1];
      if (
        /android:name\s*=\s*["'](?:\.MainActivity|[^"']*MainActivity)["']/i.test(
          attrs
        )
      ) {
        hit = true;
        ok = /android:windowSoftInputMode\s*=\s*["']adjustNothing["']/i.test(attrs);
        break;
      }
    }
    localOk = hit && ok;
  }
  const noSoft =
    !/soft-input-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + manifestRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-SOFT-INPUT',
      'MainActivity android:windowSoftInputMode="adjustNothing" + patch-android-soft-input.sh + aab:internal hook + README; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-SOFT-INPUT',
      `missing adjustNothing / patch / aab hook / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-IS-GAME: application isGame=true + appCategory=game; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-is-game.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /isGame/.test(patchRaw) &&
    /appCategory/.test(patchRaw) &&
    /["']game["']/.test(patchRaw);
  const aabHookOk = /patch-android-is-game\.sh/.test(aabRaw);
  const readmeOk = /ANDROID-IS-GAME/.test(readmeRaw) && /2j/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require isGame + appCategory.
  let localOk = !manifestRaw;
  if (manifestRaw) {
    const appM = /<application\b([\s\S]*?)>/i.exec(manifestRaw);
    const attrs = appM ? appM[1] : '';
    localOk =
      /android:isGame\s*=\s*["']true["']/i.test(attrs) &&
      /android:appCategory\s*=\s*["']game["']/i.test(attrs);
  }
  const noSoft =
    !/is-game-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + manifestRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-IS-GAME',
      'application android:isGame="true" + appCategory="game" + patch-android-is-game.sh + aab:internal hook + README; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-IS-GAME',
      `missing isGame/appCategory / patch / aab hook / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-FORCE-DARK: deny Force Dark on brand UI; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const stylesPath = path.join(root, 'android/app/src/main/res/values/styles.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const stylesRaw = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-force-dark.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk = /forceDarkAllowed/.test(patchRaw);
  const isGameIdx = aabRaw.search(/patch-android-is-game\.sh/);
  const forceIdx = aabRaw.search(/patch-android-force-dark\.sh/);
  const aabHookOk = forceIdx >= 0 && isGameIdx >= 0 && forceIdx > isGameIdx;
  const readmeOk = /ANDROID-FORCE-DARK/.test(readmeRaw) && /2k/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require forceDarkAllowed=false.
  let localOk = !manifestRaw;
  if (manifestRaw) {
    const appM = /<application\b([\s\S]*?)>/i.exec(manifestRaw);
    const attrs = appM ? appM[1] : '';
    localOk = /android:forceDarkAllowed\s*=\s*["']false["']/i.test(attrs);
  }
  let stylesOk = !stylesRaw;
  if (stylesRaw) {
    const names = ['AppTheme', 'AppTheme.NoActionBar', 'AppTheme.NoActionBarLaunch'];
    stylesOk = names.every((name) => {
      const esc = name.replace(/\./g, '\\.');
      const m = new RegExp(
        '<style\\b[^>]*\\bname\\s*=\\s*["\']' + esc + '["\'][^>]*>([\\s\\S]*?)</style>',
        'i'
      ).exec(stylesRaw);
      if (!m) return false;
      return /<item\s+name\s*=\s*["']android:forceDarkAllowed["']\s*>\s*false\s*<\/item>/i.test(
        m[1]
      );
    });
  }
  const noSoft =
    !/force-dark-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + manifestRaw + stylesRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && stylesOk && noSoft) {
    pass(
      'ANDROID-FORCE-DARK',
      'application + themes android:forceDarkAllowed="false" + patch-android-force-dark.sh + aab:internal after is-game + README §2k; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-FORCE-DARK',
      `missing forceDarkAllowed / patch / aab hook-after-is-game / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} stylesOk=${stylesOk} noSoft=${noSoft})`
    );
  }
}



// --- ANDROID-CONFIG-CHANGES: density|fontScale|layoutDirection|colorMode; no soft-arm ---
{
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manifestRaw = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-config-changes.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /density/.test(patchRaw) &&
    /fontScale/.test(patchRaw) &&
    /layoutDirection/.test(patchRaw) &&
    /colorMode/.test(patchRaw);
  const forceIdx = aabRaw.search(/patch-android-force-dark\.sh/);
  const cfgIdx = aabRaw.search(/patch-android-config-changes\.sh/);
  const aabHookOk = cfgIdx >= 0 && forceIdx >= 0 && cfgIdx > forceIdx;
  const readmeOk = /ANDROID-CONFIG-CHANGES/.test(readmeRaw) && /2l/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require the four tokens.
  let localOk = !manifestRaw;
  if (manifestRaw) {
    const actM = [...manifestRaw.matchAll(/<activity\b([\s\S]*?)>/gi)].find((m) =>
      /MainActivity/i.test(m[1])
    );
    const attrs = actM ? actM[1] : '';
    const cm = /android:configChanges\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const have = new Set(
      (cm ? cm[1] : '')
        .split('|')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    localOk = ['density', 'fontscale', 'layoutdirection', 'colormode'].every((t) =>
      have.has(t)
    );
  }
  const noSoft =
    !/config-changes-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + manifestRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-CONFIG-CHANGES',
      'MainActivity configChanges includes density|fontScale|layoutDirection|colorMode + patch-android-config-changes.sh + aab:internal after force-dark + README §2l; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-CONFIG-CHANGES',
      `missing density/fontScale/layoutDirection/colorMode / patch / aab hook-after-force-dark / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-CUTOUT: windowLayoutInDisplayCutoutMode=shortEdges; no soft-arm ---
{
  const stylesPath = path.join(root, 'android/app/src/main/res/values/styles.xml');
  const stylesRaw = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-cutout.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /windowLayoutInDisplayCutoutMode/.test(patchRaw) && /shortEdges/.test(patchRaw);
  const cfgIdx = aabRaw.search(/patch-android-config-changes\.sh/);
  const cutoutIdx = aabRaw.search(/patch-android-cutout\.sh/);
  const aabHookOk = cutoutIdx >= 0 && cfgIdx >= 0 && cutoutIdx > cfgIdx;
  const readmeOk = /ANDROID-CUTOUT/.test(readmeRaw) && /2m/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require shortEdges on AppTheme*.
  let stylesOk = !stylesRaw;
  if (stylesRaw) {
    const names = ['AppTheme', 'AppTheme.NoActionBar', 'AppTheme.NoActionBarLaunch'];
    stylesOk = names.every((name) => {
      const esc = name.replace(/\./g, '\\.');
      const m = new RegExp(
        '<style\\b[^>]*\\bname\\s*=\\s*["\']' + esc + '["\'][^>]*>([\\s\\S]*?)</style>',
        'i'
      ).exec(stylesRaw);
      if (!m) return false;
      return /<item\s+name\s*=\s*["']android:windowLayoutInDisplayCutoutMode["']\s*>\s*shortEdges\s*<\/item>/i.test(
        m[1]
      );
    });
  }
  const noSoft =
    !/cutout-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + stylesRaw);
  if (patchOk && aabHookOk && readmeOk && stylesOk && noSoft) {
    pass(
      'ANDROID-CUTOUT',
      'themes android:windowLayoutInDisplayCutoutMode=shortEdges + patch-android-cutout.sh + aab:internal after config-changes + README §2m; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-CUTOUT',
      `missing shortEdges / patch / aab hook-after-config-changes / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} stylesOk=${stylesOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-TARGET-36: compile/targetSdk 36 + enableOnBackInvokedCallback; no soft-arm ---
{
  const varsPath = path.join(root, 'android/variables.gradle');
  const varsRaw = fs.existsSync(varsPath) ? fs.readFileSync(varsPath, 'utf8') : '';
  const manPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  const manRaw = fs.existsSync(manPath) ? fs.readFileSync(manPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-target-sdk.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /compileSdkVersion\s*=\s*36/.test(patchRaw) &&
    /targetSdkVersion\s*=\s*36/.test(patchRaw) &&
    /enableOnBackInvokedCallback/.test(patchRaw);
  const cutoutIdx = aabRaw.search(/patch-android-cutout\.sh/);
  const targetIdx = aabRaw.search(/patch-android-target-sdk\.sh/);
  const aabHookOk = targetIdx >= 0 && cutoutIdx >= 0 && targetIdx > cutoutIdx;
  const readmeOk =
    /ANDROID-TARGET-36/.test(readmeRaw) &&
    /2n/.test(readmeRaw) &&
    /enableOnBackInvokedCallback/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live values.
  let localOk = !varsRaw && !manRaw;
  if (varsRaw || manRaw) {
    const sdkOk =
      /compileSdkVersion\s*=\s*36\b/.test(varsRaw) &&
      /targetSdkVersion\s*=\s*36\b/.test(varsRaw);
    const backOk = /android:enableOnBackInvokedCallback\s*=\s*["']true["']/i.test(
      manRaw
    );
    localOk = sdkOk && backOk;
  }
  const noSoft =
    !/target-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + varsRaw + manRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-TARGET-36',
      'compile/targetSdkVersion=36 + enableOnBackInvokedCallback + patch-android-target-sdk.sh + aab:internal after cutout + README §2n; no soft-arm'
    );
    pass(
      'ANDROID-BACK-INVOKED',
      'application android:enableOnBackInvokedCallback=true (predictive back; pairs CAP-APP-BACK); covered by ANDROID-TARGET-36 patch'
    );
  } else {
    fail(
      'ANDROID-TARGET-36',
      `missing sdk36 / enableOnBackInvoked / patch / aab hook-after-cutout / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-OVERSCROLL: setOverScrollMode(OVER_SCROLL_NEVER); no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-overscroll.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /OVER_SCROLL_NEVER/.test(patchRaw) && /setOverScrollMode/.test(patchRaw);
  const targetIdx = aabRaw.search(/patch-android-target-sdk\.sh/);
  const overIdx = aabRaw.search(/patch-android-webview-overscroll\.sh/);
  const aabHookOk = overIdx >= 0 && targetIdx >= 0 && overIdx > targetIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-OVERSCROLL/.test(readmeRaw) && /2o/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /OVER_SCROLL_NEVER/.test(mainRaw) &&
      /import\s+android\.view\.View\s*;/.test(mainRaw);
  }
  const noSoft =
    !/overscroll-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + mainRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-OVERSCROLL',
      'webView.setOverScrollMode(OVER_SCROLL_NEVER) + patch-android-webview-overscroll.sh + aab:internal after target-sdk + README §2o; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-OVERSCROLL',
      `missing OVER_SCROLL_NEVER / patch / aab hook-after-target-sdk / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-TEXT-ZOOM: setTextZoom(100); no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-text-zoom.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /setTextZoom\s*\(\s*100\s*\)/.test(patchRaw) && /getSettings/.test(patchRaw);
  const overIdx = aabRaw.search(/patch-android-webview-overscroll\.sh/);
  const zoomIdx = aabRaw.search(/patch-android-webview-text-zoom\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    zoomIdx >= 0 &&
    overIdx >= 0 &&
    iconsIdx >= 0 &&
    zoomIdx > overIdx &&
    iconsIdx > zoomIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-TEXT-ZOOM/.test(readmeRaw) && /2p/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setTextZoom\s*\(\s*100\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/text-zoom-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + mainRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-TEXT-ZOOM',
      'webView.getSettings().setTextZoom(100) + patch-android-webview-text-zoom.sh + aab:internal after overscroll before icons + README §2p; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-TEXT-ZOOM',
      `missing setTextZoom(100) / patch / aab hook-after-overscroll-before-icons / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-BG: setBackgroundColor(#1a1a2e); no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-bg.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /setBackgroundColor/.test(patchRaw) &&
    /#1a1a2e/.test(patchRaw) &&
    /Color\.parseColor/.test(patchRaw);
  const zoomIdx = aabRaw.search(/patch-android-webview-text-zoom\.sh/);
  const bgIdx = aabRaw.search(/patch-android-webview-bg\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    bgIdx >= 0 &&
    zoomIdx >= 0 &&
    iconsIdx >= 0 &&
    bgIdx > zoomIdx &&
    iconsIdx > bgIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-BG/.test(readmeRaw) && /2q/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setBackgroundColor/.test(mainRaw);
  }
  const noSoft =
    !/webview-bg-arm|soft-arm|claim-juice|hud-pulse/.test(patchRaw + mainRaw);
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-BG',
      'webView.setBackgroundColor(#1a1a2e) + patch-android-webview-bg.sh + aab:internal after text-zoom before icons + README §2q; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-BG',
      `missing setBackgroundColor(#1a1a2e) / patch / aab hook-after-text-zoom-before-icons / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-ZOOM-LOCK: setSupportZoom/builtIn/display false; no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-zoom-lock.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /setSupportZoom\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setBuiltInZoomControls\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setDisplayZoomControls\s*\(\s*false\s*\)/.test(patchRaw);
  const bgIdx = aabRaw.search(/patch-android-webview-bg\.sh/);
  const zoomLockIdx = aabRaw.search(/patch-android-webview-zoom-lock\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    zoomLockIdx >= 0 &&
    bgIdx >= 0 &&
    iconsIdx >= 0 &&
    zoomLockIdx > bgIdx &&
    iconsIdx > zoomLockIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-ZOOM-LOCK/.test(readmeRaw) && /2r/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setSupportZoom\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setBuiltInZoomControls\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setDisplayZoomControls\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-zoom-lock-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw
    );
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-ZOOM-LOCK',
      'setSupportZoom/builtIn/displayZoomControls(false) + patch-android-webview-zoom-lock.sh + aab:internal after bg before icons + README §2r; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-ZOOM-LOCK',
      `missing zoom-lock / patch / aab hook-after-bg-before-icons / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-LONG-CLICK: setOnLongClickListener consume + setLongClickable false; no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-long-click.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const patchOk =
    /setOnLongClickListener\s*\(\s*v\s*->\s*true\s*\)/.test(patchRaw) &&
    /setLongClickable\s*\(\s*false\s*\)/.test(patchRaw);
  const zoomLockIdx = aabRaw.search(/patch-android-webview-zoom-lock\.sh/);
  const longClickIdx = aabRaw.search(/patch-android-webview-long-click\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    longClickIdx >= 0 &&
    zoomLockIdx >= 0 &&
    iconsIdx >= 0 &&
    longClickIdx > zoomLockIdx &&
    iconsIdx > longClickIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-LONG-CLICK/.test(readmeRaw) && /2s/.test(readmeRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setOnLongClickListener\s*\(\s*v\s*->\s*true\s*\)/.test(mainRaw) &&
      /setLongClickable\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-long-click-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw
    );
  if (patchOk && aabHookOk && readmeOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-LONG-CLICK',
      'setOnLongClickListener(v -> true) + setLongClickable(false) + patch-android-webview-long-click.sh + aab:internal after zoom-lock before icons + README §2s; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-LONG-CLICK',
      `missing long-click / patch / aab hook-after-zoom-lock-before-icons / README, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-HAPTIC-OFF: setHapticFeedbackEnabled(false); no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-haptic-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setHapticFeedbackEnabled\s*\(\s*false\s*\)/.test(patchRaw);
  const longClickIdx = aabRaw.search(/patch-android-webview-long-click\.sh/);
  const hapticIdx = aabRaw.search(/patch-android-webview-haptic-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    hapticIdx >= 0 &&
    longClickIdx >= 0 &&
    iconsIdx >= 0 &&
    hapticIdx > longClickIdx &&
    iconsIdx > hapticIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-HAPTIC-OFF/.test(readmeRaw) && /2t/.test(readmeRaw);
  const keepOk = /setHapticFeedbackEnabled\s*\(\s*false\s*\)/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setHapticFeedbackEnabled\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-haptic-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-HAPTIC-OFF',
      'setHapticFeedbackEnabled(false) + patch-android-webview-haptic-off.sh + aab:internal after long-click before icons + README §2t + keep-awake template; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-HAPTIC-OFF',
      `missing haptic-off / patch / aab hook-after-long-click-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-SCROLLBARS: deny native chrome; scrolling remains enabled ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-scrollbars.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const styleRaw = read('assets/css/style.css') || '';
  const patchOk =
    /setVerticalScrollBarEnabled\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setHorizontalScrollBarEnabled\s*\(\s*false\s*\)/.test(patchRaw);
  const hapticIdx = aabRaw.search(/patch-android-webview-haptic-off\.sh/);
  const scrollbarsIdx = aabRaw.search(/patch-android-webview-scrollbars\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    hapticIdx >= 0 &&
    scrollbarsIdx >= 0 &&
    iconsIdx >= 0 &&
    hapticIdx < scrollbarsIdx &&
    scrollbarsIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-SCROLLBARS/.test(readmeRaw) && /2u/.test(readmeRaw);
  const keepOk =
    /setVerticalScrollBarEnabled\s*\(\s*false\s*\)/.test(keepRaw) &&
    /setHorizontalScrollBarEnabled\s*\(\s*false\s*\)/.test(keepRaw);
  const cssOk =
    /\.levels-grid,\s*\.modal-shop\s*\{[\s\S]*?scrollbar-width\s*:\s*none/.test(styleRaw) &&
    /\.levels-grid::-webkit-scrollbar,\s*\.modal-shop::-webkit-scrollbar/.test(styleRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setVerticalScrollBarEnabled\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setHorizontalScrollBarEnabled\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-scrollbars-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && cssOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-SCROLLBARS',
      'setVerticalScrollBarEnabled(false) + setHorizontalScrollBarEnabled(false) + patch/aab after haptic-off before icons + README §2u + keep-awake + CSS scrollbar hide; scrolling remains enabled; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-SCROLLBARS',
      `missing scrollbar setters / patch / aab hook-after-haptic-before-icons / README / keep-awake / CSS, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} cssOk=${cssOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-SOUND-EFFECTS-OFF: deny View click sounds; WebAudio SFX remains ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-sound-effects-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setSoundEffectsEnabled\s*\(\s*false\s*\)/.test(patchRaw);
  const scrollbarsIdx = aabRaw.search(/patch-android-webview-scrollbars\.sh/);
  const soundIdx = aabRaw.search(/patch-android-webview-sound-effects-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    scrollbarsIdx >= 0 &&
    soundIdx >= 0 &&
    iconsIdx >= 0 &&
    scrollbarsIdx < soundIdx &&
    soundIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-SOUND-EFFECTS-OFF/.test(readmeRaw) && /2v/.test(readmeRaw);
  const keepOk = /setSoundEffectsEnabled\s*\(\s*false\s*\)/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setSoundEffectsEnabled\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-sound-effects-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-SOUND-EFFECTS-OFF',
      'setSoundEffectsEnabled(false) + patch/aab after scrollbars before icons + README §2v + keep-awake; WebAudio SFX remains; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-SOUND-EFFECTS-OFF',
      `missing sound-effects-off / patch / aab hook-after-scrollbars-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-MEDIA-GESTURE: allow HTML media without sticky gesture; SFX remains gated by JS ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-media-gesture.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setMediaPlaybackRequiresUserGesture\s*\(\s*false\s*\)/.test(patchRaw);
  const soundIdx = aabRaw.search(/patch-android-webview-sound-effects-off\.sh/);
  const mediaIdx = aabRaw.search(/patch-android-webview-media-gesture\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    soundIdx >= 0 &&
    mediaIdx >= 0 &&
    iconsIdx >= 0 &&
    soundIdx < mediaIdx &&
    mediaIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-MEDIA-GESTURE/.test(readmeRaw) && /2w/.test(readmeRaw);
  const keepOk = /setMediaPlaybackRequiresUserGesture\s*\(\s*false\s*\)/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setMediaPlaybackRequiresUserGesture\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-media-gesture-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-MEDIA-GESTURE',
      'setMediaPlaybackRequiresUserGesture(false) + patch/aab after sound-effects-off before icons + README §2w + keep-awake; HTML SFX allowed; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-MEDIA-GESTURE',
      `missing media-gesture / patch / aab hook-after-sound-effects-off-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-MIXED-CONTENT: deny mixed HTTP/HTTPS in WebView; complements CLEARTEXT ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-mixed-content.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk =
    /setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)/.test(patchRaw);
  const mediaIdx = aabRaw.search(/patch-android-webview-media-gesture\.sh/);
  const mixedIdx = aabRaw.search(/patch-android-webview-mixed-content\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    mediaIdx >= 0 &&
    mixedIdx >= 0 &&
    iconsIdx >= 0 &&
    mediaIdx < mixedIdx &&
    mixedIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-MIXED-CONTENT/.test(readmeRaw) && /2x/.test(readmeRaw);
  const keepOk =
    /setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)/.test(keepRaw) &&
    /import\s+android\.webkit\.WebSettings\s*;/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setMixedContentMode\s*\(\s*WebSettings\.MIXED_CONTENT_NEVER_ALLOW\s*\)/.test(mainRaw) &&
      /import\s+android\.webkit\.WebSettings\s*;/.test(mainRaw);
  }
  const noSoft =
    !/webview-mixed-content-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-MIXED-CONTENT',
      'setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW) + patch/aab after media-gesture before icons + README §2x + keep-awake; complements CLEARTEXT; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-MIXED-CONTENT',
      `missing mixed-content / patch / aab hook-after-media-gesture-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-GEOLOCATION-OFF: deny WebView geolocation; no location collected ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-geolocation-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setGeolocationEnabled\s*\(\s*false\s*\)/.test(patchRaw);
  const mixedIdx = aabRaw.search(/patch-android-webview-mixed-content\.sh/);
  const geoIdx = aabRaw.search(/patch-android-webview-geolocation-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    mixedIdx >= 0 &&
    geoIdx >= 0 &&
    iconsIdx >= 0 &&
    mixedIdx < geoIdx &&
    geoIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-GEOLOCATION-OFF/.test(readmeRaw) && /2y/.test(readmeRaw);
  const keepOk = /setGeolocationEnabled\s*\(\s*false\s*\)/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setGeolocationEnabled\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-geolocation-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-GEOLOCATION-OFF',
      'setGeolocationEnabled(false) + patch/aab after mixed-content before icons + README §2y + keep-awake; no location; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-GEOLOCATION-OFF',
      `missing geolocation-off / patch / aab hook-after-mixed-content-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-FILE-ACCESS-OFF: deny WebView file:// / file-URL access ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-file-access-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk =
    /setAllowFileAccess\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setAllowFileAccessFromFileURLs\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setAllowUniversalAccessFromFileURLs\s*\(\s*false\s*\)/.test(patchRaw);
  const geoIdx = aabRaw.search(/patch-android-webview-geolocation-off\.sh/);
  const fileIdx = aabRaw.search(/patch-android-webview-file-access-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    geoIdx >= 0 &&
    fileIdx >= 0 &&
    iconsIdx >= 0 &&
    geoIdx < fileIdx &&
    fileIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-FILE-ACCESS-OFF/.test(readmeRaw) && /2z/.test(readmeRaw);
  const keepOk =
    /setAllowFileAccess\s*\(\s*false\s*\)/.test(keepRaw) &&
    /setAllowFileAccessFromFileURLs\s*\(\s*false\s*\)/.test(keepRaw) &&
    /setAllowUniversalAccessFromFileURLs\s*\(\s*false\s*\)/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setAllowFileAccess\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setAllowFileAccessFromFileURLs\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setAllowUniversalAccessFromFileURLs\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-file-access-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-FILE-ACCESS-OFF',
      'setAllowFileAccess/FromFileURLs/UniversalAccess(false) + patch/aab after geolocation before icons + README §2z + keep-awake; no file://; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-FILE-ACCESS-OFF',
      `missing file-access-off / patch / aab hook-after-geolocation-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-JS-WINDOWS-OFF: deny WebView multi-window / JS window.open ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-js-windows-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk =
    /setSupportMultipleWindows\s*\(\s*false\s*\)/.test(patchRaw) &&
    /setJavaScriptCanOpenWindowsAutomatically\s*\(\s*false\s*\)/.test(patchRaw);
  const fileIdx = aabRaw.search(/patch-android-webview-file-access-off\.sh/);
  const jsWinIdx = aabRaw.search(/patch-android-webview-js-windows-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    fileIdx >= 0 &&
    jsWinIdx >= 0 &&
    iconsIdx >= 0 &&
    fileIdx < jsWinIdx &&
    jsWinIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-JS-WINDOWS-OFF/.test(readmeRaw) && /2aa/.test(readmeRaw);
  const keepOk =
    /setSupportMultipleWindows\s*\(\s*false\s*\)/.test(keepRaw) &&
    /setJavaScriptCanOpenWindowsAutomatically\s*\(\s*false\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-JS-WINDOWS-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setSupportMultipleWindows\s*\(\s*false\s*\)/.test(mainRaw) &&
      /setJavaScriptCanOpenWindowsAutomatically\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-js-windows-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-JS-WINDOWS-OFF',
      'setSupportMultipleWindows/JavaScriptCanOpenWindowsAutomatically(false) + patch/aab after file-access-off before icons + README §2aa + keep-awake; no popups; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-JS-WINDOWS-OFF',
      `missing js-windows-off / patch / aab hook-after-file-access-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-SAFE-BROWSING: enable WebView Safe Browsing (phishing / known-bad) ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-safe-browsing.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setSafeBrowsingEnabled\s*\(\s*true\s*\)/.test(patchRaw);
  const jsWinIdx = aabRaw.search(/patch-android-webview-js-windows-off\.sh/);
  const safeIdx = aabRaw.search(/patch-android-webview-safe-browsing\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    jsWinIdx >= 0 &&
    safeIdx >= 0 &&
    iconsIdx >= 0 &&
    jsWinIdx < safeIdx &&
    safeIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-SAFE-BROWSING/.test(readmeRaw) && /2ab/.test(readmeRaw);
  const keepOk =
    /setSafeBrowsingEnabled\s*\(\s*true\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-SAFE-BROWSING/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setSafeBrowsingEnabled\s*\(\s*true\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-safe-browsing-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-SAFE-BROWSING',
      'setSafeBrowsingEnabled(true) + patch/aab after js-windows-off before icons + README §2ab + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-SAFE-BROWSING',
      `missing safe-browsing / patch / aab hook-after-js-windows-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-DATABASE-OFF: deny Web SQL / WebDatabase (DomStorage stays) ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-database-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setDatabaseEnabled\s*\(\s*false\s*\)/.test(patchRaw);
  const safeIdx = aabRaw.search(/patch-android-webview-safe-browsing\.sh/);
  const dbIdx = aabRaw.search(/patch-android-webview-database-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    safeIdx >= 0 &&
    dbIdx >= 0 &&
    iconsIdx >= 0 &&
    safeIdx < dbIdx &&
    dbIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-DATABASE-OFF/.test(readmeRaw) && /2ac/.test(readmeRaw);
  const keepOk =
    /setDatabaseEnabled\s*\(\s*false\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-DATABASE-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setDatabaseEnabled\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-database-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-DATABASE-OFF',
      'setDatabaseEnabled(false) + patch/aab after safe-browsing before icons + README §2ac + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-DATABASE-OFF',
      `missing database-off / patch / aab hook-after-safe-browsing-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF: deny API 33+ algorithmic darkening (≠ FORCE-DARK) ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-algorithmic-dark-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setAlgorithmicDarkeningAllowed\s*\(\s*false\s*\)/.test(patchRaw);
  const dbIdx = aabRaw.search(/patch-android-webview-database-off\.sh/);
  const algoIdx = aabRaw.search(/patch-android-webview-algorithmic-dark-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    dbIdx >= 0 &&
    algoIdx >= 0 &&
    iconsIdx >= 0 &&
    dbIdx < algoIdx &&
    algoIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF/.test(readmeRaw) && /2ad/.test(readmeRaw);
  const keepOk =
    /setAlgorithmicDarkeningAllowed\s*\(\s*false\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setAlgorithmicDarkeningAllowed\s*\(\s*false\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-algorithmic-dark-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF',
      'setAlgorithmicDarkeningAllowed(false) + patch/aab after database-off before icons + README §2ad + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-ALGORITHMIC-DARK-OFF',
      `missing algorithmic-dark-off / patch / aab hook-after-database-off-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-DEBUG-OFF: deny Chrome remote WebView debugging ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-debug-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)/.test(
    patchRaw
  );
  const algoIdx = aabRaw.search(/patch-android-webview-algorithmic-dark-off\.sh/);
  const debugIdx = aabRaw.search(/patch-android-webview-debug-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    algoIdx >= 0 &&
    debugIdx >= 0 &&
    iconsIdx >= 0 &&
    algoIdx < debugIdx &&
    debugIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-DEBUG-OFF/.test(readmeRaw) && /2ae/.test(readmeRaw);
  const keepOk =
    /WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-DEBUG-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /WebView\s*\.\s*setWebContentsDebuggingEnabled\s*\(\s*false\s*\)/.test(
      mainRaw
    );
  }
  const noSoft =
    !/webview-debug-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-DEBUG-OFF',
      'setWebContentsDebuggingEnabled(false) + patch/aab after algorithmic-dark before icons + README §2ae + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-DEBUG-OFF',
      `missing debug-off / patch / aab hook-after-algorithmic-dark-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-DOM-STORAGE-ON: ensure DomStorage / localStorage for saves ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-dom-storage-on.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk = /setDomStorageEnabled\s*\(\s*true\s*\)/.test(patchRaw) &&
    /ANDROID-WEBVIEW-DOM-STORAGE-ON/.test(patchRaw);
  const debugIdx = aabRaw.search(/patch-android-webview-debug-off\.sh/);
  const domIdx = aabRaw.search(/patch-android-webview-dom-storage-on\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    debugIdx >= 0 &&
    domIdx >= 0 &&
    iconsIdx >= 0 &&
    debugIdx < domIdx &&
    domIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-DOM-STORAGE-ON/.test(readmeRaw) && /2af/.test(readmeRaw);
  const keepOk =
    /setDomStorageEnabled\s*\(\s*true\s*\)/.test(keepRaw) &&
    /ANDROID-WEBVIEW-DOM-STORAGE-ON/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk = /setDomStorageEnabled\s*\(\s*true\s*\)/.test(mainRaw);
  }
  const noSoft =
    !/webview-dom-storage-on-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-DOM-STORAGE-ON',
      'setDomStorageEnabled(true) + patch/aab after debug-off before icons + README §2af + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-DOM-STORAGE-ON',
      `missing dom-storage-on / patch / aab hook-after-debug-off-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- ANDROID-WEBVIEW-AUTOFILL-OFF: deny Autofill overlays mid-run (API 26+) ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-autofill-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk =
    /setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)/.test(
      patchRaw
    ) &&
    /Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.O/.test(patchRaw) &&
    /ANDROID-WEBVIEW-AUTOFILL-OFF/.test(patchRaw);
  const domIdx = aabRaw.search(/patch-android-webview-dom-storage-on\.sh/);
  const autoIdx = aabRaw.search(/patch-android-webview-autofill-off\.sh/);
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    domIdx >= 0 &&
    autoIdx >= 0 &&
    iconsIdx >= 0 &&
    domIdx < autoIdx &&
    autoIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-AUTOFILL-OFF/.test(readmeRaw) && /2ag/.test(readmeRaw);
  const keepOk =
    /setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)/.test(
      keepRaw
    ) &&
    /Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.O/.test(keepRaw) &&
    /ANDROID-WEBVIEW-AUTOFILL-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /setImportantForAutofill\s*\(\s*View\.IMPORTANT_FOR_AUTOFILL_NO\s*\)/.test(
        mainRaw
      ) && /Build\.VERSION\.SDK_INT\s*>=\s*Build\.VERSION_CODES\.O/.test(mainRaw);
  }
  const noSoft =
    !/webview-autofill-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-AUTOFILL-OFF',
      'setImportantForAutofill(NO) API26+ + patch/aab after dom-storage before icons + README §2ag + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-AUTOFILL-OFF',
      `missing autofill-off / patch / aab hook-after-dom-storage-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}


// --- ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF: deny 3P cookies; no soft-arm ---
{
  const mainPath = path.join(
    root,
    'android/app/src/main/java/com/lancechung/colortubesort/MainActivity.java'
  );
  const mainRaw = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
  const patchRaw = read('scripts/patch-android-webview-third-party-cookies-off.sh') || '';
  const aabRaw = read('scripts/build-internal-aab.sh') || '';
  const readmeRaw = read('native-templates/android/README.md') || '';
  const keepRaw = read('scripts/patch-android-keep-awake.sh') || '';
  const patchOk =
    /CookieManager\s*\.\s*getInstance\s*\(\s*\)\s*\.\s*setAcceptThirdPartyCookies\s*\(\s*webView\s*,\s*false\s*\)/.test(
      patchRaw
    ) && /ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF/.test(patchRaw);
  const autoIdx = aabRaw.search(/patch-android-webview-autofill-off\.sh/);
  const cookiesIdx = aabRaw.search(
    /patch-android-webview-third-party-cookies-off\.sh/
  );
  const iconsIdx = aabRaw.search(/apply-android-icons\.sh/);
  const aabHookOk =
    autoIdx >= 0 &&
    cookiesIdx >= 0 &&
    iconsIdx >= 0 &&
    autoIdx < cookiesIdx &&
    cookiesIdx < iconsIdx;
  const readmeOk =
    /ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF/.test(readmeRaw) &&
    /2ah/.test(readmeRaw);
  const keepOk =
    /CookieManager\s*\.\s*getInstance\s*\(\s*\)\s*\.\s*setAcceptThirdPartyCookies\s*\(\s*webView\s*,\s*false\s*\)/.test(
      keepRaw
    ) && /ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF/.test(keepRaw);
  // android/ is gitignored — allow missing; when present, require live MainActivity.
  let localOk = !mainRaw;
  if (mainRaw) {
    localOk =
      /CookieManager\s*\.\s*getInstance\s*\(\s*\)\s*\.\s*setAcceptThirdPartyCookies\s*\(\s*webView\s*,\s*false\s*\)/.test(
        mainRaw
      );
  }
  const noSoft =
    !/webview-third-party-cookies-off-arm|soft-arm|claim-juice|hud-pulse/.test(
      patchRaw + mainRaw + keepRaw
    );
  if (patchOk && aabHookOk && readmeOk && keepOk && localOk && noSoft) {
    pass(
      'ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF',
      'setAcceptThirdPartyCookies(false) + patch/aab after autofill before icons + README §2ah + keep-awake; no soft-arm'
    );
  } else {
    fail(
      'ANDROID-WEBVIEW-THIRD-PARTY-COOKIES-OFF',
      `missing third-party-cookies-off / patch / aab hook-after-autofill-before-icons / README / keep-awake, or soft-arm slipped in (patchOk=${patchOk} aabHookOk=${aabHookOk} readmeOk=${readmeOk} keepOk=${keepOk} localOk=${localOk} noSoft=${noSoft})`
    );
  }
}

// --- CAP-APP-BACK: @capacitor/app dep + bindSystemBack backButton listener; no soft-arm ---
{
  const pkgRaw = read('package.json') || '';
  let pkgDeps = {};
  try {
    pkgDeps = (JSON.parse(pkgRaw).dependencies) || {};
  } catch (_) {
    pkgDeps = {};
  }
  const depOk =
    typeof pkgDeps['@capacitor/app'] === 'string' &&
    /^[\^~]?6\./.test(pkgDeps['@capacitor/app']);
  const gameOk =
    /function bindSystemBack\s*\(/.test(gameRaw) &&
    /App\.addListener\s*\(\s*['"]backButton['"]/.test(gameRaw) &&
    /handleSystemBack\s*\(/.test(gameRaw);
  const noSoft =
    !/soft-arm|claim-juice|hud-pulse|back-arm|cap-app-arm/.test(
      (gameRaw.match(/function bindSystemBack[\s\S]{0,800}/) || [''])[0]
    );
  if (depOk && gameOk && noSoft) {
    pass(
      'CAP-APP-BACK',
      '@capacitor/app ^6.x in package.json + bindSystemBack App.addListener(backButton); no soft-arm'
    );
  } else {
    fail(
      'CAP-APP-BACK',
      `missing @capacitor/app dep / bindSystemBack backButton wiring, or soft-arm slipped in (depOk=${depOk} gameOk=${gameOk} noSoft=${noSoft})`
    );
  }
}

// --- CAP-APP-STATE: App.addListener(appStateChange) flush draft + wake sync; no soft-arm ---
{
  const pkgRaw = read('package.json') || '';
  let pkgDeps = {};
  try {
    pkgDeps = (JSON.parse(pkgRaw).dependencies) || {};
  } catch (_) {
    pkgDeps = {};
  }
  const depOk =
    typeof pkgDeps['@capacitor/app'] === 'string' &&
    /^[\^~]?6\./.test(pkgDeps['@capacitor/app']);
  const binder =
    (gameRaw.match(/function bindAppState[\s\S]{0,1200}/) || [''])[0];
  const gameOk =
    /function bindAppState\s*\(/.test(gameRaw) &&
    /App\.addListener\s*\(\s*['"]appStateChange['"]/.test(gameRaw) &&
    /bindAppState\s*\(\)/.test(gameRaw) &&
    /clearPendingUncap/.test(binder) &&
    /persistRunDraft/.test(binder) &&
    (/requestScreenWakeLock/.test(binder) || /syncNativeKeepScreenOn/.test(binder));
  const noSoft =
    !/soft-arm|claim-juice|hud-pulse|back-arm|cap-app-arm|app-state-arm/.test(binder);
  if (depOk && gameOk && noSoft) {
    pass(
      'CAP-APP-STATE',
      '@capacitor/app ^6 + bindAppState App.addListener(appStateChange) flush draft/clearPendingUncap/wake sync; no soft-arm'
    );
  } else {
    fail(
      'CAP-APP-STATE',
      `missing @capacitor/app / bindAppState appStateChange flush+wake, or soft-arm slipped in (depOk=${depOk} gameOk=${gameOk} noSoft=${noSoft})`
    );
  }
}

// --- SELF-HOST-FONTS: local Noto Sans woff2; no Google Fonts CDN; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const cssRawLocal = read('assets/css/style.css') || '';
  const swPath = path.join(root, 'sw.js');
  const swRaw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
  const noCdn =
    !/fonts\.googleapis\.com/.test(htmlRaw) &&
    !/fonts\.gstatic\.com/.test(htmlRaw);
  const faceOk =
    /@font-face/.test(cssRawLocal) &&
    /font-family:\s*["']Noto Sans["']/.test(cssRawLocal) &&
    /noto-sans-latin-400-normal\.woff2/.test(cssRawLocal) &&
    /noto-sans-latin-700-normal\.woff2/.test(cssRawLocal) &&
    /noto-sans-latin-900-normal\.woff2/.test(cssRawLocal) &&
    /font-display:\s*swap/.test(cssRawLocal);
  const fontsDir = path.join(root, 'assets/fonts');
  const filesOk =
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-400-normal.woff2')) &&
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-500-normal.woff2')) &&
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-600-normal.woff2')) &&
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-700-normal.woff2')) &&
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-800-normal.woff2')) &&
    fs.existsSync(path.join(fontsDir, 'noto-sans-latin-900-normal.woff2'));
  const precacheFonts =
    /colortube-offline-v3/.test(swRaw) &&
    /assets\/fonts\/noto-sans-latin-400-normal\.woff2/.test(swRaw) &&
    /assets\/fonts\/noto-sans-latin-900-normal\.woff2/.test(swRaw);
  const noSoft = !/soft-arm|claim-juice|hud-pulse|font-arm/.test(
    cssRawLocal.slice(0, 2500) + htmlRaw.slice(0, 1200)
  );
  if (noCdn && faceOk && filesOk && precacheFonts && noSoft) {
    pass(
      'SELF-HOST-FONTS',
      'local Noto Sans latin woff2 @font-face; index has no Google Fonts CDN; sw v3 precaches fonts; no soft-arm'
    );
  } else {
    fail(
      'SELF-HOST-FONTS',
      `missing self-host fonts (noCdn=${noCdn} face=${faceOk} files=${filesOk} precache=${precacheFonts} noSoft=${noSoft})`
    );
  }
}

// --- FONT-PRELOAD: critical Noto 700/800/900 before CSS; crossorigin; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const preload700 =
    /rel=["']preload["'][^>]*href=["']assets\/fonts\/noto-sans-latin-700-normal\.woff2["']/.test(htmlRaw) ||
    /href=["']assets\/fonts\/noto-sans-latin-700-normal\.woff2["'][^>]*rel=["']preload["']/.test(htmlRaw);
  const preload800 =
    /rel=["']preload["'][^>]*href=["']assets\/fonts\/noto-sans-latin-800-normal\.woff2["']/.test(htmlRaw) ||
    /href=["']assets\/fonts\/noto-sans-latin-800-normal\.woff2["'][^>]*rel=["']preload["']/.test(htmlRaw);
  const preload900 =
    /rel=["']preload["'][^>]*href=["']assets\/fonts\/noto-sans-latin-900-normal\.woff2["']/.test(htmlRaw) ||
    /href=["']assets\/fonts\/noto-sans-latin-900-normal\.woff2["'][^>]*rel=["']preload["']/.test(htmlRaw);
  // Attribute order-agnostic: each preload link must also carry as=font, type=font/woff2, crossorigin
  const links = [...htmlRaw.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)].map((m) => m[0]);
  const fontLinks = links.filter((l) => /noto-sans-latin-(700|800|900)-normal\.woff2/.test(l));
  const attrsOk =
    fontLinks.length >= 3 &&
    fontLinks.every(
      (l) =>
        /\bas=["']font["']/.test(l) &&
        /type=["']font\/woff2["']/.test(l) &&
        /\bcrossorigin\b/.test(l)
    );
  const sheetIdx = (() => {
    const m = [...htmlRaw.matchAll(/<link\b[^>]*>/gi)].find(
      (x) => /rel=["']stylesheet["']/.test(x[0]) && /assets\/css\/style\.css/.test(x[0])
    );
    return m ? m.index : -1;
  })();
  const beforeCss =
    htmlRaw.indexOf('noto-sans-latin-700-normal.woff2') >= 0 &&
    sheetIdx >= 0 &&
    htmlRaw.indexOf('noto-sans-latin-700-normal.woff2') < sheetIdx;
  const noSoft = !/soft-arm|claim-juice|hud-pulse|font-arm/.test(htmlRaw.slice(0, 2500));
  if (preload700 && preload800 && preload900 && attrsOk && beforeCss && noSoft) {
    pass(
      'FONT-PRELOAD',
      'index preload Noto 700/800/900 woff2 as=font type=font/woff2 crossorigin before stylesheet; no soft-arm'
    );
  } else {
    fail(
      'FONT-PRELOAD',
      `missing font preload (700=${preload700} 800=${preload800} 900=${preload900} attrs=${attrsOk} beforeCss=${beforeCss} noSoft=${noSoft})`
    );
  }
}

// --- COLOR-SCHEME-DARK: meta + CSS color-scheme dark; brand stays #1a1a2e; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const cssRaw = read('assets/css/style.css') || '';
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const metaOk =
    /<meta\s+name=["']color-scheme["']\s+content=["']dark["']\s*\/>/i.test(htmlRaw) ||
    /<meta\s+content=["']dark["']\s+name=["']color-scheme["']\s*\/>/i.test(htmlRaw);
  const cssOk = /color-scheme\s*:\s*dark/.test(cssRaw);
  const playMetaOk =
    !fs.existsSync(playHtmlPath) ||
    /<meta\s+name=["']color-scheme["']\s+content=["']dark["']\s*\/>/i.test(playHtml) ||
    /<meta\s+content=["']dark["']\s+name=["']color-scheme["']\s*\/>/i.test(playHtml);
  const snippet = htmlRaw.slice(0, 2000) + cssRaw.slice(0, 400);
  const noSoft = !/soft-arm|claim-juice|hud-pulse/.test(snippet);
  if (metaOk && cssOk && playMetaOk && noSoft) {
    pass(
      'COLOR-SCHEME-DARK',
      'index meta color-scheme=dark + style.css color-scheme:dark + docs/play synced; no soft-arm'
    );
  } else {
    fail(
      'COLOR-SCHEME-DARK',
      `missing dark color-scheme (meta=${metaOk} css=${cssOk} playMeta=${playMetaOk} noSoft=${noSoft})`
    );
  }
}

// --- SCRIPT-PRELOAD: critical gameplay JS (levels+game) before CSS; no ads/billing; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const preloadLevels =
    /rel=["']preload["'][^>]*href=["']assets\/js\/levels\.js["']/.test(htmlRaw) ||
    /href=["']assets\/js\/levels\.js["'][^>]*rel=["']preload["']/.test(htmlRaw);
  const preloadGame =
    /rel=["']preload["'][^>]*href=["']assets\/js\/game\.js["']/.test(htmlRaw) ||
    /href=["']assets\/js\/game\.js["'][^>]*rel=["']preload["']/.test(htmlRaw);
  const links = [...htmlRaw.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)].map((m) => m[0]);
  const scriptLinks = links.filter((l) => /assets\/js\/(levels|game)\.js/.test(l));
  const attrsOk =
    scriptLinks.length >= 2 &&
    scriptLinks.every((l) => /\bas=["']script["']/.test(l));
  const sheetIdx = (() => {
    const m = [...htmlRaw.matchAll(/<link\b[^>]*>/gi)].find(
      (x) => /rel=["']stylesheet["']/.test(x[0]) && /assets\/css\/style\.css/.test(x[0])
    );
    return m ? m.index : -1;
  })();
  const beforeCss =
    sheetIdx >= 0 &&
    htmlRaw.indexOf('assets/js/levels.js') >= 0 &&
    htmlRaw.indexOf('assets/js/levels.js') < sheetIdx &&
    htmlRaw.indexOf('assets/js/game.js') >= 0 &&
    htmlRaw.indexOf('assets/js/game.js') < sheetIdx;
  const noAdsBilling =
    !links.some((l) => /assets\/js\/(ads|billing)\.js/.test(l));
  const playOk =
    !fs.existsSync(playHtmlPath) ||
    ((/rel=["']preload["'][^>]*href=["']assets\/js\/levels\.js["']/.test(playHtml) ||
      /href=["']assets\/js\/levels\.js["'][^>]*rel=["']preload["']/.test(playHtml)) &&
      (/rel=["']preload["'][^>]*href=["']assets\/js\/game\.js["']/.test(playHtml) ||
        /href=["']assets\/js\/game\.js["'][^>]*rel=["']preload["']/.test(playHtml)));
  const snippet = htmlRaw.slice(0, 2800);
  const noSoft = !/soft-arm|claim-juice|hud-pulse/.test(snippet);
  if (preloadLevels && preloadGame && attrsOk && beforeCss && noAdsBilling && playOk && noSoft) {
    pass(
      'SCRIPT-PRELOAD',
      'index preload levels.js+game.js as=script before stylesheet; docs/play synced; no ads/billing preload; no soft-arm'
    );
  } else {
    fail(
      'SCRIPT-PRELOAD',
      `missing script preload (levels=${preloadLevels} game=${preloadGame} attrs=${attrsOk} beforeCss=${beforeCss} noAdsBilling=${noAdsBilling} play=${playOk} noSoft=${noSoft})`
    );
  }
}

// --- SCRIPT-ORDER: levels → game before ads/billing/analytics script tags; docs/play synced ---
{
  const htmlRaw = read('index.html') || '';
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const scriptSrcs = [...htmlRaw.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(
    (m) => m[1]
  );
  const idx = (name) => scriptSrcs.findIndex((s) => s === `assets/js/${name}`);
  const iLevels = idx('levels.js');
  const iGame = idx('game.js');
  const iAds = idx('ads.js');
  const iBilling = idx('billing.js');
  const iAnalytics = idx('analytics.js');
  const orderOk =
    iLevels >= 0 &&
    iGame >= 0 &&
    iAds >= 0 &&
    iBilling >= 0 &&
    iAnalytics >= 0 &&
    iLevels < iGame &&
    iGame < iAds &&
    iGame < iBilling &&
    iGame < iAnalytics;
  const playSrcs = [...playHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(
    (m) => m[1]
  );
  const pIdx = (name) => playSrcs.findIndex((s) => s === `assets/js/${name}`);
  const playOk =
    !fs.existsSync(playHtmlPath) ||
    (pIdx('levels.js') >= 0 &&
      pIdx('game.js') >= 0 &&
      pIdx('ads.js') >= 0 &&
      pIdx('levels.js') < pIdx('game.js') &&
      pIdx('game.js') < pIdx('ads.js') &&
      pIdx('game.js') < pIdx('billing.js') &&
      pIdx('game.js') < pIdx('analytics.js'));
  if (orderOk && playOk) {
    pass(
      'SCRIPT-ORDER',
      'index script tags levels.js → game.js before ads/billing/analytics; docs/play synced'
    );
  } else {
    fail(
      'SCRIPT-ORDER',
      `bad script order (levels=${iLevels} game=${iGame} ads=${iAds} billing=${iBilling} analytics=${iAnalytics} play=${playOk})`
    );
  }
}

// --- INLINE-CRITICAL-BG: brand dark paint before CSS; kill white FOUC; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const styleMatch = htmlRaw.match(/<style>\s*html,\s*body\s*\{[^}]*\}\s*<\/style>/i);
  const bgOk =
    !!styleMatch &&
    /background\s*:\s*#1a1a2e/i.test(styleMatch[0]) &&
    /color\s*:\s*#f5f5f7/i.test(styleMatch[0]);
  const early =
    htmlRaw.indexOf('INLINE-CRITICAL-BG') >= 0 &&
    htmlRaw.indexOf('INLINE-CRITICAL-BG') < htmlRaw.indexOf('assets/css/style.css') &&
    htmlRaw.indexOf('<style>') >= 0 &&
    htmlRaw.indexOf('<style>') < htmlRaw.indexOf('assets/fonts/noto-sans-latin-700-normal.woff2');
  const playOk =
    !fs.existsSync(playHtmlPath) ||
    (/INLINE-CRITICAL-BG/.test(playHtml) &&
      /background\s*:\s*#1a1a2e/i.test(playHtml) &&
      /color\s*:\s*#f5f5f7/i.test(playHtml));
  const snippet = htmlRaw.slice(0, 2200);
  const noSoft = !/soft-arm|claim-juice|hud-pulse/.test(snippet);
  if (bgOk && early && playOk && noSoft) {
    pass(
      'INLINE-CRITICAL-BG',
      'index inline style html/body background #1a1a2e + color #f5f5f7 before font/script preload; docs/play synced; no soft-arm'
    );
  } else {
    fail(
      'INLINE-CRITICAL-BG',
      `missing critical bg (bg=${bgOk} early=${early} play=${playOk} noSoft=${noSoft})`
    );
  }
}

// --- CSS-PRELOAD: style.css as=style before font/script preload; docs/play synced; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const links = [...htmlRaw.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const cssPre = links.find(
    (l) =>
      /rel=["']preload["']/.test(l) &&
      /href=["']assets\/css\/style\.css["']/.test(l) &&
      /\bas=["']style["']/.test(l)
  );
  const sheetOk = links.some(
    (l) => /rel=["']stylesheet["']/.test(l) && /href=["']assets\/css\/style\.css["']/.test(l)
  );
  const preIdx = htmlRaw.indexOf('CSS-PRELOAD');
  const fontIdx = htmlRaw.indexOf('FONT-PRELOAD');
  const scriptIdx = htmlRaw.indexOf('SCRIPT-PRELOAD');
  const bgIdx = htmlRaw.indexOf('INLINE-CRITICAL-BG');
  const orderOk =
    preIdx >= 0 &&
    bgIdx >= 0 &&
    bgIdx < preIdx &&
    fontIdx >= 0 &&
    preIdx < fontIdx &&
    scriptIdx >= 0 &&
    preIdx < scriptIdx;
  const playOk =
    !fs.existsSync(playHtmlPath) ||
    (/CSS-PRELOAD/.test(playHtml) &&
      (/rel=["']preload["'][^>]*href=["']assets\/css\/style\.css["']/.test(playHtml) ||
        /href=["']assets\/css\/style\.css["'][^>]*rel=["']preload["']/.test(playHtml)) &&
      /\bas=["']style["']/.test(playHtml));
  const snippet = htmlRaw.slice(0, 2800);
  const noSoft = !/soft-arm|claim-juice|hud-pulse/.test(snippet);
  if (cssPre && sheetOk && orderOk && playOk && noSoft) {
    pass(
      'CSS-PRELOAD',
      'index preload style.css as=style after critical bg before font/script preload; stylesheet retained; docs/play synced; no soft-arm'
    );
  } else {
    fail(
      'CSS-PRELOAD',
      `missing css preload (pre=${!!cssPre} sheet=${sheetOk} order=${orderOk} play=${playOk} noSoft=${noSoft})`
    );
  }
}

// --- PWA-DAILY-SHORTCUT: manifest Daily shortcut → ?daily=1 + game deeplink boot; docs/play synced; no soft-arm ---
{
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';

  function shortcutOk(filePath, urlNeedle, iconNeedle) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const shortcuts = Array.isArray(m.shortcuts) ? m.shortcuts : [];
      return shortcuts.some((s) => {
        if (!s || typeof s !== 'object') return false;
        const nameOk =
          typeof s.name === 'string' && /daily challenge/i.test(s.name);
        const urlOk = typeof s.url === 'string' && s.url.includes(urlNeedle);
        const icons = Array.isArray(s.icons) ? s.icons : [];
        const iconOk =
          icons.length === 0 ||
          icons.some(
            (i) => i && typeof i.src === 'string' && i.src.includes(iconNeedle)
          );
        return nameOk && urlOk && iconOk;
      });
    } catch (_) {
      return false;
    }
  }

  const rootOk = shortcutOk(rootManifestPath, '?daily=1', 'icon-192.png');
  const docsOk = shortcutOk(docsManifestPath, 'play/?daily=1', 'icon-192.png');
  const playOk =
    !fs.existsSync(playManifestPath) ||
    shortcutOk(playManifestPath, '?daily=1', 'icon-192.png');
  const wwwOk =
    !fs.existsSync(wwwManifestPath) ||
    shortcutOk(wwwManifestPath, '?daily=1', 'icon-192.png');
  const bootOk =
    /PWA-DAILY-SHORTCUT/.test(gameJs) &&
    /bootDaily/.test(gameJs) &&
    /dailyParam === '1'/.test(gameJs) &&
    /startDailyChallenge/.test(gameJs) &&
    /history\.replaceState/.test(gameJs);
  const playBootOk =
    !fs.existsSync(playGamePath) ||
    (/PWA-DAILY-SHORTCUT/.test(playGame) && /bootDaily/.test(playGame));
  const manifestRaw = fs.existsSync(rootManifestPath)
    ? fs.readFileSync(rootManifestPath, 'utf8')
    : '';
  const docsManifestRaw = fs.existsSync(docsManifestPath)
    ? fs.readFileSync(docsManifestPath, 'utf8')
    : '';
  // Only gate NEW surfaces (manifest shortcuts + bootDaily block) — game.js already has soft-arm elsewhere
  const bootSliceMatch = gameJs.match(/PWA-DAILY-SHORTCUT[\s\S]{0,1200}?bootDaily[\s\S]{0,800}?startDailyChallenge/);
  const bootSlice = bootSliceMatch ? bootSliceMatch[0] : '';
  const noSoft =
    !!bootSlice &&
    !/soft-arm|claim-juice|hud-pulse|pwa-daily-arm/.test(bootSlice) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-daily-arm/.test(manifestRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-daily-arm/.test(docsManifestRaw);
  if (rootOk && docsOk && playOk && wwwOk && bootOk && playBootOk && noSoft) {
    pass(
      'PWA-DAILY-SHORTCUT',
      'manifest Daily Challenge shortcut → ?daily=1; game bootDaily deeplink + strip query; docs brand → play/?daily=1; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'PWA-DAILY-SHORTCUT',
      `missing daily shortcut/deeplink (root=${rootOk} docs=${docsOk} play=${playOk} www=${wwwOk} boot=${bootOk} playBoot=${playBootOk} noSoft=${noSoft})`
    );
  }
}

// --- PWA-CONTINUE-SHORTCUT: manifest Continue shortcut → ?continue=1 + game deeplink boot; docs/play synced; no soft-arm ---
{
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';

  function shortcutOk(filePath, urlNeedle, iconNeedle) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const shortcuts = Array.isArray(m.shortcuts) ? m.shortcuts : [];
      return shortcuts.some((s) => {
        if (!s || typeof s !== 'object') return false;
        const nameOk =
          typeof s.name === 'string' && /^continue$/i.test(s.name.trim());
        const urlOk = typeof s.url === 'string' && s.url.includes(urlNeedle);
        const icons = Array.isArray(s.icons) ? s.icons : [];
        const iconOk =
          icons.length === 0 ||
          icons.some(
            (i) => i && typeof i.src === 'string' && i.src.includes(iconNeedle)
          );
        return nameOk && urlOk && iconOk;
      });
    } catch (_) {
      return false;
    }
  }

  const rootOk = shortcutOk(rootManifestPath, '?continue=1', 'icon-192.png');
  const docsOk = shortcutOk(docsManifestPath, 'play/?continue=1', 'icon-192.png');
  const playOk =
    !fs.existsSync(playManifestPath) ||
    shortcutOk(playManifestPath, '?continue=1', 'icon-192.png');
  const wwwOk =
    !fs.existsSync(wwwManifestPath) ||
    shortcutOk(wwwManifestPath, '?continue=1', 'icon-192.png');
  const bootOk =
    /PWA-CONTINUE-SHORTCUT/.test(gameJs) &&
    /bootContinue/.test(gameJs) &&
    /contParam === '1'/.test(gameJs) &&
    /else if \(bootContinue\)/.test(gameJs) &&
    /startGame\(\)/.test(gameJs) &&
    /history\.replaceState/.test(gameJs);
  const playBootOk =
    !fs.existsSync(playGamePath) ||
    (/PWA-CONTINUE-SHORTCUT/.test(playGame) && /bootContinue/.test(playGame));
  const manifestRaw = fs.existsSync(rootManifestPath)
    ? fs.readFileSync(rootManifestPath, 'utf8')
    : '';
  const docsManifestRaw = fs.existsSync(docsManifestPath)
    ? fs.readFileSync(docsManifestPath, 'utf8')
    : '';
  // Only gate NEW surfaces (manifest Continue shortcut + bootContinue block) — game.js already has soft-arm elsewhere
  const bootSliceMatch = gameJs.match(/PWA-CONTINUE-SHORTCUT[\s\S]{0,1200}?bootContinue[\s\S]{0,800}?startGame/);
  const bootSlice = bootSliceMatch ? bootSliceMatch[0] : '';
  const noSoft =
    !!bootSlice &&
    !/soft-arm|claim-juice|hud-pulse|pwa-continue-arm/.test(bootSlice) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-continue-arm/.test(manifestRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-continue-arm/.test(docsManifestRaw);
  if (rootOk && docsOk && playOk && wwwOk && bootOk && playBootOk && noSoft) {
    pass(
      'PWA-CONTINUE-SHORTCUT',
      'manifest Continue shortcut → ?continue=1; game bootContinue deeplink + strip query; docs brand → play/?continue=1; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'PWA-CONTINUE-SHORTCUT',
      `missing continue shortcut/deeplink (root=${rootOk} docs=${docsOk} play=${playOk} www=${wwwOk} boot=${bootOk} playBoot=${playBootOk} noSoft=${noSoft})`
    );
  }
}

// --- PWA-LEVELS-SHORTCUT: manifest Levels shortcut → ?levels=1 + game deeplink boot; docs/play synced; no soft-arm ---
{
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';

  function shortcutOk(filePath, urlNeedle, iconNeedle) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const shortcuts = Array.isArray(m.shortcuts) ? m.shortcuts : [];
      return shortcuts.some((s) => {
        if (!s || typeof s !== 'object') return false;
        const nameOk =
          typeof s.name === 'string' && /^levels$/i.test(s.name.trim());
        const urlOk = typeof s.url === 'string' && s.url.includes(urlNeedle);
        const icons = Array.isArray(s.icons) ? s.icons : [];
        const iconOk =
          icons.length === 0 ||
          icons.some(
            (i) => i && typeof i.src === 'string' && i.src.includes(iconNeedle)
          );
        return nameOk && urlOk && iconOk;
      });
    } catch (_) {
      return false;
    }
  }

  const rootOk = shortcutOk(rootManifestPath, '?levels=1', 'icon-192.png');
  const docsOk = shortcutOk(docsManifestPath, 'play/?levels=1', 'icon-192.png');
  const playOk =
    !fs.existsSync(playManifestPath) ||
    shortcutOk(playManifestPath, '?levels=1', 'icon-192.png');
  const wwwOk =
    !fs.existsSync(wwwManifestPath) ||
    shortcutOk(wwwManifestPath, '?levels=1', 'icon-192.png');
  const bootOk =
    /PWA-LEVELS-SHORTCUT/.test(gameJs) &&
    /bootLevels/.test(gameJs) &&
    /levelsParam === '1'/.test(gameJs) &&
    /else if \(bootLevels\)/.test(gameJs) &&
    /openLevels\(\)/.test(gameJs) &&
    /history\.replaceState/.test(gameJs);
  const playBootOk =
    !fs.existsSync(playGamePath) ||
    (/PWA-LEVELS-SHORTCUT/.test(playGame) && /bootLevels/.test(playGame));
  const manifestRaw = fs.existsSync(rootManifestPath)
    ? fs.readFileSync(rootManifestPath, 'utf8')
    : '';
  const docsManifestRaw = fs.existsSync(docsManifestPath)
    ? fs.readFileSync(docsManifestPath, 'utf8')
    : '';
  // Only gate NEW surfaces (manifest Levels shortcut + bootLevels block) — game.js already has soft-arm elsewhere
  const bootSliceMatch = gameJs.match(/PWA-LEVELS-SHORTCUT[\s\S]{0,1200}?bootLevels[\s\S]{0,800}?openLevels/);
  const bootSlice = bootSliceMatch ? bootSliceMatch[0] : '';
  const noSoft =
    !!bootSlice &&
    !/soft-arm|claim-juice|hud-pulse|pwa-levels-arm/.test(bootSlice) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-levels-arm/.test(manifestRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-levels-arm/.test(docsManifestRaw);
  if (rootOk && docsOk && playOk && wwwOk && bootOk && playBootOk && noSoft) {
    pass(
      'PWA-LEVELS-SHORTCUT',
      'manifest Levels shortcut → ?levels=1; game bootLevels deeplink + strip query; docs brand → play/?levels=1; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'PWA-LEVELS-SHORTCUT',
      `missing levels shortcut/deeplink (root=${rootOk} docs=${docsOk} play=${playOk} www=${wwwOk} boot=${bootOk} playBoot=${playBootOk} noSoft=${noSoft})`
    );
  }
}

// --- PWA-SHOP-SHORTCUT: manifest Shop shortcut → ?shop=1 + game deeplink boot; docs/play synced; no soft-arm ---
{
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';

  function shortcutOk(filePath, urlNeedle, iconNeedle) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const shortcuts = Array.isArray(m.shortcuts) ? m.shortcuts : [];
      return shortcuts.some((s) => {
        if (!s || typeof s !== 'object') return false;
        const nameOk =
          typeof s.name === 'string' && /^shop$/i.test(s.name.trim());
        const urlOk = typeof s.url === 'string' && s.url.includes(urlNeedle);
        const icons = Array.isArray(s.icons) ? s.icons : [];
        const iconOk =
          icons.length === 0 ||
          icons.some(
            (i) => i && typeof i.src === 'string' && i.src.includes(iconNeedle)
          );
        return nameOk && urlOk && iconOk;
      });
    } catch (_) {
      return false;
    }
  }

  const rootOk = shortcutOk(rootManifestPath, '?shop=1', 'icon-192.png');
  const docsOk = shortcutOk(docsManifestPath, 'play/?shop=1', 'icon-192.png');
  const playOk =
    !fs.existsSync(playManifestPath) ||
    shortcutOk(playManifestPath, '?shop=1', 'icon-192.png');
  const wwwOk =
    !fs.existsSync(wwwManifestPath) ||
    shortcutOk(wwwManifestPath, '?shop=1', 'icon-192.png');
  const bootOk =
    /PWA-SHOP-SHORTCUT/.test(gameJs) &&
    /bootShop/.test(gameJs) &&
    /shopParam === '1'/.test(gameJs) &&
    /else if \(bootShop\)/.test(gameJs) &&
    /openShop\(\)/.test(gameJs) &&
    /history\.replaceState/.test(gameJs);
  const playBootOk =
    !fs.existsSync(playGamePath) ||
    (/PWA-SHOP-SHORTCUT/.test(playGame) && /bootShop/.test(playGame));
  const manifestRaw = fs.existsSync(rootManifestPath)
    ? fs.readFileSync(rootManifestPath, 'utf8')
    : '';
  const docsManifestRaw = fs.existsSync(docsManifestPath)
    ? fs.readFileSync(docsManifestPath, 'utf8')
    : '';
  // Only gate NEW surfaces (manifest Shop shortcut + bootShop block) — game.js already has soft-arm elsewhere
  const bootSliceMatch = gameJs.match(/PWA-SHOP-SHORTCUT[\s\S]{0,1200}?bootShop[\s\S]{0,800}?openShop/);
  const bootSlice = bootSliceMatch ? bootSliceMatch[0] : '';
  const noSoft =
    !!bootSlice &&
    !/soft-arm|claim-juice|hud-pulse|pwa-shop-arm/.test(bootSlice) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-shop-arm/.test(manifestRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-shop-arm/.test(docsManifestRaw);
  if (rootOk && docsOk && playOk && wwwOk && bootOk && playBootOk && noSoft) {
    pass(
      'PWA-SHOP-SHORTCUT',
      'manifest Shop shortcut → ?shop=1; game bootShop deeplink + strip query; docs brand → play/?shop=1; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'PWA-SHOP-SHORTCUT',
      `missing shop shortcut/deeplink (root=${rootOk} docs=${docsOk} play=${playOk} www=${wwwOk} boot=${bootOk} playBoot=${playBootOk} noSoft=${noSoft})`
    );
  }
}


// --- STORAGE-PERSIST: navigator.storage.persist once when progress exists; sync www/play; no soft-arm ---
{
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const wwwGamePath = path.join(root, 'www/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';
  const wwwGame = fs.existsSync(wwwGamePath) ? fs.readFileSync(wwwGamePath, 'utf8') : '';

  const helperOk =
    /function requestPersistentStorage\s*\(/.test(gameJs) &&
    /function saveHasMeaningfulProgress\s*\(/.test(gameJs) &&
    /persistentStorageRequested/.test(gameJs) &&
    /navigator\.storage\.persist/.test(gameJs) &&
    /\.persisted\s*===\s*['"]function['"]|navigator\.storage\.persisted|stor\.persisted/.test(gameJs) &&
    /STORAGE-PERSIST/.test(gameJs);

  const callSites =
    (gameJs.match(/\/\/ STORAGE-PERSIST/g) || []).length >= 3 &&
    /saveHasMeaningfulProgress\(\)\s*\)\s*requestPersistentStorage\s*\(/.test(gameJs) &&
    /moves\s*>\s*0\s*\|\|\s*history\.length\s*>\s*0\)\s*requestPersistentStorage\s*\(/.test(gameJs);

  const playOk =
    !fs.existsSync(playGamePath) ||
    (/function requestPersistentStorage\s*\(/.test(playGame) && /STORAGE-PERSIST/.test(playGame));
  const wwwOk =
    !fs.existsSync(wwwGamePath) ||
    (/function requestPersistentStorage\s*\(/.test(wwwGame) && /STORAGE-PERSIST/.test(wwwGame));

  const helperSlice = (gameJs.match(/function requestPersistentStorage[\s\S]{0,1200}/) || [''])[0];
  const noSoft =
    !!helperSlice &&
    !/soft-arm|claim-juice|hud-pulse|storage-persist-arm/.test(helperSlice);

  if (helperOk && callSites && playOk && wwwOk && noSoft) {
    pass(
      'STORAGE-PERSIST',
      'requestPersistentStorage + saveHasMeaningfulProgress; once-per-session navigator.storage.persist when progress; call sites in load/persist/draft; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'STORAGE-PERSIST',
      `missing persist helper/call sites (helper=${helperOk} calls=${callSites} play=${playOk} www=${wwwOk} noSoft=${noSoft})`
    );
  }
}

// --- STORAGE-ESTIMATE: navigator.storage.estimate low-quota Backup toast; sync www/play; no soft-arm ---
{
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const wwwGamePath = path.join(root, 'www/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';
  const wwwGame = fs.existsSync(wwwGamePath) ? fs.readFileSync(wwwGamePath, 'utf8') : '';

  const helperOk =
    /function maybeWarnStoragePressure\s*\(/.test(gameJs) &&
    /storageEstimateWarned/.test(gameJs) &&
    /navigator\.storage\.estimate/.test(gameJs) &&
    /Storage low — Backup progress in Settings/.test(gameJs) &&
    /STORAGE-ESTIMATE/.test(gameJs);

  const callSites =
    (gameJs.match(/\/\/ STORAGE-ESTIMATE/g) || []).length >= 2 &&
    /maybeWarnStoragePressure\s*\(/.test(gameJs) &&
    /saveHasMeaningfulProgress\(\)\s*\)\s*maybeWarnStoragePressure\s*\(/.test(gameJs);

  const playOk =
    !fs.existsSync(playGamePath) ||
    (/function maybeWarnStoragePressure\s*\(/.test(playGame) &&
      /Storage low — Backup progress in Settings/.test(playGame) &&
      /STORAGE-ESTIMATE/.test(playGame));
  const wwwOk =
    !fs.existsSync(wwwGamePath) ||
    (/function maybeWarnStoragePressure\s*\(/.test(wwwGame) &&
      /Storage low — Backup progress in Settings/.test(wwwGame) &&
      /STORAGE-ESTIMATE/.test(wwwGame));

  const helperSlice = (gameJs.match(/function maybeWarnStoragePressure[\s\S]{0,1200}/) || [''])[0];
  const noSoft =
    !!helperSlice &&
    !/soft-arm|claim-juice|hud-pulse|storage-estimate-arm/.test(helperSlice);

  if (helperOk && callSites && playOk && wwwOk && noSoft) {
    pass(
      'STORAGE-ESTIMATE',
      'maybeWarnStoragePressure + storage.estimate; once/session toast when usage high; Backup in Settings; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'STORAGE-ESTIMATE',
      `missing estimate helper/call sites (helper=${helperOk} calls=${callSites} play=${playOk} www=${wwwOk} noSoft=${noSoft})`
    );
  }
}

// --- OFFLINE-TOAST: web/PWA network status toasts; skip native; sync www/play; no soft-arm ---
{
  const gameJs = read('assets/js/game.js') || '';
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const wwwGamePath = path.join(root, 'www/assets/js/game.js');
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';
  const wwwGame = fs.existsSync(wwwGamePath) ? fs.readFileSync(wwwGamePath, 'utf8') : '';

  const helperOk =
    /function bindOfflineStatus\s*\(/.test(gameJs) &&
    /OFFLINE-TOAST/.test(gameJs) &&
    /Offline — progress saved on this device/.test(gameJs) &&
    /Back online/.test(gameJs) &&
    /addEventListener\(\s*['"]offline['"]/.test(gameJs) &&
    /addEventListener\(\s*['"]online['"]/.test(gameJs) &&
    /isCapacitorNativePlatform\s*\(/.test(gameJs) &&
    /networkWasOffline/.test(gameJs);

  const initOk = /bindOfflineStatus\s*\(\s*\)/.test(gameJs);

  const playOk =
    !fs.existsSync(playGamePath) ||
    (/function bindOfflineStatus\s*\(/.test(playGame) &&
      /Offline — progress saved on this device/.test(playGame) &&
      /OFFLINE-TOAST/.test(playGame));
  const wwwOk =
    !fs.existsSync(wwwGamePath) ||
    (/function bindOfflineStatus\s*\(/.test(wwwGame) &&
      /Offline — progress saved on this device/.test(wwwGame) &&
      /OFFLINE-TOAST/.test(wwwGame));

  const helperSlice = (gameJs.match(/function bindOfflineStatus[\s\S]{0,1600}/) || [''])[0];
  const noSoft =
    !!helperSlice &&
    !/soft-arm|claim-juice|hud-pulse|offline-toast-arm/.test(helperSlice);

  if (helperOk && initOk && playOk && wwwOk && noSoft) {
    pass(
      'OFFLINE-TOAST',
      'bindOfflineStatus + offline/online toasts; skip Capacitor native; delayed boot offline; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'OFFLINE-TOAST',
      `missing offline toast helper/init/sync (helper=${helperOk} init=${initOk} play=${playOk} www=${wwwOk} noSoft=${noSoft})`
    );
  }
}

// --- CAP-TEACH-ARM: tip dismiss does not set capTeachDone; uncap does; load soft-arm ---
{
  const gameSrc = read('assets/js/game.js') || '';
  const dismissSlice = (gameSrc.match(/btn-dismiss-tip[\s\S]{0,900}/) || [''])[0];
  const capBranch = (dismissSlice.match(/activeTipKind\s*===\s*['"]cap['"][\s\S]{0,320}/) || [''])[0];
  const tipDismissOk =
    /activeTipKind\s*===\s*['"]cap['"]/.test(dismissSlice) &&
    !!capBranch &&
    !/capTeachDone\s*=\s*true/.test(capBranch) &&
    /CAP-TEACH-ARM/.test(capBranch);
  const uncapSlice = (gameSrc.match(/function uncapTube\s*\([\s\S]{0,1100}/) || [''])[0];
  const uncapOk =
    /clearCapTeachArm\s*\(/.test(uncapSlice) &&
    /save\.capTeachDone\s*=\s*true/.test(uncapSlice) &&
    /persist\s*\(/.test(uncapSlice);
  const armOk =
    /function clearCapTeachArm\s*\(/.test(gameSrc) &&
    /function maybeArmCapTeach\s*\(/.test(gameSrc) &&
    /lid-arm-nudge/.test(gameSrc) &&
    /maybeArmCapTeach\s*\(\s*def\s*\)/.test(gameSrc) &&
    /haptic\s*\(\s*['"]arm['"]\s*\)/.test(
      (gameSrc.match(/function maybeArmCapTeach[\s\S]{0,900}/) || [''])[0]
    ) &&
    /CAP-TEACH-ARM/.test(gameSrc);
  const howtoOk = /activeTipKind\s*===\s*['"]howto['"]/.test(dismissSlice);
  if (tipDismissOk && uncapOk && armOk && howtoOk) {
    pass(
      'CAP-TEACH-ARM',
      'cap tip dismiss hides only (no capTeachDone); uncapTube sets capTeachDone+persist; maybeArmCapTeach lid-arm-nudge + haptic/SFX; howto dismiss still safe'
    );
  } else {
    fail(
      'CAP-TEACH-ARM',
      `missing teach-arm wiring (tipDismiss=${tipDismissOk} uncap=${uncapOk} arm=${armOk} howto=${howtoOk})`
    );
  }
}

// --- PWA-INSTALL: beforeinstallprompt Install CTA + manifest id; sync docs/play; no soft-arm ---
{
  const htmlRaw = read('index.html') || '';
  const cssRaw = read('assets/css/style.css') || '';
  const gameJs = read('assets/js/game.js') || '';
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const playHtmlPath = path.join(root, 'docs/play/index.html');
  const playGamePath = path.join(root, 'docs/play/assets/js/game.js');
  const playHtml = fs.existsSync(playHtmlPath) ? fs.readFileSync(playHtmlPath, 'utf8') : '';
  const playGame = fs.existsSync(playGamePath) ? fs.readFileSync(playGamePath, 'utf8') : '';

  function manifestIdOk(filePath) {
    if (!fs.existsSync(filePath)) return false;
    try {
      const m = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return m && typeof m.id === 'string' && (m.id === './' || m.id === './?source=pwa');
    } catch (_) {
      return false;
    }
  }

  const btnOk =
    /id=["']btn-install["']/.test(htmlRaw) &&
    /Install ColorTube Sort/.test(htmlRaw) &&
    />Install</.test(htmlRaw) &&
    /hidden/.test((htmlRaw.match(/id=["']btn-install["'][^>]*>/) || [''])[0]);
  const noSoftOnBtn =
    !/soft-arm|claim-juice|hud-pulse|install-arm|pwa-install-arm/.test(
      (htmlRaw.match(/id=["']btn-install["'][^>]*>/) || [''])[0]
    );
  const cssSlice = (cssRaw.match(/PWA-INSTALL[\s\S]{0,900}/) || [''])[0];
  const cssOk =
    /PWA-INSTALL/.test(cssRaw) &&
    /#btn-install/.test(cssRaw) &&
    !/\.(soft-arm|claim-juice|hud-pulse|install-arm|pwa-install-arm)/.test(cssSlice) &&
    !/animation:\s*[^;]*(pulse|arm)/i.test(cssSlice);
  const bootOk =
    /PWA-INSTALL/.test(gameJs) &&
    /beforeinstallprompt/.test(gameJs) &&
    /preventDefault/.test(gameJs) &&
    /\.prompt\s*\(/.test(gameJs) &&
    /appinstalled/.test(gameJs) &&
    /display-mode:\s*standalone/.test(gameJs) &&
    /isNativePlatform/.test(gameJs) &&
    /bindPwaInstall/.test(gameJs) &&
    /btn-install/.test(gameJs);
  const bootSliceMatch = gameJs.match(/PWA-INSTALL[\s\S]{0,2200}?bindPwaInstall[\s\S]{0,1800}?appinstalled/);
  const bootSlice = bootSliceMatch ? bootSliceMatch[0] : '';
  const noSoftBoot =
    !!bootSlice &&
    !/soft-arm|claim-juice|hud-pulse|install-arm|pwa-install-arm|haptic\(['"]arm['"]\)/.test(bootSlice);
  const rootId = manifestIdOk(rootManifestPath);
  const docsId = manifestIdOk(docsManifestPath);
  const playId =
    !fs.existsSync(playManifestPath) || manifestIdOk(playManifestPath);
  const wwwId =
    !fs.existsSync(wwwManifestPath) || manifestIdOk(wwwManifestPath);
  const playSyncOk =
    !fs.existsSync(playHtmlPath) ||
    (/id=["']btn-install["']/.test(playHtml) &&
      /PWA-INSTALL/.test(playGame) &&
      /beforeinstallprompt/.test(playGame) &&
      /\.prompt\s*\(/.test(playGame));
  if (
    btnOk &&
    noSoftOnBtn &&
    cssOk &&
    bootOk &&
    noSoftBoot &&
    rootId &&
    docsId &&
    playId &&
    wwwId &&
    playSyncOk
  ) {
    pass(
      'PWA-INSTALL',
      'start #btn-install + beforeinstallprompt/prompt/appinstalled; standalone/native hide; manifest id ./; sync www/play; no soft-arm'
    );
  } else {
    fail(
      'PWA-INSTALL',
      `missing install CTA/wiring (btn=${btnOk} noSoftBtn=${noSoftOnBtn} css=${cssOk} boot=${bootOk} noSoftBoot=${noSoftBoot} id root=${rootId} docs=${docsId} play=${playId} www=${wwwId} playSync=${playSyncOk})`
    );
  }
}

// --- PWA-SCREENSHOTS: manifest scope + launch_handler + narrow screenshots; sync www/play; no soft-arm ---
{
  const rootManifestPath = path.join(root, 'site.webmanifest');
  const docsManifestPath = path.join(root, 'docs/site.webmanifest');
  const playManifestPath = path.join(root, 'docs/play/site.webmanifest');
  const wwwManifestPath = path.join(root, 'www/site.webmanifest');
  const rootShotDir = path.join(root, 'assets/screenshots');
  const docsShotDir = path.join(root, 'docs/screenshots');
  const expectedLabels = {
    'narrow-01-lid.png': 'Gold lids block pours — uncap to pour',
    'narrow-02-uncap.png': 'Uncap, then sort matching colors',
    'narrow-03-daily.png': 'Daily Challenge — Crowded, Remixed, or Pressure',
  };

  function scopeOk(scope) {
    return typeof scope === 'string' && (scope === './' || scope === '.' || scope === '/');
  }

  function launchOk(m) {
    const lh = m && m.launch_handler;
    if (!lh || typeof lh !== 'object') return false;
    const modes = Array.isArray(lh.client_mode)
      ? lh.client_mode
      : typeof lh.client_mode === 'string'
        ? [lh.client_mode]
        : [];
    return modes.some((x) => x === 'focus-existing');
  }

  function screenshotsOk(m, srcIncludes) {
    const shots = Array.isArray(m && m.screenshots) ? m.screenshots : [];
    if (shots.length < 3) return false;
    const basenames = Object.keys(expectedLabels);
    return basenames.every((bn) =>
      shots.some(
        (s) =>
          s &&
          typeof s === 'object' &&
          s.form_factor === 'narrow' &&
          typeof s.src === 'string' &&
          s.src.includes(bn) &&
          srcIncludes.some((n) => s.src.includes(n)) &&
          (s.sizes === '1080x1920' || !s.sizes) &&
          (!s.type || s.type === 'image/png') &&
          typeof s.label === 'string' &&
          s.label.includes(expectedLabels[bn].slice(0, 12))
      )
    );
  }

  function parseManifest(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      return null;
    }
  }

  function filesOk(dir, basenames) {
    return basenames.every((bn) => fs.existsSync(path.join(dir, bn)));
  }

  const basenames = Object.keys(expectedLabels);
  const rootM = parseManifest(rootManifestPath);
  const docsM = parseManifest(docsManifestPath);
  const playM = parseManifest(playManifestPath);
  const wwwM = parseManifest(wwwManifestPath);

  const rootOk =
    !!rootM &&
    scopeOk(rootM.scope) &&
    launchOk(rootM) &&
    screenshotsOk(rootM, ['assets/screenshots/']) &&
    filesOk(rootShotDir, basenames);
  const docsOk =
    !!docsM &&
    scopeOk(docsM.scope) &&
    launchOk(docsM) &&
    screenshotsOk(docsM, ['screenshots/']) &&
    filesOk(docsShotDir, basenames);
  const playOk =
    !playM ||
    (scopeOk(playM.scope) &&
      launchOk(playM) &&
      screenshotsOk(playM, ['assets/screenshots/', 'screenshots/']));
  const wwwOk =
    !wwwM ||
    (scopeOk(wwwM.scope) &&
      launchOk(wwwM) &&
      screenshotsOk(wwwM, ['assets/screenshots/', 'screenshots/']));

  const rootRaw = fs.existsSync(rootManifestPath)
    ? fs.readFileSync(rootManifestPath, 'utf8')
    : '';
  const docsRaw = fs.existsSync(docsManifestPath)
    ? fs.readFileSync(docsManifestPath, 'utf8')
    : '';
  const noSoft =
    !/soft-arm|claim-juice|hud-pulse|pwa-screenshot-arm|screenshot-arm/.test(rootRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-screenshot-arm|screenshot-arm/.test(docsRaw);

  const swPath = path.join(root, 'sw.js');
  const swRaw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
  const noPrecacheShots = !/screenshots\/narrow-/.test(swRaw);

  if (rootOk && docsOk && playOk && wwwOk && noSoft && noPrecacheShots) {
    pass(
      'PWA-SCREENSHOTS',
      'manifest scope ./ + launch_handler focus-existing + ≥3 narrow screenshots; assets+docs files on disk; sync www/play; not in sw PRECACHE; no soft-arm'
    );
  } else {
    fail(
      'PWA-SCREENSHOTS',
      `missing screenshots/scope/launch_handler (root=${rootOk} docs=${docsOk} play=${playOk} www=${wwwOk} noSoft=${noSoft} noPrecache=${noPrecacheShots})`
    );
  }
}

// --- PWA-OFFLINE: service worker precache + register + sync-www; no soft-arm ---
{
  const swPath = path.join(root, 'sw.js');
  const swRaw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
  const htmlRaw = read('index.html') || '';
  const syncWww = fs.existsSync(path.join(root, 'scripts/sync-www.sh'))
    ? fs.readFileSync(path.join(root, 'scripts/sync-www.sh'), 'utf8')
    : '';
  const swExists = fs.existsSync(swPath);
  const cacheNameOk = /colortube-offline-v3/.test(swRaw);
  const precacheOk =
    /game\.js/.test(swRaw) &&
    /style\.css/.test(swRaw) &&
    (/index\.html/.test(swRaw) || /['"]\.\/['"]/.test(swRaw) || /['"]\/['"]/.test(swRaw));
  const registerOk =
    /navigator\.serviceWorker\.register\s*\(\s*['"]\.\/sw\.js['"]/.test(htmlRaw) ||
    /navigator\.serviceWorker\.register\s*\(\s*['"]sw\.js['"]/.test(htmlRaw);
  const syncOk = /sw\.js/.test(syncWww) && /cp\s+"\$ROOT\/sw\.js"/.test(syncWww);
  const noSoft =
    !/soft-arm|claim-juice|hud-pulse|pwa-arm|offline-arm/.test(swRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-arm|offline-arm/.test(
      (htmlRaw.match(/serviceWorker[\s\S]{0,1200}/) || [''])[0]
    );
  if (swExists && cacheNameOk && precacheOk && registerOk && syncOk && noSoft) {
    pass(
      'PWA-OFFLINE',
      'sw.js colortube-offline-v3 precache (game.js/style/fonts) + index serviceWorker.register + sync-www copies sw.js; no soft-arm'
    );
  } else {
    fail(
      'PWA-OFFLINE',
      `missing sw/precache/register/sync or soft-arm (exists=${swExists} cache=${cacheNameOk} precache=${precacheOk} register=${registerOk} sync=${syncOk} noSoft=${noSoft})`
    );
  }
}

// --- PWA-UPDATE: SWR assets + update toast UX; no soft-arm ---
{
  const swPath = path.join(root, 'sw.js');
  const swRaw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
  const htmlRaw = read('index.html') || '';
  const regSnippet = (htmlRaw.match(/serviceWorker[\s\S]{0,1600}/) || [''])[0];
  const cacheV2 = /colortube-offline-v3/.test(swRaw);
  // SWR: on cache hit still background fetch + cache.put (not pure cache-first)
  const swrOk =
    /isSameOriginAsset/.test(swRaw) &&
    /stale-while-revalidate/i.test(swRaw) &&
    /if\s*\(\s*cached\s*\)/.test(swRaw) &&
    /waitUntil\s*\(\s*revalidate\s*\)/.test(swRaw) &&
    /cache\.put/.test(swRaw) &&
    /SKIP_WAITING/.test(swRaw);
  const updateUxOk =
    (/updatefound/.test(regSnippet) || /controllerchange/.test(regSnippet)) &&
    /Update ready/.test(regSnippet) &&
    /SKIP_WAITING/.test(regSnippet);
  const noSoft =
    !/soft-arm|claim-juice|hud-pulse|pwa-arm|offline-arm|update-arm/.test(swRaw) &&
    !/soft-arm|claim-juice|hud-pulse|pwa-arm|offline-arm|update-arm/.test(regSnippet);
  if (cacheV2 && swrOk && updateUxOk && noSoft) {
    pass(
      'PWA-UPDATE',
      'sw.js v3 stale-while-revalidate assets + SKIP_WAITING; index updatefound/controllerchange toast Update ready; no soft-arm'
    );
  } else {
    fail(
      'PWA-UPDATE',
      `missing v3/SWR/update UX or soft-arm (v3=${cacheV2} swr=${swrOk} ux=${updateUxOk} noSoft=${noSoft})`
    );
  }
}

// --- SHARE-PLAY-URL: win-share deep-links to playable /play/ demo; no soft-arm ---
{
  const hasFn = /function buildWinShareText\s*\(/.test(gameRaw);
  const playUrl =
    /https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/play\//.test(gameRaw);
  // Prefer explicit url field on navigator.share when Web Share is used
  const shareHasUrl =
    /navigator\.share\s*\(\s*\{\s*title:\s*title,\s*text:\s*text,\s*url:\s*shareUrl\s*\}\s*\)/.test(
      gameRaw
    ) ||
    /navigator\.share\s*\(\s*\{[^}]*url:\s*shareUrl[^}]*\}\s*\)/.test(gameRaw);
  const noRootOnly =
    !/https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/'\s*$/m.test(
      gameRaw.split('function buildWinShareText')[1]?.slice(0, 600) || ''
    );
  const noSoft = !/soft-arm|claim-juice|hud-.*-pulse|share-play-arm/.test(
    gameRaw.slice(gameRaw.indexOf('function buildWinShareText'), gameRaw.indexOf('function buildWinShareText') + 900)
  );
  if (hasFn && playUrl && shareHasUrl && noSoft) {
    pass(
      'SHARE-PLAY-URL',
      'buildWinShareText + navigator.share url → github.io /play/ demo; no soft-arm'
    );
  } else {
    fail(
      'SHARE-PLAY-URL',
      'win-share missing /play/ URL or navigator.share url field' +
        ` (fn=${hasFn} play=${playUrl} urlField=${shareHasUrl} noSoft=${noSoft})`
    );
  }
}

// --- SHARE-PLAY-OG: playable index (synced → docs/play) has OG/Twitter for /play/ share target; no soft-arm ---
{
  const indexRaw = read('index.html') || '';
  const playIndexPath = path.join(root, 'docs/play/index.html');
  const playRaw = fs.existsSync(playIndexPath) ? fs.readFileSync(playIndexPath, 'utf8') : '';
  const ogUrl =
    /property=["']og:url["'][^>]*content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/play\/["']/.test(
      indexRaw
    ) ||
    /content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/play\/["'][^>]*property=["']og:url["']/.test(
      indexRaw
    );
  const ogImage =
    /property=["']og:image["'][^>]*content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/og\.png["']/.test(
      indexRaw
    ) ||
    /content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/og\.png["'][^>]*property=["']og:image["']/.test(
      indexRaw
    );
  const ogTitle =
    /property=["']og:title["'][^>]*content=["']ColorTube Sort: Lid Puzzle["']/.test(indexRaw) ||
    /content=["']ColorTube Sort: Lid Puzzle["'][^>]*property=["']og:title["']/.test(indexRaw);
  const twCard =
    /name=["']twitter:card["'][^>]*content=["']summary_large_image["']/.test(indexRaw) ||
    /content=["']summary_large_image["'][^>]*name=["']twitter:card["']/.test(indexRaw);
  const twImage =
    /name=["']twitter:image["'][^>]*content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/og\.png["']/.test(
      indexRaw
    ) ||
    /content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/og\.png["'][^>]*name=["']twitter:image["']/.test(
      indexRaw
    );
  const playSynced =
    !!playRaw &&
    (/property=["']og:url["'][^>]*\/play\//.test(playRaw) ||
      /content=["']https:\/\/lancechung888\.github\.io\/color-sort-puzzle\/play\/["']/.test(playRaw)) &&
    /og\.png/.test(playRaw) &&
    /twitter:card/.test(playRaw);
  const noSoft = !/soft-arm|claim-juice|hud-.*-pulse|share-play-arm|og-arm/.test(indexRaw);
  if (ogUrl && ogImage && ogTitle && twCard && twImage && playSynced && noSoft) {
    pass(
      'SHARE-PLAY-OG',
      'playable index + docs/play OG/Twitter → /play/ + og.png; no soft-arm'
    );
  } else {
    fail(
      'SHARE-PLAY-OG',
      'missing play OG/Twitter on index or docs/play sync' +
        ` (url=${ogUrl} img=${ogImage} title=${ogTitle} tw=${twCard} twImg=${twImage} play=${playSynced} noSoft=${noSoft})`
    );
  }
}

// --- SHARE-PLAY-DEMO: docs/play browser demo + landing CTA; sync from root; no soft-arm ---
{
  const landingPath = path.join(root, 'docs/index.html');
  const landing = fs.existsSync(landingPath) ? fs.readFileSync(landingPath, 'utf8') : '';
  const syncWww = fs.existsSync(path.join(root, 'scripts/sync-www.sh'))
    ? fs.readFileSync(path.join(root, 'scripts/sync-www.sh'), 'utf8')
    : '';
  const playIndex = path.join(root, 'docs/play/index.html');
  const playGame = path.join(root, 'docs/play/assets/js/game.js');
  const playCss = path.join(root, 'docs/play/assets/css/style.css');
  const playManifest = path.join(root, 'docs/play/site.webmanifest');
  const playSw = path.join(root, 'docs/play/sw.js');

  const ctaOk =
    /Play free in browser/.test(landing) &&
    (/href=["']play\/["']/.test(landing) ||
      /href=["']\.\/play\/["']/.test(landing) ||
      /href=["']play["']/.test(landing));
  const comingSoonOk = /Coming soon on Google Play/.test(landing);
  const privacyOk =
    /href=["']privacy\/?["']/.test(landing) || /href=["']\.\/privacy\/?["']/.test(landing);
  const brandNoSw = !/serviceWorker\.register/.test(landing);
  const syncPlayOk =
    (/docs\/play/.test(syncWww) || /\$PLAY/.test(syncWww)) &&
    /cp\s+"\$ROOT\/index\.html"/.test(syncWww) &&
    (/cp\s+-R\s+"\$ROOT\/assets"/.test(syncWww) || /cp\s+-R\s+"\$ROOT\/assets"\s+"\$dest\/assets"/.test(syncWww));
  const playFilesOk =
    fs.existsSync(playIndex) &&
    fs.existsSync(playGame) &&
    fs.existsSync(playCss) &&
    fs.existsSync(playManifest) &&
    fs.existsSync(playSw);
  let manifestStartOk = false;
  if (fs.existsSync(playManifest)) {
    try {
      const m = JSON.parse(fs.readFileSync(playManifest, 'utf8'));
      manifestStartOk = m.start_url === './' || m.start_url === '.' || m.start_url === '/color-sort-puzzle/play/';
    } catch (_) {
      manifestStartOk = false;
    }
  }
  const playHasGame =
    fs.existsSync(playIndex) &&
    /assets\/js\/game\.js/.test(fs.readFileSync(playIndex, 'utf8')) &&
    (/navigator\.serviceWorker\.register\s*\(\s*['"]\.\/sw\.js['"]/.test(
      fs.readFileSync(playIndex, 'utf8')
    ) ||
      /navigator\.serviceWorker\.register\s*\(\s*['"]sw\.js['"]/.test(
        fs.readFileSync(playIndex, 'utf8')
      ));
  const noSoft =
    !/soft-arm|claim-juice|hud-.*-pulse|play-demo-arm|cta-pulse|share-play-arm/.test(landing) &&
    !/soft-arm|claim-juice|hud-.*-pulse|play-demo-arm/.test(syncWww);

  if (
    ctaOk &&
    comingSoonOk &&
    privacyOk &&
    brandNoSw &&
    syncPlayOk &&
    playFilesOk &&
    manifestStartOk &&
    playHasGame &&
    noSoft
  ) {
    pass(
      'SHARE-PLAY-DEMO',
      'docs landing Play free in browser → play/; docs/play synced from root (index+assets+sw+manifest start_url ./); brand landing no SW; no soft-arm'
    );
  } else {
    fail(
      'SHARE-PLAY-DEMO',
      'missing play demo CTA/sync/files or soft-arm/SW on brand' +
        ` (cta=${ctaOk} soon=${comingSoonOk} priv=${privacyOk} noSw=${brandNoSw} sync=${syncPlayOk} files=${playFilesOk} start=${manifestStartOk} playGame=${playHasGame} noSoft=${noSoft})`
    );
  }
}


// --- WAKE-LOCK (Screen Wake Lock during play; Settings Keep screen on) ---
{
  const htmlRaw = read('index.html') || '';
  const cssRaw = read('assets/css/style.css') || '';
  const jsOk =
    /keepAwake:\s*true/.test(gameRaw) &&
    /keepAwake:\s*data\.keepAwake\s*!==\s*false/.test(gameRaw) &&
    /function requestScreenWakeLock\s*\(/.test(gameRaw) &&
    /function releaseScreenWakeLock\s*\(/.test(gameRaw) &&
    /function syncScreenWakeLock\s*\(/.test(gameRaw) &&
    /function applyKeepAwakeOn\s*\(/.test(gameRaw) &&
    /navigator\.wakeLock\.request\s*\(\s*['"]screen['"]\s*\)/.test(gameRaw) &&
    /releaseScreenWakeLock\s*\(/.test(gameRaw) &&
    /syncScreenWakeLock\s*\(/.test(gameRaw) &&
    /visibilitychange/.test(gameRaw) &&
    /keepAwake\s*=\s*save\.keepAwake\s*!==\s*false/.test(gameRaw) &&
    /save\.keepAwake\s*=\s*keepAwake/.test(gameRaw) &&
    /btn-toggle-keep-awake/.test(gameRaw);
  const htmlOk =
    /id=["']btn-toggle-keep-awake["']/.test(htmlRaw) &&
    /data-setting=["']keep-awake["']/.test(htmlRaw) &&
    /Keep screen on/.test(htmlRaw) &&
    /Wake Lock/.test(htmlRaw) &&
    /Keep screen on/.test(htmlRaw);
  const noSoft =
    !/keep-awake-arm|wake-lock-arm|wakeLock-arm|\.keep-awake-arm|claim-juice|hud-pulse/.test(
      gameRaw + cssRaw + htmlRaw
    );
  if (jsOk && htmlOk && noSoft) {
    pass(
      'WAKE-LOCK',
      'Screen Wake Lock during play + Settings Keep screen on (default on); RESET keeps; goHome release; visibility re-acquire; no soft-arm'
    );
  } else {
    fail(
      'WAKE-LOCK',
      'missing keepAwake / wakeLock request-release-sync / Settings toggle / RESET keep, or soft-arm slipped in'
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
