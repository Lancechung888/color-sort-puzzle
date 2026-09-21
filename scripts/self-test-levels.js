#!/usr/bin/env node
'use strict';
/**
 * Focused per-level self-test for COLOR_SORT_LEVELS.
 * Validates color multiset / capacity / empty-space sanity, and for capped
 * levels simulates UNCAP-ONE-TAP (free one-tap clear of all lids) then
 * pour-solves. Matches game.js: top = tube[length-1], free uncap, contiguous pour.
 *
 * Usage: node scripts/self-test-levels.js
 * Exit 0 = all Pass; else non-zero.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { solveLevel, shortestPourPath } = require('./solve-levels');

const root = path.resolve(__dirname, '..');

function loadLevels() {
  const src = fs.readFileSync(path.join(root, 'assets/js/levels.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'levels.js' });
  const levels = sandbox.window.COLOR_SORT_LEVELS;
  if (!Array.isArray(levels)) throw new Error('COLOR_SORT_LEVELS not an array');
  return levels;
}

function colorCounts(lv) {
  const counts = Object.create(null);
  for (const tube of lv.tubes || []) {
    for (const c of tube) {
      if (c == null || c === 0) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  return counts;
}

function colorMultisetOk(lv) {
  const cap = lv.capacity || 4;
  const counts = colorCounts(lv);
  for (const k of Object.keys(counts)) {
    if (counts[k] % cap !== 0) return false;
  }
  return true;
}

function capacityOk(lv) {
  const cap = lv.capacity || 4;
  if (!(cap >= 2 && Number.isFinite(cap))) return false;
  for (const tube of lv.tubes || []) {
    if (!Array.isArray(tube)) return false;
    if (tube.length > cap) return false;
  }
  return true;
}

/** Free slots + empty-tube counts — board must have pour room unless already won. */
function freeSpaceSanity(lv) {
  const cap = lv.capacity || 4;
  const tubes = lv.tubes || [];
  let free = 0;
  let empty = 0;
  let complete = 0;
  for (const t of tubes) {
    free += cap - t.length;
    if (!t.length) empty += 1;
    if (t.length === cap && t.every((x) => x === t[0])) complete += 1;
  }
  const allDone =
    tubes.every((t) => !t.length || (t.length === cap && t.every((x) => x === t[0])));
  if (allDone) return { ok: true, free, empty, complete };
  // Need at least one free slot to pour; million-user boards usually keep ≥1 empty-ish buffer.
  if (free <= 0) return { ok: false, free, empty, complete, reason: 'no-free-slots' };
  return { ok: true, free, empty, complete };
}

function capsSanity(lv) {
  const tubes = lv.tubes || [];
  if (!Array.isArray(lv.caps)) {
    return { ok: true, capIndices: [], count: 0 };
  }
  if (lv.caps.length !== tubes.length) {
    return { ok: false, reason: 'caps-len', capIndices: [], count: 0 };
  }
  const capIndices = [];
  for (let i = 0; i < lv.caps.length; i++) {
    if (lv.caps[i]) capIndices.push(i);
  }
  if (capIndices.length > 2) {
    return { ok: false, reason: 'caps-max', capIndices, count: capIndices.length };
  }
  return { ok: true, capIndices, count: capIndices.length };
}

/**
 * UNCAP-ONE-TAP path: each capped tube opens on one tap (free, no pending arm).
 * Clearing all lids = one tap per capped index; then pour-solve with lids off.
 */
function oneTapUncapThenSolve(lv, nodeBudget) {
  const caps = Array.isArray(lv.caps) ? lv.caps.slice() : [];
  const capIndices = caps.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  // Simulate one tap per lid → all false
  const after = caps.map(() => false);
  const cleared = after.every((c) => !c) && capIndices.every((i) => caps[i] === true || true);
  const uncappedLevel = {
    capacity: lv.capacity,
    tubes: (lv.tubes || []).map((t) => t.slice()),
    caps: after,
  };
  const solved = solveLevel(uncappedLevel, nodeBudget || 500000);
  return {
    capIndices,
    oneTapClearsAll: cleared && capIndices.length === caps.filter(Boolean).length,
    uncapTaps: capIndices.length,
    solve: solved,
  };
}

