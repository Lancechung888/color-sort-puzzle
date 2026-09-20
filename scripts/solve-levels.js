'use strict';
/**
 * ColorTube Sort — pour-path solvability (Node).
 * Matches assets/js/game.js: top = tube[length-1], contiguous pour, free uncap.
 * Uncap is free and never helps retention → search with all lids off.
 */

function cloneTubes(tubes) {
  return tubes.map((t) => t.slice());
}

function keyOf(tubes) {
  return tubes.map((t) => t.join(',')).join('|');
}

function topColor(tube) {
  return tube.length ? tube[tube.length - 1] : null;
}

function topRun(tube) {
  if (!tube.length) return { color: null, count: 0 };
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++;
  return { color, count };
}

function isTubeComplete(tube, capacity) {
  if (!tube.length) return true;
  if (tube.length !== capacity) return false;
  const c = tube[0];
  return tube.every((x) => x === c);
}

function isWon(tubes, capacity) {
  return tubes.every((t) => isTubeComplete(t, capacity));
}

function isFilledComplete(tube, capacity) {
  return tube.length === capacity && tube.every((x) => x === tube[0]);
}

function canPour(tubes, fromIdx, toIdx, capacity) {
  if (fromIdx === toIdx) return false;
  const from = tubes[fromIdx];
  const to = tubes[toIdx];
  if (!from.length) return false;
  const space = capacity - to.length;
  if (space <= 0) return false;
  if (!to.length) return true;
  return topColor(from) === topColor(to);
}

function pourAmount(tubes, fromIdx, toIdx, capacity) {
  return Math.min(topRun(tubes[fromIdx]).count, capacity - tubes[toIdx].length);
}

function applyPour(tubes, fromIdx, toIdx, amount) {
  const next = cloneTubes(tubes);
  for (let i = 0; i < amount; i++) next[toIdx].push(next[fromIdx].pop());
  return next;
}

/** Relocating an entire tube into an empty is isomorphic — skip. */
function isUselessEmptyPour(tubes, fromIdx, toIdx, amount) {
  return tubes[toIdx].length === 0 && amount === tubes[fromIdx].length;
}

/** Segments + incomplete tubes — guides best-first toward sorted boards. */
function heuristic(tubes, capacity) {
  let score = 0;
  for (const t of tubes) {
    if (isTubeComplete(t, capacity)) continue;
    if (!t.length) continue;
    score += 1;
    for (let i = 1; i < t.length; i++) {
      if (t[i] !== t[i - 1]) score += 1;
    }
  }
  return score;
}

/**
 * Best-first search for any pour path to win (free uncap).
 * @param {object} lv level def { capacity, tubes, caps? }
 * @param {number} nodeBudget max expanded nodes
 * @returns {{ ok: boolean, reason?: string, nodes: number, depth?: number }}
 */
function solveLevel(lv, nodeBudget) {
  const capacity = lv.capacity || 4;
  const start = cloneTubes(lv.tubes || []);
  // Free uncap: lids never required for win / never help → ignore caps.
  if (isWon(start, capacity)) {
    return { ok: true, nodes: 0, depth: 0 };
  }

  const visited = new Set([keyOf(start)]);
  let open = [{ tubes: start, depth: 0, hv: heuristic(start, capacity) }];
  let nodes = 0;

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i];
      const b = open[bi];
      if (a.hv < b.hv || (a.hv === b.hv && a.depth < b.depth)) bi = i;
    }
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    nodes += 1;
    if (nodes > nodeBudget) {
      return { ok: false, reason: 'budget', nodes, depth: cur.depth };
    }

    const tubes = cur.tubes;
    const n = tubes.length;
    const moves = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!canPour(tubes, i, j, capacity)) continue;
        const amount = pourAmount(tubes, i, j, capacity);
        if (amount <= 0) continue;
        if (isUselessEmptyPour(tubes, i, j, amount)) continue;
        moves.push({
          i,
          j,
          amount,
          fromComplete: isFilledComplete(tubes[i], capacity) ? 1 : 0,
          toEmpty: tubes[j].length === 0 ? 1 : 0,
        });
      }
    }
    moves.sort((a, b) => a.fromComplete - b.fromComplete || a.toEmpty - b.toEmpty);

    for (const m of moves) {
      const next = applyPour(tubes, m.i, m.j, m.amount);
      const k = keyOf(next);
      if (visited.has(k)) continue;
      if (isWon(next, capacity)) {
        return { ok: true, nodes, depth: cur.depth + 1 };
      }
      visited.add(k);
      open.push({ tubes: next, depth: cur.depth + 1, hv: heuristic(next, capacity) });
    }

    if (open.length > 250000) {
      open.sort((a, b) => a.hv - b.hv || a.depth - b.depth);
      open = open.slice(0, 120000);
    }
  }

  return { ok: false, reason: 'unsolvable', nodes };
}

/** Default per-level expand budget for accept (heuristic search). */
const DEFAULT_NODE_BUDGET = 500000;

/**
 * @param {object[]} levels COLOR_SORT_LEVELS
 * @param {{ nodeBudget?: number }} [opts]
 */
function solveAllLevels(levels, opts) {
  const nodeBudget = (opts && opts.nodeBudget) || DEFAULT_NODE_BUDGET;
  const fails = [];
  let maxNodes = 0;
  let maxLevel = 0;
  for (let i = 0; i < levels.length; i++) {
    const r = solveLevel(levels[i], nodeBudget);
    if (r.nodes > maxNodes) {
      maxNodes = r.nodes;
      maxLevel = i + 1;
    }
    if (!r.ok) {
      fails.push({
        level: i + 1,
        reason: r.reason,
        nodes: r.nodes,
        depth: r.depth,
      });
    }
  }
  return {
    ok: fails.length === 0,
    fails,
    maxNodes,
    maxLevel,
    nodeBudget,
    count: levels.length,
  };
}

module.exports = {
  solveLevel,
  solveAllLevels,
  DEFAULT_NODE_BUDGET,
};
