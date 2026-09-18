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

  const capTutorial = [
    {
      capacity: 4,
      modules: ['cap'],
      teach: 'cap',
      par: 1,
      tubes: [[1, 1], [1, 1], []],
      caps: [true, false, false],
    },
    {
      capacity: 4,
      modules: ['cap'],
      par: 3,
      tubes: [[1, 1, 2, 2], [], [2, 2, 1, 1]],
      caps: [false, true, false],
    },
    {
      capacity: 4,
      modules: ['cap'],
      par: 4,
      tubes: [[2, 2, 1, 1], [1, 1, 2, 2], []],
      caps: [false, true, false],
    },
    {
      capacity: 4,
      modules: ['cap'],
      par: 5,
      tubes: [[1, 2, 1, 2], [2, 1, 2, 1], []],
      caps: [true, true, false],
    },
    {
      capacity: 4,
      modules: ['cap'],
      par: 8,
      tubes: [[1, 1, 2, 3], [2, 2, 3, 1], [3, 3, 1, 2], []],
      caps: [false, false, true, false],
    },
  ];

  const handcrafted = [
    // L1 — 2 colors, near-complete first win feel
    {
      capacity: 4,
      tubes: [
        [1, 1, 1, 2],
        [2, 2, 2, 1],
        [],
      ],
    },
    // L2 — keep interleaved 2c
    {
      capacity: 4,
      tubes: [
        [1, 2, 1, 2],
        [2, 1, 2, 1],
        [],
      ],
    },
    // L3 — 3 colors, 2 empty
    {
      capacity: 4,
      tubes: [
        [1, 1, 2, 3],
        [2, 2, 3, 1],
        [3, 3, 1, 2],
        [],
        [],
      ],
    },
    // L4 — almost-complete 3c / 2 empty (satisfying finishes)
    {
      capacity: 4,
      tubes: [
        [1, 1, 1, 2],
        [2, 2, 2, 3],
        [3, 3, 3, 1],
        [],
        [],
      ],
    },
    // L5 — 3 colors
    {
      capacity: 4,
      tubes: [
        [1, 2, 1, 3],
        [2, 3, 2, 1],
        [3, 1, 3, 2],
        [],
        [],
      ],
    },
    // L6 — 3 colors
    {
      capacity: 4,
      tubes: [
        [1, 2, 3, 1],
        [2, 3, 1, 2],
        [3, 1, 2, 3],
        [],
        [],
      ],
    },
    // L7 — 3 colors (no 4c until L9)
    {
      capacity: 4,
      tubes: [
        [1, 2, 1, 2],
        [3, 1, 3, 2],
        [2, 3, 1, 3],
        [],
        [],
      ],
    },
    // L8 — 3 colors
    {
      capacity: 4,
      tubes: [
        [1, 3, 2, 1],
        [2, 1, 3, 2],
        [3, 2, 1, 3],
        [],
        [],
      ],
    },
    // L9 — first 4 colors + 2 empty, grouped
    {
      capacity: 4,
      tubes: [
        [1, 1, 1, 2],
        [2, 2, 2, 3],
        [3, 3, 3, 4],
        [4, 4, 4, 1],
        [],
        [],
      ],
    },
    // L10 — 4c 2 empty moderate
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

  // Cap tutorial = levels 1–5; prior early curve shifts after
  return capTutorial.concat(handcrafted, generated);
})();

window.COLOR_PALETTE = [
  null,
  /* candy gradients: top bright → bottom deep */
  'linear-gradient(180deg, #ff8a95 0%, #e74c3c 55%, #c0392b 100%)',
  'linear-gradient(180deg, #7ec8ff 0%, #3498db 55%, #1a6fa8 100%)',
  'linear-gradient(180deg, #7dffa3 0%, #2ecc71 55%, #1e8f4e 100%)',
  'linear-gradient(180deg, #ffe566 0%, #f1c40f 55%, #d4a00a 100%)',
  'linear-gradient(180deg, #d4a0ff 0%, #9b59b6 55%, #6c3483 100%)',
  'linear-gradient(180deg, #ffb074 0%, #e67e22 55%, #b85c10 100%)',
  'linear-gradient(180deg, #6ff5e0 0%, #1abc9c 55%, #117a65 100%)',
  'linear-gradient(180deg, #ff7eb3 0%, #e91e63 55%, #ad1457 100%)',
  'linear-gradient(180deg, #c4a484 0%, #795548 55%, #5d4037 100%)',
  'linear-gradient(180deg, #80deea 0%, #00bcd4 55%, #00838f 100%)',
  'linear-gradient(180deg, #c5e86c 0%, #8bc34a 55%, #558b2f 100%)',
  'linear-gradient(180deg, #ff8a65 0%, #ff5722 55%, #d84315 100%)',
];

/** Solid accents for pour stream / splash / confetti */
window.COLOR_SOLIDS = [
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

