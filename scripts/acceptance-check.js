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

  // P0① shop honesty
  if (/Coming soon \/ needs store account/.test(gameRaw) && /colorTubeSort_devIap/.test(gameRaw)) {
    pass('P0-1', 'shop remove-ads path: Coming soon + DEV-only colorTubeSort_devIap');
  } else {
    fail('P0-1', 'missing Coming soon toast and/or colorTubeSort_devIap gate');
  }
  if (/ACCEPTANCE P0①: normal shop click must NOT grant removeAds/.test(gameRaw)) {
    pass('P0-1-DOC', 'P0① comment present on shop click path');
  } else {
    info('P0-1-DOC', 'P0① comment string not found (logic still checked above)');
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
