/**
 * ColorTube Sort — Level data
 * Tubes: color ids bottom → top. Capacity default 4.
 * Generated levels: reverse-scramble from solved with 2 empty tubes
 * (each color appears exactly `capacity` times → playable / solvable).
 */
window.COLOR_SORT_LEVELS = (function () {
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isComplete(tube, capacity) {
    if (!tube.length) return true;
    if (tube.length !== capacity) return false;
    const c = tube[0];
    return tube.every((x) => x === c);
  }

  function isSolved(tubes, capacity) {
    return tubes.every((t) => isComplete(t, capacity));
  }

  /**
   * Reverse scramble: move liquid onto any tube with free space.
   * With 2+ empty tubes and exact color counts this yields solvable puzzles.
   */
  function reverseScramble(numColors, capacity, extraEmpty, moves, seed) {
    const tubes = [];
    for (let c = 1; c <= numColors; c++) tubes.push(Array(capacity).fill(c));
    for (let e = 0; e < extraEmpty; e++) tubes.push([]);

    const rng = mulberry32(seed);
    let applied = 0;
    let guard = moves * 30;
    while (applied < moves && guard-- > 0) {
      const fromCandidates = [];
      for (let i = 0; i < tubes.length; i++) {
        if (tubes[i].length > 0) fromCandidates.push(i);
      }
      if (!fromCandidates.length) break;
      const from = fromCandidates[Math.floor(rng() * fromCandidates.length)];
      const color = tubes[from][tubes[from].length - 1];
      let run = 0;
      for (let k = tubes[from].length - 1; k >= 0 && tubes[from][k] === color; k--) run++;
      const pourAmount = 1 + Math.floor(rng() * run);

      const toCandidates = [];
      for (let i = 0; i < tubes.length; i++) {
        if (i === from) continue;
        if (tubes[i].length + pourAmount <= capacity) toCandidates.push(i);
      }
      if (!toCandidates.length) continue;
      const to = toCandidates[Math.floor(rng() * toCandidates.length)];
      for (let p = 0; p < pourAmount; p++) tubes[to].push(tubes[from].pop());
      applied++;
    }

    // Ensure not trivially solved; extra scramble if needed
    let extraGuard = 50;
    while (isSolved(tubes, capacity) && extraGuard-- > 0) {
      const from = Math.floor(rng() * numColors); // first numColors were filled
      if (!tubes[from].length) continue;
      const empties = [];
      for (let i = 0; i < tubes.length; i++) if (!tubes[i].length) empties.push(i);
      if (!empties.length) break;
      const to = empties[Math.floor(rng() * empties.length)];
      const n = 1 + Math.floor(rng() * Math.min(2, tubes[from].length));
      for (let p = 0; p < n; p++) tubes[to].push(tubes[from].pop());
    }

    return { tubes: tubes.map((t) => t.slice()), capacity };
  }

  const handcrafted = [
    {
      capacity: 4,
      tubes: [
        [1, 1, 2, 2],
        [2, 2, 1, 1],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 2, 1, 2],
        [2, 1, 2, 1],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 1, 2, 3],
        [2, 2, 3, 1],
        [3, 3, 1, 2],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 2, 3, 1],
        [2, 3, 1, 2],
        [3, 1, 2, 3],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 1, 1, 2],
        [2, 2, 3, 3],
        [3, 3, 2, 1],
        [],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 2, 1, 3],
        [2, 3, 2, 1],
        [3, 1, 3, 2],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 2, 3, 4],
        [4, 3, 2, 1],
        [1, 2, 3, 4],
        [4, 3, 2, 1],
        [],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 1, 2, 3],
        [4, 4, 3, 2],
        [2, 3, 4, 1],
        [3, 1, 4, 2],
        [],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 2, 3, 4],
        [2, 1, 4, 3],
        [3, 4, 1, 2],
        [4, 3, 2, 1],
        [],
        [],
      ],
    },
    {
      capacity: 4,
      tubes: [
        [1, 1, 2, 2],
        [3, 3, 4, 4],
        [1, 2, 3, 4],
        [4, 3, 2, 1],
        [],
        [],
      ],
    },
  ];

  // [colors, capacity, empty, reverseMoves, seed]
  const configs = [
    [4, 4, 2, 16, 2101],
    [4, 4, 2, 22, 2102],
    [5, 4, 2, 24, 2103],
    [5, 4, 2, 30, 2104],
    [5, 4, 2, 36, 2105],
    [5, 4, 2, 40, 2106],
    [6, 4, 2, 32, 2107],
    [6, 4, 2, 40, 2108],
    [6, 4, 2, 48, 2109],
    [6, 4, 2, 55, 2110],
    [7, 4, 2, 45, 2111],
    [7, 4, 2, 55, 2112],
    [7, 5, 2, 40, 2113],
    [8, 4, 2, 50, 2114],
    [8, 5, 2, 48, 2115],
    [8, 5, 2, 58, 2116],
    [9, 4, 2, 55, 2117],
    [9, 5, 2, 55, 2118],
    [10, 4, 2, 60, 2119],
    [10, 5, 2, 65, 2120],
    [10, 5, 2, 72, 2121],
    [11, 4, 2, 70, 2122],
    [11, 5, 2, 75, 2123],
    [12, 4, 2, 75, 2124],
    [12, 5, 2, 85, 2125],
  ];

  const generated = configs.map(([n, cap, empty, moves, seed]) =>
    reverseScramble(n, cap, empty, moves, seed)
  );

  return handcrafted.concat(generated);
})();

window.COLOR_PALETTE = [
  null,
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#e91e63',
  '#795548',
  '#00bcd4',
  '#8bc34a',
  '#ff5722',
];