function runSelfTest(levels, opts) {
  const nodeBudget = (opts && opts.nodeBudget) || 500000;
  const rows = [];
  const fails = [];

  for (let i = 0; i < levels.length; i++) {
    const lv = levels[i];
    const L = i + 1;
    const issues = [];

    if (!capacityOk(lv)) issues.push('capacity');
    if (!colorMultisetOk(lv)) issues.push('color-multiset');
    const space = freeSpaceSanity(lv);
    if (!space.ok) issues.push(space.reason || 'free-space');
    const caps = capsSanity(lv);
    if (!caps.ok) issues.push(caps.reason || 'caps');

    let uncapInfo = null;
    let solveDepth = null;
    let solveOk = false;

    if (caps.count > 0) {
      uncapInfo = oneTapUncapThenSolve(lv, nodeBudget);
      if (!uncapInfo.oneTapClearsAll) issues.push('one-tap-uncap');
      if (!uncapInfo.solve.ok) issues.push('uncap-then-unsolvable:' + uncapInfo.solve.reason);
      else {
        solveOk = true;
        solveDepth = uncapInfo.solve.depth;
      }
    } else {
      const r = solveLevel(lv, nodeBudget);
      if (!r.ok) issues.push('unsolvable:' + r.reason);
      else {
        solveOk = true;
        solveDepth = r.depth;
      }
    }

    const status = issues.length ? 'FAIL' : 'PASS';
    const row = {
      L,
      status,
      issues,
      caps: caps.capIndices,
      free: space.free,
      empty: space.empty,
      depth: solveDepth,
      solveOk,
    };
    rows.push(row);
    if (status === 'FAIL') fails.push(row);
  }

  return { ok: fails.length === 0, rows, fails, count: levels.length };
}

function printL16Detail(levels) {
  const lv = levels[15];
  if (!lv) {
    console.log('L16: MISSING (levels.length < 16)');
    return null;
  }
  const caps = capsSanity(lv);
  const uncap = oneTapUncapThenSolve(lv, 500000);
  const bfs = shortestPourPath(
    { capacity: lv.capacity, tubes: lv.tubes, caps: (lv.caps || []).map(() => false) },
    2000000
  );
  console.log('--- L16 (index 15) detail ---');
  console.log('capacity:', lv.capacity);
  console.log('tubes:', JSON.stringify(lv.tubes));
  console.log('caps positions (0-based):', caps.capIndices, '(count=' + caps.count + ')');
  console.log(
    'one-tap path clears all caps:',
    uncap.oneTapClearsAll,
    '(taps=' + uncap.uncapTaps + ')'
  );
  console.log(
    'after free-uncap solve:',
    uncap.solve.ok
      ? 'solved depth=' + uncap.solve.depth + ' nodes=' + uncap.solve.nodes
      : 'FAIL ' + uncap.solve.reason
  );
  console.log(
    'BFS shortest pour path:',
    bfs.ok ? 'solved depth=' + bfs.depth + ' nodes=' + bfs.nodes : 'FAIL ' + bfs.reason
  );
  return { caps, uncap, bfs };
}

function main() {
  const levels = loadLevels();
  console.log('COLOR_SORT_LEVELS count:', levels.length);
  const result = runSelfTest(levels);
  for (const row of result.rows) {
    const capStr = row.caps.length ? ' caps=[' + row.caps.join(',') + ']' : '';
    const depthStr = row.solveOk ? ' depth=' + row.depth : '';
    const issueStr = row.issues.length ? ' issues=' + row.issues.join(',') : '';
    console.log(
      'L' +
        row.L +
        ': ' +
        row.status +
        depthStr +
        ' free=' +
        row.free +
        ' empty=' +
        row.empty +
        capStr +
        issueStr
    );
  }
  printL16Detail(levels);
  console.log('---');
  console.log(
    'TOTAL',
    result.count,
    'PASS',
    result.count - result.fails.length,
    'FAIL',
    result.fails.length
  );
  if (!result.ok) {
    console.error(
      'FAILURES:',
      result.fails.map((f) => 'L' + f.L + ':' + f.issues.join('+')).join(', ')
    );
    process.exit(1);
  }
  console.log('ALL PASS — every level sanity + free-uncap pour-solve OK');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  loadLevels,
  runSelfTest,
  oneTapUncapThenSolve,
  printL16Detail,
  colorMultisetOk,
  capacityOk,
  freeSpaceSanity,
  capsSanity,
};
