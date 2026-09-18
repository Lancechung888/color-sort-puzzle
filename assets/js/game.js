/**
 * ColorTube Sort (彩管分類)
 * Water/color tube sorting puzzle — vanilla JS
 *
 * Monetization stubs (no real ads):
 * - showInterstitialOnFailLoop() — call after N restarts without win
 * - showRewardedHint() — unlock hint via rewarded ad
 */
(function () {
  'use strict';

  const LEVELS = window.COLOR_SORT_LEVELS;
  const PALETTE = window.COLOR_PALETTE;
  const STORAGE_KEY = 'colorTubeSort_progress';
  const FAIL_LOOP_THRESHOLD = 3; // restarts without win → interstitial stub

  // --- State ---
  let levelIndex = 0;
  let capacity = 4;
  let tubes = []; // array of color-id arrays (bottom → top)
  let selected = -1;
  let history = [];
  let moves = 0;
  let pouring = false;
  let restartFailCount = 0;
  let layerPx = 28;

  // --- DOM ---
  const $ = (sel) => document.querySelector(sel);
  const tubesWrap = $('#tubes-wrap');
  const levelLabel = $('#level-label');
  const movesLabel = $('#moves-label');
  const btnUndo = $('#btn-undo');
  const btnRestart = $('#btn-restart');
  const btnHint = $('#btn-hint');
  const winOverlay = $('#win-overlay');
  const startScreen = $('#start-screen');
  const app = $('#app');

  // --- Persistence ---
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.level === 'number' && data.level >= 0 && data.level < LEVELS.length) {
          levelIndex = data.level;
        }
      }
    } catch (_) { /* ignore */ }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: levelIndex }));
    } catch (_) { /* ignore */ }
  }

  // --- Level helpers ---
  function cloneTubes(src) {
    return src.map((t) => t.slice());
  }

  function loadLevel(idx) {
    const def = LEVELS[idx];
    capacity = def.capacity || 4;
    tubes = cloneTubes(def.tubes);
    selected = -1;
    history = [];
    moves = 0;
    pouring = false;
    updateChrome();
    render();
    hideWin();
  }

  function topColor(tube) {
    if (!tube.length) return null;
    return tube[tube.length - 1];
  }

  function topRun(tube) {
    if (!tube.length) return { color: null, count: 0 };
    const color = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++;
    return { color, count };
  }

  function freeSpace(tube) {
    return capacity - tube.length;
  }

  function isTubeComplete(tube) {
    if (tube.length === 0) return true;
    if (tube.length !== capacity) return false;
    const c = tube[0];
    return tube.every((x) => x === c);
  }

  function isWon() {
    return tubes.every(isTubeComplete);
  }

  function canPour(fromIdx, toIdx) {
    if (fromIdx === toIdx) return false;
    const from = tubes[fromIdx];
    const to = tubes[toIdx];
    if (!from.length) return false;
    const space = freeSpace(to);
    if (space <= 0) return false;
    if (!to.length) return true;
    return topColor(from) === topColor(to);
  }

  function pourAmount(fromIdx, toIdx) {
    const run = topRun(tubes[fromIdx]);
    const space = freeSpace(tubes[toIdx]);
    return Math.min(run.count, space);
  }

  // --- Actions ---
  function selectTube(idx) {
    if (pouring) return;
    if (selected === idx) {
      selected = -1;
      render();
      return;
    }
    if (selected >= 0) {
      if (canPour(selected, idx)) {
        doPour(selected, idx);
        return;
      }
      // Invalid — shake target, then select new if it has liquid
      shakeTube(idx);
      if (tubes[idx].length > 0) {
        selected = idx;
      } else {
        selected = -1;
      }
      render();
      return;
    }
    // Select source only if it has liquid and isn't already complete (optional: allow complete)
    if (tubes[idx].length === 0) return;
    selected = idx;
    render();
  }

  function doPour(fromIdx, toIdx) {
    const amount = pourAmount(fromIdx, toIdx);
    if (amount <= 0) return;

    history.push({ tubes: cloneTubes(tubes), moves });
    if (history.length > 100) history.shift();

    pouring = true;
    const color = topColor(tubes[fromIdx]);
    animatePour(fromIdx, toIdx, color, amount, () => {
      for (let i = 0; i < amount; i++) {
        tubes[toIdx].push(tubes[fromIdx].pop());
      }
      moves++;
      selected = -1;
      pouring = false;
      updateChrome();
      render();
      if (isWon()) {
        restartFailCount = 0;
        setTimeout(showWin, 280);
      }
    });
  }

  function undo() {
    if (pouring || !history.length) return;
    const prev = history.pop();
    tubes = prev.tubes;
    moves = prev.moves;
    selected = -1;
    updateChrome();
    render();
  }

  function restart() {
    if (pouring) return;
    // Monetization stub: interstitial after fail-loop restarts
    restartFailCount++;
    if (restartFailCount >= FAIL_LOOP_THRESHOLD) {
      showInterstitialOnFailLoop();
      restartFailCount = 0;
    }
    loadLevel(levelIndex);
  }

  function nextLevel() {
    if (levelIndex < LEVELS.length - 1) {
      levelIndex++;
      saveProgress();
      loadLevel(levelIndex);
    } else {
      // Loop or congratulate
      hideWin();
      alert('恭喜通關全部關卡！🎉\nCongratulations — all levels cleared!');
      levelIndex = 0;
      saveProgress();
      loadLevel(0);
    }
  }

  function hint() {
    // Monetization stub: rewarded ad for hint
    showRewardedHint(() => {
      const move = findHintMove();
      if (!move) {
        flashStatus('目前沒有明顯提示 / No hint');
        return;
      }
      selected = move.from;
      render();
      // Briefly highlight destination
      const el = tubesWrap.children[move.to];
      if (el) {
        el.classList.add('selected');
        setTimeout(() => {
          if (selected === move.from) render();
        }, 700);
      }
      flashStatus('提示：倒入高亮試管 / Pour into highlighted tube');
    });
  }

  function findHintMove() {
    // Prefer: pour into matching non-empty, or empty that helps complete
    for (let f = 0; f < tubes.length; f++) {
      if (!tubes[f].length || isTubeComplete(tubes[f])) continue;
      for (let t = 0; t < tubes.length; t++) {
        if (!canPour(f, t)) continue;
        if (tubes[t].length > 0 && topColor(tubes[t]) === topColor(tubes[f])) {
          return { from: f, to: t };
        }
      }
    }
    for (let f = 0; f < tubes.length; f++) {
      if (!tubes[f].length || isTubeComplete(tubes[f])) continue;
      for (let t = 0; t < tubes.length; t++) {
        if (canPour(f, t) && tubes[t].length === 0) return { from: f, to: t };
      }
    }
    return null;
  }

  /* === Monetization stubs (no real ads) === */
  function showInterstitialOnFailLoop() {
    // TODO: AdMob / Unity Ads interstitial when player restarts repeatedly without winning
    console.info('[Ads stub] Interstitial — fail-loop restart');
  }

  function showRewardedHint(onReward) {
    // TODO: AdMob rewarded video; grant hint on reward callback
    console.info('[Ads stub] Rewarded ad — hint unlock');
    onReward();
  }

  // --- Render ---
  function computeLayerPx() {
    const n = tubes.length;
    const rows = n > 8 ? 2 : 1;
    const availH = Math.max(220, (app.clientHeight || window.innerHeight) - 200);
    const tubeH = Math.min(220, Math.floor((availH / rows) - 24));
    layerPx = Math.max(18, Math.floor(tubeH / capacity));
    return layerPx * capacity;
  }

  function render() {
    const tubeH = computeLayerPx();
    tubesWrap.innerHTML = '';

    // Dynamic tube width
    const n = tubes.length;
    let tubeW = 44;
    if (n >= 12) tubeW = 36;
    else if (n >= 10) tubeW = 38;
    else if (n >= 8) tubeW = 42;

    tubes.forEach((tube, idx) => {
      const el = document.createElement('div');
      el.className = 'tube' + (selected === idx ? ' selected' : '');
      el.style.width = tubeW + 'px';
      el.dataset.index = idx;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `試管 ${idx + 1}`);

      const rim = document.createElement('div');
      rim.className = 'tube-rim';

      const glass = document.createElement('div');
      glass.className = 'tube-glass';
      glass.style.height = tubeH + 'px';

      const layers = document.createElement('div');
      layers.className = 'tube-layers';

      tube.forEach((colorId) => {
        const layer = document.createElement('div');
        layer.className = 'layer';
        layer.style.height = layerPx + 'px';
        layer.style.background = PALETTE[colorId] || '#888';
        layers.appendChild(layer);
      });

      glass.appendChild(layers);
      el.appendChild(rim);
      el.appendChild(glass);
      el.addEventListener('click', () => selectTube(idx));
      tubesWrap.appendChild(el);
    });

    btnUndo.disabled = history.length === 0 || pouring;
  }

  function updateChrome() {
    levelLabel.textContent = `關卡 ${levelIndex + 1} / ${LEVELS.length}`;
    movesLabel.textContent = `步數 ${moves}`;
    btnUndo.disabled = history.length === 0;
  }

  function flashStatus(msg) {
    movesLabel.textContent = msg;
    setTimeout(updateChrome, 1600);
  }

  function shakeTube(idx) {
    const el = tubesWrap.children[idx];
    if (!el) return;
    el.classList.add('invalid-shake');
    setTimeout(() => el.classList.remove('invalid-shake'), 360);
  }

  // --- Pour animation ---
  function animatePour(fromIdx, toIdx, color, amount, done) {
    const fromEl = tubesWrap.children[fromIdx];
    const toEl = tubesWrap.children[toIdx];
    if (!fromEl || !toEl) {
      done();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();

    const stream = document.createElement('div');
    stream.className = 'pour-stream';
    stream.style.background = PALETTE[color] || '#888';
    stream.style.left = fromRect.left + fromRect.width / 2 - 4 - appRect.left + 'px';
    stream.style.top = fromRect.top - appRect.top + 10 + 'px';
    const dist = Math.max(40, toRect.top - fromRect.top + 40);
    stream.style.setProperty('--stream-h', dist + 'px');
    app.appendChild(stream);

    // Visually shrink top layers on source
    const layers = fromEl.querySelectorAll('.layer');
    for (let i = 0; i < amount && i < layers.length; i++) {
      const layer = layers[layers.length - 1 - i];
      if (layer) layer.classList.add('pouring-out');
    }

    // Tilt source slightly toward target
    const dir = toRect.left >= fromRect.left ? 1 : -1;
    fromEl.style.transform = `translateY(-12px) rotate(${dir * 12}deg)`;

    setTimeout(() => {
      stream.remove();
      fromEl.style.transform = '';
      done();
    }, 380);
  }

  // --- Win UI ---
  function showWin() {
    winOverlay.classList.add('show');
    spawnConfetti();
    const nextBtn = $('#btn-next');
    nextBtn.textContent =
      levelIndex < LEVELS.length - 1 ? '下一關 Next' : '再玩一次 Replay';
  }

  function hideWin() {
    winOverlay.classList.remove('show');
  }

  function spawnConfetti() {
    const colors = PALETTE.filter(Boolean);
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 20 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = Math.random() * 0.3 + 's';
      app.appendChild(p);
      setTimeout(() => p.remove(), 1600);
    }
  }

  // --- Boot ---
  function startGame() {
    startScreen.classList.remove('show');
    loadProgress();
    loadLevel(levelIndex);
  }

  function init() {
    btnUndo.addEventListener('click', undo);
    btnRestart.addEventListener('click', restart);
    btnHint.addEventListener('click', hint);
    $('#btn-next').addEventListener('click', nextLevel);
    $('#btn-win-restart').addEventListener('click', () => {
      hideWin();
      loadLevel(levelIndex);
    });
    $('#btn-start').addEventListener('click', startGame);

    // Level skip via long-press on level badge (dev convenience — stays subtle)
    levelLabel.addEventListener('dblclick', () => {
      if (levelIndex < LEVELS.length - 1) {
        levelIndex++;
        saveProgress();
        loadLevel(levelIndex);
      }
    });

    window.addEventListener('resize', () => {
      if (!startScreen.classList.contains('show')) render();
    });

    startScreen.classList.add('show');
    updateChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
