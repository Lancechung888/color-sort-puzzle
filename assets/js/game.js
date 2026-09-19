/**
 * ColorTube Sort — retention + monetization build (English-first UI)
 * Vanilla JS. Mock IAP / ads with TODO hooks for Play Billing & StoreKit.
 */
(function () {
  'use strict';

  const LEVELS = window.COLOR_SORT_LEVELS;
  const PALETTE = window.COLOR_PALETTE;
  const SOLIDS = window.COLOR_SOLIDS || window.COLOR_PALETTE;
  const STORAGE_KEY = 'colorTubeSort_v2';
  const FAIL_LOOP_THRESHOLD_EARLY = 5;
  const FAIL_LOOP_THRESHOLD_LATE = 2;
  const START_COINS = 120;
  const HINT_COIN_COST = 25;
  const THEME_COIN_COST = 280;
  const HINT_PACK_COIN_COST = 120;
  const HINT_PACK_SIZE = 5;
  const STAR_REWARDS = { 1: 8, 2: 15, 3: 28 };
  /** First time a level hits 3★ — clear bonus beyond STAR_REWARDS[3] (not +1 spam). */
  const FIRST_THREE_STAR_BONUS = 22;
  /** Every CHAPTER_SIZE main levels all-3★ → chest (coins + free hint). */
  const CHAPTER_SIZE = 10;
  const CHAPTER_CHEST = { coins: 80, hints: 1 };
  /** Login streak milestones — soft Day1 (no harsh loss), real return reason. */
  const STREAK_MILESTONES = [
    { day: 3, coins: 50, hints: 1, label: '3-day streak' },
    { day: 7, coins: 100, hints: 2, label: 'Week streak' },
    { day: 14, coins: 180, hints: 3, label: 'Two-week streak' },
  ];
  /** index < 15 → early (5); from level 16+ (index ≥ 15) → late (2) */
  function failLoopThreshold() {
    if (isDailyMode) return FAIL_LOOP_THRESHOLD_EARLY;
    return levelIndex < 15 ? FAIL_LOOP_THRESHOLD_EARLY : FAIL_LOOP_THRESHOLD_LATE;
  }

  const THEMES = {
    classic: { id: 'classic', name: 'Classic Glass', free: true },
    neon: { id: 'neon', name: 'Neon Club', free: false },
    cat: { id: 'cat', name: 'Cozy Cat', free: false },
  };

  // --- Persistable state ---
  let save = {
    level: 0,
    maxUnlocked: 0,
    coins: START_COINS,
    stars: {}, // levelIndex -> 1|2|3
    removeAds: false,
    themes: { classic: true, neon: false, cat: false },
    activeTheme: 'classic',
    freeHints: 3,
    streak: 0,
    lastLoginDate: '',
    dailyDoneDate: '',
    streakMilestonesClaimed: [], // day numbers claimed (3/7/14)
    chapterChestsClaimed: [], // chapter numbers 1..N
    onboardingDone: false,
    capTeachDone: false,
    uncapArmTipDone: false,
    emptyTapTipDone: false,
  };

  // --- Session state ---
  let levelIndex = 0;
  let capacity = 4;
  let tubes = [];
  let caps = []; // parallel to tubes; true = lid on
  let selected = -1;
  /** Two-tap uncap: first tap arms, second within window confirms (free move). */
  let pendingUncapIdx = -1;
  let pendingUncapUntil = 0;
  let pendingUncapTimer = 0;
  const PENDING_UNCAP_MS = 2000;
  let history = [];
  let moves = 0;
  let pouring = false;
  let restartFailCount = 0;
  let layerPx = 28;
  let undosUsed = 0;
  let infiniteUndoLevel = false;
  let isDailyMode = false;
  let dailySeedKey = '';
  /** last hint source for hint_used attribution */
  let lastHintSource = 'unknown';

  function trackEvent(name, params) {
    if (window.ColorTubeAnalytics && typeof ColorTubeAnalytics.track === 'function') {
      ColorTubeAnalytics.track(name, params || {});
    }
  }

  function analyticsMode() {
    return isDailyMode ? 'daily' : 'main';
  }

  function analyticsLevelId() {
    return (typeof levelIndex === 'number' ? levelIndex : 0) + 1;
  }
  let lastWinStars = 0;
  let lastWinCoins = 0;
  let pendingFailRestart = false;
  /** Toast queued from login streak (shown after HUD ready). */
  let pendingStreakToast = '';

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
  const shopOverlay = $('#shop-overlay');
  const hintPaywall = $('#hint-paywall');
  const failPrompt = $('#fail-prompt');
  const app = $('#app');
  const toastEl = $('#toast');
  const onboardingTip = $('#onboarding-tip');
  /** 'onboarding' | 'cap' | null — so dismiss only marks the tip shown */
  let activeTipKind = null;

  // --- Persistence ---
  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        save = Object.assign({}, save, data);
        if (!save.themes) save.themes = { classic: true, neon: false, cat: false };
        save.themes.classic = true;
        ensureMetaSaveArrays();
      }
    } catch (_) { /* ignore */ }

    // Migrate old progress key if present
    try {
      const old = localStorage.getItem('colorTubeSort_progress');
      if (old && !localStorage.getItem(STORAGE_KEY)) {
        const data = JSON.parse(old);
        if (typeof data.level === 'number') {
          save.level = data.level;
          save.maxUnlocked = data.level;
        }
      }
    } catch (_) { /* ignore */ }

    updateStreakOnLogin();
    levelIndex = Math.min(save.level || 0, LEVELS.length - 1);
    applyTheme(save.activeTheme || 'classic');
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_) { /* ignore */ }
  }

  function ensureMetaSaveArrays() {
    if (!Array.isArray(save.streakMilestonesClaimed)) save.streakMilestonesClaimed = [];
    if (!Array.isArray(save.chapterChestsClaimed)) save.chapterChestsClaimed = [];
  }

  function nextStreakMilestone() {
    ensureMetaSaveArrays();
    const s = save.streak || 0;
    for (let i = 0; i < STREAK_MILESTONES.length; i++) {
      const m = STREAK_MILESTONES[i];
      if (s < m.day || save.streakMilestonesClaimed.indexOf(m.day) < 0) return m;
    }
    return null;
  }

  function claimStreakMilestones() {
    ensureMetaSaveArrays();
    const s = save.streak || 0;
    const claimed = [];
    STREAK_MILESTONES.forEach((m) => {
      if (s >= m.day && save.streakMilestonesClaimed.indexOf(m.day) < 0) {
        save.streakMilestonesClaimed.push(m.day);
        save.coins = (save.coins || 0) + m.coins;
        save.freeHints = (save.freeHints || 0) + m.hints;
        claimed.push(m);
        trackEvent('streak_milestone', {
          day: m.day,
          coins: m.coins,
          hints: m.hints,
          streak: s,
        });
      }
    });
    return claimed;
  }

  function updateStreakOnLogin() {
    ensureMetaSaveArrays();
    const today = todayStr();
    if (save.lastLoginDate === today) return;

    let resetSoft = false;
    let prevStreak = save.streak || 0;
    if (!save.lastLoginDate) {
      save.streak = 1;
    } else {
      const prev = new Date(save.lastLoginDate + 'T12:00:00');
      const now = new Date(today + 'T12:00:00');
      const diffDays = Math.round((now - prev) / 86400000);
      if (diffDays === 1) {
        save.streak = (save.streak || 0) + 1;
      } else {
        resetSoft = diffDays > 1 && prevStreak > 0;
        save.streak = 1;
      }
    }
    save.lastLoginDate = today;

    // Soft daily streak bonus (Day1 goodwill — no coin loss on miss)
    const soft = Math.min(10, 3 + (save.streak || 0));
    save.coins = (save.coins || 0) + soft;

    const milestones = claimStreakMilestones();
    if (milestones.length) {
      const m = milestones[milestones.length - 1];
      pendingStreakToast =
        '🔥 ' + m.label + '! +' + m.coins + ' coins' +
        (m.hints ? ' + ' + m.hints + ' hint' + (m.hints > 1 ? 's' : '') : '');
    } else if (resetSoft) {
      const next = nextStreakMilestone();
      pendingStreakToast = next
        ? 'Missed yesterday — streak restarts at 1. Next milestone: Day ' + next.day + ' (+' + next.coins + '🪙)'
        : 'Missed yesterday — streak restarts at 1. Come back tomorrow!';
    } else {
      const next = nextStreakMilestone();
      pendingStreakToast = next
        ? 'Day ' + (save.streak || 0) + ' · +' + soft + '🪙 · next milestone Day ' + next.day
        : 'Day ' + (save.streak || 0) + ' · +' + soft + '🪙 · streak master!';
    }

    persist();
  }

  function chapterOfIndex(idx) {
    return Math.floor(idx / CHAPTER_SIZE) + 1;
  }

  function chapterRange(chapter) {
    const start = (chapter - 1) * CHAPTER_SIZE;
    const end = Math.min(start + CHAPTER_SIZE, LEVELS.length);
    return { start: start, end: end, need: end - start };
  }

  function countPerfectInChapter(chapter) {
    const r = chapterRange(chapter);
    let n = 0;
    for (let i = r.start; i < r.end; i++) {
      if ((save.stars[i] || 0) >= 3) n++;
    }
    return { have: n, need: r.need, start: r.start, end: r.end };
  }

  function tryClaimChapterChest(forIndex) {
    ensureMetaSaveArrays();
    const chapter = chapterOfIndex(forIndex);
    if (save.chapterChestsClaimed.indexOf(chapter) >= 0) return null;
    const prog = countPerfectInChapter(chapter);
    if (prog.have < prog.need) return null;
    save.chapterChestsClaimed.push(chapter);
    save.coins = (save.coins || 0) + CHAPTER_CHEST.coins;
    save.freeHints = (save.freeHints || 0) + CHAPTER_CHEST.hints;
    trackEvent('chapter_chest', {
      chapter: chapter,
      coins: CHAPTER_CHEST.coins,
      hints: CHAPTER_CHEST.hints,
      levels: prog.need,
    });
    return { chapter: chapter, coins: CHAPTER_CHEST.coins, hints: CHAPTER_CHEST.hints };
  }

  function focusChapter() {
    const unlocked = Math.max(save.maxUnlocked || 0, save.level || 0, levelIndex || 0);
    return chapterOfIndex(Math.min(unlocked, LEVELS.length - 1));
  }

  function refreshMetaTeasers() {
    const el = $('#start-meta-teaser');
    if (!el) return;
    ensureMetaSaveArrays();
    const next = nextStreakMilestone();
    const streakLine = next
      ? '🔥 Day ' + (save.streak || 0) + ' · next milestone Day ' + next.day + ' (+' + next.coins + '🪙)'
      : '🔥 Day ' + (save.streak || 0) + ' · all streak milestones claimed';
    const ch = focusChapter();
    const prog = countPerfectInChapter(ch);
    const claimed = save.chapterChestsClaimed.indexOf(ch) >= 0;
    let chLine;
    if (claimed) {
      chLine = 'Chapter ' + ch + ' chest claimed';
    } else if (prog.have >= prog.need) {
      chLine = 'Chapter ' + ch + ' chest ready!';
    } else {
      chLine = '★ Ch.' + ch + ' ' + prog.have + '/' + prog.need + ' perfect → +' + CHAPTER_CHEST.coins + '🪙';
    }
    el.textContent = streakLine + ' · ' + chLine;
  }

  // --- Economy helpers ---
  function addCoins(n) {
    save.coins = Math.max(0, (save.coins || 0) + n);
    persist();
    refreshHud();
  }

  function spendCoins(n) {
    if ((save.coins || 0) < n) return false;
    save.coins -= n;
    persist();
    refreshHud();
    return true;
  }

  function refreshHud() {
    const c = save.coins || 0;
    const s = save.streak || 0;
    const set = (id, v) => {
      const el = $(id);
      if (el) el.textContent = String(v);
    };
    set('#coin-count', c);
    set('#streak-count', s);
    set('#start-coins', c);
    set('#start-streak', s);
    set('#shop-coins', c);
    set('#shop-hints', save.freeHints || 0);
    updateLevelStarsPreview();
    refreshMetaTeasers();
    refreshShopButtons();
  }

  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => { toastEl.hidden = true; }, 200);
    }, ms || 1800);
  }

  // --- Themes ---
  function applyTheme(id) {
    if (!THEMES[id] || !save.themes[id]) id = 'classic';
    save.activeTheme = id;
    document.body.setAttribute('data-theme', id);
    persist();
    refreshShopButtons();
  }

  function unlockTheme(id, via) {
    if (!THEMES[id]) return;
    save.themes[id] = true;
    persist();
    applyTheme(id);
    toast(`Theme unlocked: ${THEMES[id].name}` + (via ? ` (${via})` : ''));
    refreshShopButtons();
  }

  // --- Level helpers ---
  function cloneTubes(src) {
    return src.map((t) => t.slice());
  }

  function cloneCaps(src) {
    return (src || []).slice();
  }

  function hydrateCaps(def, tubeCount) {
    const raw = (def && def.caps) || [];
    const out = [];
    for (let i = 0; i < tubeCount; i++) out.push(!!raw[i]);
    return out;
  }

  function isCapped(idx) {
    return !!(caps && caps[idx]);
  }

  function estimatePar(def) {
    if (def.par) return def.par;
    const tubesArr = def.tubes || [];
    const cap = def.capacity || 4;
    let filled = 0;
    const colors = new Set();
    tubesArr.forEach((t) => {
      filled += t.length;
      t.forEach((c) => colors.add(c));
    });
    // Rough: more colors / filled layers → higher par
    return Math.max(5, Math.ceil(colors.size * cap * 0.7 + filled * 0.2));
  }

  function loadLevel(idx, opts) {
    opts = opts || {};
    isDailyMode = !!opts.daily;
    dailySeedKey = opts.dailyKey || '';
    const def = opts.def || LEVELS[idx];
    capacity = def.capacity || 4;
    tubes = cloneTubes(def.tubes);
    caps = hydrateCaps(def, tubes.length);
    selected = -1;
    clearPendingUncap();
    history = [];
    moves = 0;
    pouring = false;
    undosUsed = 0;
    infiniteUndoLevel = false;
    if (!opts.daily) levelIndex = idx;
    updateChrome();
    render();
    hideWin();
    maybeShowOnboarding();
    maybeShowCapTeach(def);
    if (opts.daily) {
      trackEvent('daily_start', {
        mode: 'daily',
        daily_key: dailySeedKey || '',
        level_id: (def && typeof def._dailyIndex === 'number') ? def._dailyIndex + 1 : analyticsLevelId(),
      });
    } else {
      trackEvent('level_start', { mode: 'main', level_id: analyticsLevelId() });
    }
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

  function isFilledComplete(tube) {
    return tube.length === capacity && tube.every((x) => x === tube[0]);
  }

  /** One empty slot from a filled solid complete — soft beckon juice for almost-done. */
  function isNearComplete(tube) {
    return tube.length === capacity - 1 && tube.length > 0 && tube.every((c) => c === tube[0]);
  }

  function isWon() {
    return tubes.every(isTubeComplete);
  }

  function canPour(fromIdx, toIdx) {
    if (fromIdx === toIdx) return false;
    if (isCapped(fromIdx) || isCapped(toIdx)) return false;
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

  /** Stars: 3 = under par & no undo; 2 = under 1.5×par or used undo but ≤par; 1 = clear */
  function calcStars() {
    const def = isDailyMode ? getDailyDef() : LEVELS[levelIndex];
    const par = estimatePar(def);
    const noUndo = undosUsed === 0 || infiniteUndoLevel;
    if (moves <= par && noUndo) return 3;
    if (moves <= Math.ceil(par * 1.5) || (moves <= par && !noUndo)) return 2;
    return 1;
  }

  function trimHistory() {
    // Infinite-undo SKU: truly unlimited this level; otherwise soft-cap memory
    const max = infiniteUndoLevel ? 5000 : 100;
    while (history.length > max) history.shift();
  }


  // --- Sample SFX (assets/audio) + Capacitor Haptics / vibrate ---
  // Replaces oscillator beeps with short clips suitable for UA first 3s.
  const SFX_BASE = 'assets/audio/';
  const SFX_STEMS = ['pour', 'land', 'complete', 'uncap', 'win', 'blocked', 'ui_tap'];
  let sfxExt = null;
  let sfxUnlocked = false;
  const sfxCache = Object.create(null);

  function detectSfxExt() {
    if (sfxExt) return sfxExt;
    const probe = document.createElement('audio');
    if (probe.canPlayType('audio/ogg; codecs="vorbis"') || probe.canPlayType('audio/ogg')) {
      sfxExt = '.ogg';
    } else {
      sfxExt = '.mp3';
    }
    return sfxExt;
  }

  function sfxUrl(stem) {
    return SFX_BASE + stem + detectSfxExt();
  }

  function warmSfx(stem) {
    if (sfxCache[stem]) return sfxCache[stem];
    const a = new Audio(sfxUrl(stem));
    a.preload = 'auto';
    a.volume = 0.85;
    sfxCache[stem] = a;
    return a;
  }

  function playSfx(stem, vol) {
    try {
      const proto = warmSfx(stem);
      const a = new Audio(proto.currentSrc || sfxUrl(stem));
      a.volume = vol == null ? 0.85 : vol;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* ignore missing/blocked audio */ }
  }

  function resumeAudio() {
    if (sfxUnlocked) return;
    sfxUnlocked = true;
    detectSfxExt();
    SFX_STEMS.forEach((stem) => {
      try { warmSfx(stem); } catch (_) { /* ignore */ }
    });
  }

  const SFX = {
    pour() { playSfx('pour', 0.9); },
    land() { playSfx('land', 0.75); },
    complete() { playSfx('complete', 0.85); },
    uncap() { playSfx('uncap', 0.9); },
    win() { playSfx('win', 0.9); },
    illegal() { playSfx('blocked', 0.85); },
    tap() { playSfx('ui_tap', 0.55); },
  };

  /**
   * Native-first haptics: Capacitor Haptics on Android/iOS, navigator.vibrate on web.
   * Never throws if plugin/platform missing (web / stub builds stay silent-safe).
   */
  function haptic(kind) {
    try {
      const cap = typeof Capacitor !== 'undefined' ? Capacitor : null;
      const plugins = (cap && cap.Plugins) || {};
      const H = plugins.Haptics || (typeof Haptics !== 'undefined' ? Haptics : null);
      const native = !!(cap && cap.getPlatform && (cap.getPlatform() === 'android' || cap.getPlatform() === 'ios'));
      if (H && native) {
        // Cap 6 string enums: ImpactStyle LIGHT|MEDIUM|HEAVY; NotificationType SUCCESS|WARNING|ERROR
        if (kind === 'complete') {
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          return;
        }
        if (kind === 'firstPour') {
          // First legal pour of level — clearer success than land, under complete
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          return;
        }
        if (kind === 'land') {
          // Light land tick — must stay under complete/win weight
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'uncap') {
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'arm' || kind === 'undo') {
          // Soft lid-arm / undo — invite, not error
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'illegal') {
          Promise.resolve(H.notification({ type: 'ERROR' })).catch(function () {});
          return;
        }
        if (kind === 'win') {
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'perfect') {
          // 3★ perfect — heavier than win; one HEAVY + SUCCESS, no spam loop
          Promise.resolve(H.impact({ style: 'HEAVY' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
        return;
      }
    } catch (_) { /* fall through to vibrate */ }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      if (kind === 'complete') navigator.vibrate([12, 30, 18]);
      else if (kind === 'firstPour') navigator.vibrate(18); // Day-1 first pour success
      else if (kind === 'land') navigator.vibrate(10); // ~8–12ms light tick
      else if (kind === 'illegal') navigator.vibrate(28);
      else if (kind === 'uncap') navigator.vibrate(10);
      else if (kind === 'arm') navigator.vibrate(8); // lid first-tap invite
      else if (kind === 'undo') navigator.vibrate(8);
      else if (kind === 'select') navigator.vibrate(8);
      else if (kind === 'win') navigator.vibrate([20, 40, 20, 40, 40]);
      else if (kind === 'perfect') navigator.vibrate([24, 36, 24, 36, 48]);
    } catch (_) { /* ignore */ }
  }

  // --- Actions ---
  function clearPendingUncap() {
    pendingUncapIdx = -1;
    pendingUncapUntil = 0;
    clearTimeout(pendingUncapTimer);
    pendingUncapTimer = 0;
  }

  function armPendingUncap(idx) {
    pendingUncapIdx = idx;
    pendingUncapUntil = Date.now() + PENDING_UNCAP_MS;
    clearTimeout(pendingUncapTimer);
    pendingUncapTimer = setTimeout(() => {
      if (pendingUncapIdx === idx) {
        clearPendingUncap();
        render();
      }
    }, PENDING_UNCAP_MS + 30);
  }

  function selectTube(idx) {
    if (pouring) return;

    // Cap module: destination while holding liquid → never uncap; two-tap self to uncap.
    if (isCapped(idx)) {
      if (selected >= 0 && selected !== idx) {
        // Holding liquid: capped destination is locked (signature: capped = can't pour)
        clearPendingUncap();
        shakeTube(idx);
        toast("Capped — can't pour");
        return;
      }
      const now = Date.now();
      if (pendingUncapIdx === idx && now <= pendingUncapUntil) {
        clearPendingUncap();
        uncapTube(idx);
        return;
      }
      // First tap: arm + lid pulse + tip; do not uncap yet
      selected = -1;
      armPendingUncap(idx);
      if (!save.uncapArmTipDone) {
        // Strengthen first-time teach only — later taps stay short (no spam)
        toast('Double-tap the lid to open it — free move (doesn\'t cost a pour)');
        save.uncapArmTipDone = true;
        persist();
      } else {
        toast('Tap again to uncap (free move)');
      }
      render();
      // Soft invite only — never illegal SFX/haptic (that reserved for blocked pours)
      pulseLidArm(idx);
      return;
    }

    clearPendingUncap();

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
      // Day-1 clarity: say why this pour is illegal (capped dest already toasted above)
      if (!isCapped(idx)) {
        if (freeSpace(tubes[idx]) <= 0) {
          toast('Tube full');
        } else if (tubes[idx].length > 0 && topColor(tubes[selected]) !== topColor(tubes[idx])) {
          toast("Colors don't match");
        }
      }
      shakeTube(idx);
      if (tubes[idx].length > 0 && !isCapped(idx)) selected = idx;
      else selected = -1;
      render();
      return;
    }
    if (tubes[idx].length === 0) {
      // First-time clarity: empty dest with nothing selected — not a valid lift
      if (!save.emptyTapTipDone) {
        toast('Tap a tube with color first');
        save.emptyTapTipDone = true;
        persist();
      }
      return;
    }
    selected = idx;
    SFX.tap();
    haptic('select');
    render();
  }

  /** Uncap does not count as a move; undo can re-lid. */
  function uncapTube(idx) {
    if (!isCapped(idx)) return;
    history.push({ tubes: cloneTubes(tubes), caps: cloneCaps(caps), moves });
    trimHistory();
    caps[idx] = false;
    selected = -1;
    SFX.uncap();
    haptic('uncap');
    const el = tubesWrap.children[idx];
    if (el) {
      el.classList.add('uncapping');
      spawnUncapBurst(el);
      setTimeout(() => {
        render();
      }, 400);
    } else {
      render();
    }
    toast('Lid opened');
  }


  /** Color-matched rim burst when a tube first fills solid (整管完成). */
  function spawnCompleteBurst(tubeEl, colorId) {
    if (!tubeEl) return;
    const hex = (SOLIDS && SOLIDS[colorId]) || (PALETTE && PALETTE[colorId]) || '#4ecdc4';
    const rect = tubeEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top - appRect.top + 10;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'complete-spark';
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const dist = 22 + Math.random() * 34;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = hex;
      p.style.boxShadow = '0 0 10px ' + hex;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 8 + 'px');
      p.style.animationDelay = (Math.random() * 40) + 'ms';
      app.appendChild(p);
      setTimeout(() => p.remove(), 520);
    }
  }

  function spawnUncapBurst(tubeEl) {
    const rect = tubeEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top - appRect.top + 4;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'uncap-spark';
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const dist = 18 + Math.random() * 28;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      app.appendChild(p);
      setTimeout(() => p.remove(), 420);
    }
  }

  function doPour(fromIdx, toIdx) {
    const amount = pourAmount(fromIdx, toIdx);
    if (amount <= 0) return;

    history.push({ tubes: cloneTubes(tubes), caps: cloneCaps(caps), moves });
    trimHistory();

    pouring = true;
    const color = topColor(tubes[fromIdx]);
    const wasCompleteBefore = tubes.map(isFilledComplete);
    const firstPourOfLevel = moves === 0;

    animatePour(fromIdx, toIdx, color, amount, () => {
      for (let i = 0; i < amount; i++) {
        tubes[toIdx].push(tubes[fromIdx].pop());
      }
      moves++;
      selected = -1;
      pouring = false;
      updateChrome();
      render();
      pulseLandRise(toIdx, amount);
      if (firstPourOfLevel) {
        pulseFirstPourSuccess(toIdx);
      }

      // Juice: newly completed filled tube
      if (isFilledComplete(tubes[toIdx]) && !wasCompleteBefore[toIdx]) {
        lightScreenShake();
        glowPulse(toIdx);
        spawnCompleteBurst(tubesWrap.children[toIdx], tubes[toIdx][0]);
        SFX.complete();
        haptic('complete');
        if (isWon()) {
          flashCompleteWhite();
        }
      }

      if (isWon()) {
        restartFailCount = 0;
        celebrateLevelClear();
        setTimeout(showWin, 480);
      }
    }, firstPourOfLevel);
  }

  function undo() {
    if (pouring || !history.length) return;
    const prev = history.pop();
    tubes = prev.tubes;
    caps = prev.caps ? cloneCaps(prev.caps) : hydrateCaps({}, tubes.length);
    moves = prev.moves;
    selected = -1;
    clearPendingUncap();
    if (!infiniteUndoLevel) undosUsed++;
    updateChrome();
    render();
    SFX.tap();
    haptic('undo');
  }

  function restart() {
    if (pouring) return;
    restartFailCount++;
    if (restartFailCount >= failLoopThreshold()) {
      pendingFailRestart = true;
      showFailPrompt();
      return;
    }
    doRestartLevel();
  }

  function doRestartLevel() {
    if (isDailyMode) {
      loadLevel(levelIndex, { daily: true, dailyKey: dailySeedKey, def: getDailyDef() });
    } else {
      loadLevel(levelIndex);
    }
  }

  function nextLevel() {
    if (isDailyMode) {
      hideWin();
      isDailyMode = false;
      loadLevel(save.level || 0);
      toast('Back to main levels');
      return;
    }
    if (levelIndex < LEVELS.length - 1) {
      levelIndex++;
      save.level = levelIndex;
      save.maxUnlocked = Math.max(save.maxUnlocked || 0, levelIndex);
      persist();
      loadLevel(levelIndex);
    } else {
      hideWin();
      toast('You cleared every level! 🎉');
      levelIndex = 0;
      save.level = 0;
      persist();
      loadLevel(0);
    }
  }

  function requestHint() {
    if (pouring) return;
    if ((save.freeHints || 0) > 0) {
      save.freeHints--;
      persist();
      refreshHud();
      lastHintSource = 'free';
      applyHint();
      return;
    }
    openOverlay(hintPaywall);
  }

  function applyHint() {
    const move = findHintMove();
    if (!move) {
      toast('No clear hint right now');
      return;
    }
    trackEvent('hint_used', {
      level_id: analyticsLevelId(),
      mode: analyticsMode(),
      source: lastHintSource || 'unknown',
      hint_kind: move.uncap ? 'uncap' : 'pour',
    });
    lastHintSource = 'unknown';
    if (move.uncap) {
      selected = -1;
      render();
      const el = tubesWrap.children[move.from];
      if (el) {
        el.classList.add('hint-uncap');
        setTimeout(() => render(), 900);
      }
      toast('Hint: double-tap to uncap (free move)');
      return;
    }
    selected = move.from;
    render();
    const el = tubesWrap.children[move.to];
    if (el) {
      el.classList.add('selected');
      setTimeout(() => {
        if (selected === move.from) render();
      }, 700);
    }
    toast('Hint: pour into the highlighted tube');
  }

  function findHintMove() {
    // Prefer teaching uncap when a lid blocks play
    for (let i = 0; i < tubes.length; i++) {
      if (isCapped(i)) return { from: i, to: i, uncap: true };
    }
    for (let f = 0; f < tubes.length; f++) {
      if (isCapped(f) || !tubes[f].length || isFilledComplete(tubes[f])) continue;
      for (let t = 0; t < tubes.length; t++) {
        if (f === t || isCapped(t)) continue;
        if (!canPour(f, t)) continue;
        if (tubes[t].length > 0 && topColor(tubes[t]) === topColor(tubes[f])) {
          return { from: f, to: t };
        }
      }
    }
    for (let f = 0; f < tubes.length; f++) {
      if (isCapped(f) || !tubes[f].length || isFilledComplete(tubes[f])) continue;
      for (let t = 0; t < tubes.length; t++) {
        if (canPour(f, t) && tubes[t].length === 0) return { from: f, to: t };
      }
    }
    for (let f = 0; f < tubes.length; f++) {
      if (isCapped(f) || !tubes[f].length || isFilledComplete(tubes[f])) continue;
      for (let t = 0; t < tubes.length; t++) {
        if (canPour(f, t)) return { from: f, to: t };
      }
    }
    return null;
  }

  /* === Monetization ===
   * AdMob: assets/js/ads.js (ColorTubeAds). Billing: assets/js/billing.js (ColorTubeBilling).
   * Fake IAP only when localStorage colorTubeSort_devIap===1 (default OFF).
   */
  /** Real Billing/StoreKit not wired. Default: never grant paid entitlements.
   * Set localStorage colorTubeSort_devIap=1 for DEV-only mock grants (default OFF).
   */
  function isDevIapEnabled() {
    try {
      return localStorage.getItem('colorTubeSort_devIap') === '1';
    } catch (_) {
      return false;
    }
  }

  function mockIapPurchase(productId, onSuccess) {
    // TODO: Google Play Billing / StoreKit 2 — real purchase flow required for store.
    console.info('[IAP] not available (needs store account)', productId);
    if (!isDevIapEnabled()) {
      toast('Coming soon / needs store account');
      return;
    }
    console.warn('[IAP DEV] granting', productId);
    toast('(DEV) Mock purchase ✓');
    if (onSuccess) onSuccess();
  }

  function purchaseRemoveAds() {
    // ACCEPTANCE P0①: normal shop click must NOT grant removeAds.
    // Real grant only via Play Billing success, or explicit DEV flag.
    if (save.removeAds) {
      toast('Ads removed');
      return;
    }
    const billing = window.ColorTubeBilling;
    const canNative =
      billing &&
      typeof billing.isBillingReady === 'function' &&
      billing.isBillingReady() &&
      typeof billing.purchaseRemoveAds === 'function';
    if (canNative) {
      toast('Opening purchase…');
      Promise.resolve(billing.purchaseRemoveAds())
        .then((ok) => {
          if (ok || (billing.isRemoveAdsOwned && billing.isRemoveAdsOwned())) {
            save.removeAds = true;
            persist();
            refreshHud();
            refreshShopButtons();
            trackEvent('iap_remove_ads', { product_id: 'remove_ads', source: 'play_billing' });
            toast('Ads removed');
          } else {
            toast('Purchase incomplete or canceled');
          }
        })
        .catch((e) => {
          console.warn('[IAP] purchaseRemoveAds', e);
          toast('Purchase failed — try again later');
        });
      return;
    }
    // Plugin missing / web / billing not ready → gated mock only (dev flag OFF by default)
    if (!isDevIapEnabled()) {
      toast('Coming soon / needs store account');
      return;
    }
    mockIapPurchase('remove_ads', () => {
      save.removeAds = true;
      persist();
      refreshHud();
      refreshShopButtons();
      trackEvent('iap_remove_ads', { product_id: 'remove_ads', source: 'dev_mock' });
      toast('(DEV) Ads removed');
    });
  }

  function showInterstitialStub(reason) {
    // Prefer assets/js/ads.js (ColorTubeAds / @capacitor-community/admob)
    if (window.ColorTubeAds && typeof window.ColorTubeAds.showInterstitial === 'function') {
      return window.ColorTubeAds.showInterstitial(reason);
    }
    if (save.removeAds) {
      console.info('[Ads stub] skipped (removeAds)', reason);
      return;
    }
    // TODO: wire @capacitor-community/admob interstitial
    console.info('[Ads stub] Interstitial', reason);
    toast('(Demo) Interstitial · ' + (reason || ''));
  }

  function showRewardedStub(onReward, label) {
    const placement = label || 'unknown';
    const wrapped = function (reward) {
      trackEvent('rewarded_complete', { placement: placement });
      if (onReward) onReward(reward);
    };
    if (window.ColorTubeAds && typeof window.ColorTubeAds.showRewarded === 'function') {
      return window.ColorTubeAds.showRewarded(wrapped, label);
    }
    // TODO: AdMob rewarded via ads.js; call onReward only after earn
    console.info('[Ads stub] Rewarded', label || '');
    toast('(Demo) Rewarded ad' + (label ? ' · ' + label : ''));
    setTimeout(() => wrapped(), 400);
  }

  // --- Daily challenge ---
  function dateSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Ensure daily boards show crowded gold lids (store/UA honesty). Uncap is free. */
  function ensureDailyCrowdedCaps(tubes, capsIn, seed, minCaps) {
    const n = tubes.length;
    const caps = cloneCaps(capsIn || []);
    while (caps.length < n) caps.push(false);
    let count = caps.filter(Boolean).length;
    if (count >= minCaps) return caps.slice(0, n);

    // Prefer non-empty tubes for visible gold lids
    const candidates = [];
    for (let i = 0; i < n; i++) {
      if (caps[i]) continue;
      if (tubes[i] && tubes[i].length > 0) candidates.push(i);
    }
    for (let i = 0; i < n; i++) {
      if (!caps[i] && (!tubes[i] || !tubes[i].length) && candidates.indexOf(i) < 0) {
        candidates.push(i);
      }
    }
    // Deterministic shuffle from date seed
    let s = seed >>> 0;
    for (let i = candidates.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }
    for (let k = 0; k < candidates.length && count < minCaps; k++) {
      caps[candidates[k]] = true;
      count++;
    }
    return caps.slice(0, n);
  }

  function getDailyDef() {
    const key = todayStr();
    const seed = dateSeed(key);
    // Prefer crowded mid/late boards (≥6 tubes) near progress; fall back upward
    const maxU = save.maxUnlocked || 0;
    let idx = Math.min(
      LEVELS.length - 1,
      Math.max(11, maxU - 1 + (seed % 6))
    );
    // Walk forward to a board with enough tubes for ≥3 lids
    for (let step = 0; step < LEVELS.length; step++) {
      const i = (idx + step) % LEVELS.length;
      if ((LEVELS[i].tubes || []).length >= 6) {
        idx = Math.max(i, 11); // never pull teaching L1–5 as daily showcase
        if (idx < 11) idx = 11;
        break;
      }
    }
    if (idx < 11) idx = Math.min(LEVELS.length - 1, 11);
    const base = LEVELS[idx];
    const tubes = cloneTubes(base.tubes);
    const caps = ensureDailyCrowdedCaps(tubes, base.caps || [], seed, 3);
    const modules = base.modules ? base.modules.slice() : [];
    if (caps.some(Boolean) && modules.indexOf('cap') < 0) modules.push('cap');
    return {
      capacity: base.capacity,
      tubes: tubes,
      caps: caps,
      modules: modules.length ? modules : ['cap'],
      par: Math.ceil(estimatePar(base) * 1.15),
      _dailyIndex: idx,
      _dailyMinCaps: 3,
    };
  }

  function startDailyChallenge() {
    const key = todayStr();
    if (save.dailyDoneDate === key) {
      toast('Daily already done! Streak ' + (save.streak || 0) + ' days');
    }
    hideAllOverlays();
    loadLevel(0, { daily: true, dailyKey: key, def: getDailyDef() });
    toast('Daily Challenge started!');
  }

  // --- Render ---
  function computeLayerPx() {
    const n = tubes.length;
    const rows = n > 8 ? 2 : 1;
    const availH = Math.max(220, (app.clientHeight || window.innerHeight) - 220);
    const tubeH = Math.min(230, Math.floor(availH / rows - 28));
    layerPx = Math.max(18, Math.floor(tubeH / capacity));
    return layerPx * capacity;
  }

  function render() {
    const tubeH = computeLayerPx();
    tubesWrap.innerHTML = '';

    const n = tubes.length;
    let tubeW = 58;
    if (n >= 12) tubeW = 44;
    else if (n >= 10) tubeW = 48;
    else if (n >= 8) tubeW = 52;
    if (window.matchMedia && window.matchMedia('(min-height: 700px)').matches && n < 8) {
      tubeW = 64;
    }

    tubes.forEach((tube, idx) => {
      const complete = isFilledComplete(tube);
      const nearComplete = !complete && isNearComplete(tube);
      const capped = isCapped(idx);
      const el = document.createElement('div');
      const pourTarget = selected >= 0 && selected !== idx && canPour(selected, idx);
      el.className =
        'tube' +
        (selected === idx ? ' selected' : '') +
        (pourTarget ? ' pour-target' : '') +
        (complete ? ' complete' : '') +
        (nearComplete ? ' near-complete' : '') +
        (capped ? ' capped' : '') +
        (capped && pendingUncapIdx === idx && Date.now() <= pendingUncapUntil ? ' cap-pending' : '');
      el.style.width = tubeW + 'px';
      el.dataset.index = idx;
      el.setAttribute('role', 'button');
      el.setAttribute(
        'aria-label',
        capped
          ? `Tube ${idx + 1} (capped)`
          : pourTarget
            ? `Tube ${idx + 1} (valid pour target)`
            : nearComplete
              ? `Tube ${idx + 1} (almost complete)`
              : `Tube ${idx + 1}`
      );

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

      if (capped) {
        const lid = document.createElement('div');
        lid.className = 'tube-lid';
        lid.setAttribute('aria-hidden', 'true');
        el.appendChild(lid);
      }

      el.addEventListener('click', () => selectTube(idx));
      tubesWrap.appendChild(el);
    });

    btnUndo.disabled = history.length === 0 || pouring;
  }

  function updateChrome() {
    if (isDailyMode) {
      levelLabel.textContent = 'Daily Challenge';
    } else {
      levelLabel.textContent = `Level ${levelIndex + 1} / ${LEVELS.length}`;
    }
    const def = isDailyMode ? getDailyDef() : LEVELS[levelIndex];
    const par = estimatePar(def);
    movesLabel.textContent = `Moves ${moves} · Par ${par}`;
    btnUndo.disabled = history.length === 0;
    updateLevelStarsPreview();
  }

  function updateLevelStarsPreview() {
    const el = $('#level-stars');
    if (!el) return;
    if (isDailyMode) {
      el.innerHTML = save.dailyDoneDate === todayStr() ? '★ ★ ★' : '';
      return;
    }
    const s = save.stars[levelIndex] || 0;
    el.innerHTML = [1, 2, 3]
      .map((i) => `<span class="${i <= s ? '' : 'empty'}">★</span>`)
      .join('');
  }

  /**
   * First tap on a capped tube: soft lid nudge + tap — teaches double-tap uncap.
   * Must NOT use shakeTube (illegal blocked SFX/ERROR haptic).
   */
  function pulseLidArm(idx) {
    const el = tubesWrap.children[idx];
    if (el) {
      el.classList.remove('lid-arm-nudge');
      void el.offsetWidth;
      el.classList.add('lid-arm-nudge');
      setTimeout(() => el.classList.remove('lid-arm-nudge'), 420);
    }
    SFX.tap();
    haptic('arm');
  }

  function shakeTube(idx) {
    const el = tubesWrap.children[idx];
    if (!el) return;
    el.classList.remove('invalid-shake');
    void el.offsetWidth; // restart shake if retriggered mid-animation
    el.classList.add('invalid-shake');
    SFX.illegal();
    haptic('illegal');
    setTimeout(() => el.classList.remove('invalid-shake'), 360);
  }

  function lightScreenShake() {
    app.classList.remove('screen-shake');
    void app.offsetWidth;
    app.classList.add('screen-shake');
    setTimeout(() => app.classList.remove('screen-shake'), 400);
  }

  function glowPulse(idx) {
    const el = tubesWrap.children[idx];
    if (!el) return;
    el.classList.remove('completePop');
    void el.offsetWidth;
    el.classList.add('complete', 'completePop');
  }

  /** Level-clear juice: cascade glow on filled tubes, then showWin (no confetti here). */
  function celebrateLevelClear() {
    let delay = 0;
    for (let i = 0; i < tubes.length; i++) {
      if (!isFilledComplete(tubes[i])) continue;
      const idx = i;
      setTimeout(() => glowPulse(idx), delay);
      delay += 55;
    }
    haptic('complete');
  }

  function flashCompleteWhite() {
    const flash = document.createElement('div');
    flash.className = 'complete-flash';
    app.appendChild(flash);
    setTimeout(() => flash.remove(), 80);
  }


  /** First legal pour of the level — clear Day-1 success beat (bar #1). */
  function pulseFirstPourSuccess(idx) {
    const el = tubesWrap.children[idx];
    if (!el) return;
    el.classList.remove('first-pour-glow');
    void el.offsetWidth;
    el.classList.add('first-pour-glow');
    setTimeout(() => el.classList.remove('first-pour-glow'), 420);
  }

  /** New layers on dest: fill-rise + brief glass flash (pour weight). */
  function pulseLandRise(toIdx, amount) {
    const toEl = tubesWrap.children[toIdx];
    if (!toEl || amount <= 0) return;
    toEl.classList.add('dest-receive');
    setTimeout(() => toEl.classList.remove('dest-receive'), 400);
    const layers = toEl.querySelectorAll('.layer');
    const n = layers.length;
    const start = Math.max(0, n - amount);
    for (let i = start; i < n; i++) {
      const layer = layers[i];
      const delay = (i - start) * 28;
      layer.style.animationDelay = delay + 'ms';
      layer.classList.add('land-rise');
      setTimeout(() => {
        layer.classList.remove('land-rise');
        layer.style.animationDelay = '';
      }, 480 + delay);
    }
  }

  // --- Pour animation + splash ---
  function animatePour(fromIdx, toIdx, color, amount, done, firstPour) {
    const fromEl = tubesWrap.children[fromIdx];
    const toEl = tubesWrap.children[toIdx];
    if (!fromEl || !toEl) {
      done();
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const hex = SOLIDS[color] || '#888';
    const fill = PALETTE[color] || hex;

    const dir = toRect.left >= fromRect.left ? 1 : -1;
    const tilt = 22 + Math.floor(Math.random() * 7); // 22–28deg
    // Aim stream from tilted source lip → destination mouth (not vertical under source)
    const lipOffset = dir * (fromRect.width * 0.28);
    const startX = fromRect.left + fromRect.width / 2 - appRect.left + lipOffset;
    const startY = fromRect.top - appRect.top + 6;
    const endX = toRect.left + toRect.width / 2 - appRect.left;
    const endY = toRect.top - appRect.top + 14;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.max(36, Math.hypot(dx, dy));
    // CSS stream grows downward; rotate from vertical so length reaches target mouth
    const angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);

    const stream = document.createElement('div');
    stream.className = 'pour-stream';
    stream.style.background = fill;
    stream.style.color = hex;
    stream.style.left = startX - 6 + 'px';
    stream.style.top = startY + 'px';
    stream.style.setProperty('--stream-h', dist + 'px');
    stream.style.transform = 'rotate(' + angleDeg + 'deg)';
    app.appendChild(stream);

    const layers = fromEl.querySelectorAll('.layer');
    for (let i = 0; i < amount && i < layers.length; i++) {
      const layer = layers[layers.length - 1 - i];
      if (layer) layer.classList.add('pouring-out');
    }

    fromEl.classList.add('pouring-tilt');
    fromEl.style.transform = `translateY(-14px) rotate(${dir * tilt}deg) scale(1.02)`;
    SFX.pour();

    setTimeout(() => {
      spawnSplash(endX, endY, hex, firstPour ? 24 : null);
      SFX.land();
      haptic(firstPour ? 'firstPour' : 'land');
      stream.remove();
      fromEl.style.transform = '';
      fromEl.classList.remove('pouring-tilt');
      done();
    }, 380);
  }

  function spawnSplash(x, y, color, count) {
    const n = count || (16 + Math.floor(Math.random() * 5)); // 16–20 default
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'splash-particle';
      p.style.background = color;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.35;
      const dist = 14 + Math.random() * 28;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      app.appendChild(p);
      setTimeout(() => p.remove(), 480);
    }
  }

  // --- Win UI ---
  function showWin() {
    SFX.win();
    const stars = calcStars();
    lastWinStars = stars;
    // 3★ gets distinct perfect haptic; 1–2★ keep standard win
    haptic(stars === 3 ? 'perfect' : 'win');
    let coins = STAR_REWARDS[stars] || 10;
    let metaBits = [];
    let masteryBonus = 0;
    let chest = null;

    if (isDailyMode) {
      const key = todayStr();
      if (save.dailyDoneDate !== key) {
        coins += 40; // first clear bonus
        save.dailyDoneDate = key;
      }
    } else {
      const prev = save.stars[levelIndex] || 0;
      if (stars > prev) {
        save.stars[levelIndex] = stars;
        // First-time 3★ mastery bonus (explicit replay reason)
        if (stars === 3 && prev < 3) {
          masteryBonus = FIRST_THREE_STAR_BONUS;
          coins += masteryBonus;
          metaBits.push('First 3★ +' + masteryBonus + '🪙');
          trackEvent('first_three_star', {
            mode: 'main',
            level_id: analyticsLevelId(),
            bonus: masteryBonus,
          });
        }
      } else {
        coins = Math.max(5, Math.floor(coins / 2));
      }
      save.maxUnlocked = Math.max(save.maxUnlocked || 0, levelIndex + 1);
      if (levelIndex >= (save.level || 0)) save.level = Math.min(levelIndex + 1, LEVELS.length - 1);

      chest = tryClaimChapterChest(levelIndex);
      if (chest) {
        // coins already added inside tryClaimChapterChest — don't double-count in lastWinCoins path
        metaBits.push('Chapter ' + chest.chapter + ' chest +' + chest.coins + '🪙 +' + chest.hints + ' hint');
      }
    }

    lastWinCoins = coins;
    // Chapter chest coins were added in tryClaimChapterChest; only add clear/mastery coins here
    addCoins(coins);
    persist();

    if (isDailyMode) {
      trackEvent('daily_clear', {
        mode: 'daily',
        daily_key: todayStr(),
        stars: stars,
        moves: moves,
        undos_used: undosUsed,
      });
    } else {
      trackEvent('level_clear', {
        mode: 'main',
        level_id: analyticsLevelId(),
        stars: stars,
        moves: moves,
        undos_used: undosUsed,
        first_three_star: masteryBonus > 0,
        chapter_chest: chest ? chest.chapter : 0,
      });
    }

    winOverlay.classList.add('show');
    const winModal = winOverlay.querySelector('.modal-win');
    const winStars = $('#win-stars');
    const winTitle = $('#win-title');
    if (winModal) winModal.classList.toggle('perfect', stars === 3);
    if (winStars) winStars.classList.toggle('perfect', stars === 3);
    if (winTitle) winTitle.textContent = stars === 3 ? 'Perfect!' : 'You win!';

    const starEls = winOverlay.querySelectorAll('.win-stars .star');
    starEls.forEach((el) => el.classList.remove('lit', 'perfect-pop'));
    starEls.forEach((el, i) => {
      setTimeout(() => {
        if (i < stars) {
          el.classList.remove('starPop', 'perfect-pop');
          void el.offsetWidth;
          el.classList.add('lit', 'starPop');
          if (stars === 3 && i === 2) {
            el.classList.add('perfect-pop');
            spawnPerfectBurst(winStars);
          }
        }
      }, 180 + i * 160);
    });

    const totalShown = coins + (chest ? chest.coins : 0);
    $('#win-reward').textContent = `+${totalShown} coins`;
    const detail =
      (isDailyMode ? 'Daily Challenge complete!' : `Level ${levelIndex + 1} complete`) +
      (stars === 3 ? ' · Perfect 3★' : ` · ${stars} star${stars === 1 ? '' : 's'}`) +
      (undosUsed && !infiniteUndoLevel ? ' (used undo)' : '');
    $('#win-detail').textContent = detail;
    const winMeta = $('#win-meta');
    if (winMeta) {
      if (metaBits.length) {
        winMeta.hidden = false;
        winMeta.textContent = metaBits.join(' · ');
      } else if (!isDailyMode && stars < 3) {
        winMeta.hidden = false;
        winMeta.textContent = 'Replay for 3★ (+' + FIRST_THREE_STAR_BONUS + '🪙 first time) · Ch. chest every ' + CHAPTER_SIZE + ' perfect';
      } else if (stars === 3 && !metaBits.length) {
        winMeta.hidden = false;
        winMeta.textContent = 'Perfect clear — no undo · under par';
      } else {
        winMeta.hidden = true;
        winMeta.textContent = '';
      }
    }

    const nextBtn = $('#btn-next');
    if (isDailyMode) nextBtn.textContent = 'Back to main';
    else nextBtn.textContent = levelIndex < LEVELS.length - 1 ? 'Next' : 'Play again';

    spawnConfetti(stars === 3);
    refreshMetaTeasers();
  }

  function hideWin() {
    winOverlay.classList.remove('show');
    const winModal = winOverlay.querySelector('.modal-win');
    const winStars = $('#win-stars');
    const winTitle = $('#win-title');
    if (winModal) winModal.classList.remove('perfect');
    if (winStars) winStars.classList.remove('perfect');
    if (winTitle) winTitle.textContent = 'You win!';
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  }

  /** Gold rim burst around win-stars on 3★ — distinct from board confetti. */
  function spawnPerfectBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const golds = ['#f7b731', '#ffe66d', '#ffd700', '#ffb347', '#fff3c4'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'perfect-spark';
      const ang = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.25;
      const dist = 28 + Math.random() * 42;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = golds[i % golds.length];
      p.style.boxShadow = '0 0 12px ' + golds[i % golds.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 6 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(() => p.remove(), 620);
    }
  }

  function spawnConfetti(perfect) {
    if (prefersReducedMotion()) return;
    // Prefer solids from colors present on the board; fall back to full palette
    const used = new Set();
    tubes.forEach((tube) => tube.forEach((c) => used.add(c)));
    let colors = [...used].map((id) => SOLIDS[id]).filter(Boolean);
    if (!colors.length) colors = SOLIDS.filter(Boolean);
    // 3★: bias confetti toward gold so perfect reads different from 1–2★
    if (perfect) {
      const golds = ['#f7b731', '#ffe66d', '#ffd700', '#ffb347'];
      colors = golds.concat(colors.slice(0, 3));
    }
    const shapes = ['', 'round', 'long'];
    const count = perfect ? 88 : 70;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti ' + shapes[i % shapes.length] + (perfect && i % 3 === 0 ? ' gold' : '');
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 18 + '%';
      const c = colors[Math.floor(Math.random() * colors.length)];
      p.style.background = c;
      p.style.color = c;
      p.style.animationDelay = Math.random() * 0.45 + 's';
      p.style.animationDuration = 1.2 + Math.random() * 0.8 + 's';
      app.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }

  // --- Level select / ★ mastery ---
  function openLevels() {
    renderLevelsGrid();
    openOverlay($('#levels-overlay'));
  }

  function closeLevels() {
    closeOverlay($('#levels-overlay'));
  }

  function renderLevelsGrid() {
    const grid = $('#levels-grid');
    const teaser = $('#levels-teaser');
    const foot = $('#levels-footnote');
    if (!grid) return;
    ensureMetaSaveArrays();
    const maxU = Math.max(save.maxUnlocked || 0, 0);
    const ch = focusChapter();
    const prog = countPerfectInChapter(ch);
    const claimed = save.chapterChestsClaimed.indexOf(ch) >= 0;
    if (teaser) {
      teaser.textContent =
        'First 3★ +' + FIRST_THREE_STAR_BONUS + '🪙 · Chapter ' + ch + ': ' +
        prog.have + '/' + prog.need + ' perfect → +' + CHAPTER_CHEST.coins + '🪙 +' + CHAPTER_CHEST.hints + ' hint' +
        (claimed ? ' (claimed)' : '');
    }
    grid.innerHTML = '';
    const showUntil = Math.min(LEVELS.length, Math.max(maxU + 1, 1));
    for (let i = 0; i < showUntil; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-cell';
      btn.setAttribute('role', 'listitem');
      const best = save.stars[i] || 0;
      const locked = i > maxU;
      if (locked) btn.classList.add('locked');
      if (best >= 3) btn.classList.add('perfect');
      else if (best > 0) btn.classList.add('partial');
      const starsHtml = [1, 2, 3]
        .map((s) => '<span class="' + (s <= best ? 'lit' : 'empty') + '">★</span>')
        .join('');
      btn.innerHTML =
        '<span class="level-cell-num">' + (i + 1) + '</span>' +
        '<span class="level-cell-stars">' + starsHtml + '</span>';
      if (!locked) {
        btn.addEventListener('click', () => {
          closeLevels();
          startScreen.classList.remove('show');
          isDailyMode = false;
          loadLevel(i);
          if (best < 3) {
            toast('Aim for 3★ · first time +' + FIRST_THREE_STAR_BONUS + '🪙');
          }
        });
      } else {
        btn.disabled = true;
        btn.title = 'Locked';
      }
      grid.appendChild(btn);
    }
    if (foot) {
      const missing = [];
      for (let i = prog.start; i < prog.end; i++) {
        if ((save.stars[i] || 0) < 3 && i <= maxU) missing.push(i + 1);
      }
      foot.textContent = missing.length
        ? 'Missing ★ on: L' + missing.slice(0, 8).join(', L') + (missing.length > 8 ? '…' : '') + ' — replay to fill the chest'
        : claimed
          ? 'Chapter ' + ch + ' complete. Keep the streak going!'
          : prog.have >= prog.need
            ? 'Clear any level in this chapter to open the chest'
            : 'Unlock more levels to grow this chapter';
    }
  }

  // --- Overlays ---
  function openOverlay(el) {
    if (el) el.classList.add('show');
  }

  function closeOverlay(el) {
    if (el) el.classList.remove('show');
  }

  function hideAllOverlays() {
    [startScreen, winOverlay, shopOverlay, hintPaywall, failPrompt, $('#levels-overlay')].forEach(closeOverlay);
  }

  function openShop() {
    refreshShopButtons();
    openOverlay(shopOverlay);
    // Native only: try restore once (no grant on web / missing plugin)
    try {
      const billing = window.ColorTubeBilling;
      if (billing && typeof billing.restorePurchasesOnce === 'function') {
        Promise.resolve(billing.restorePurchasesOnce()).then((owned) => {
          if (owned) {
            const was = !!save.removeAds;
            save.removeAds = true;
            persist();
            refreshHud();
            refreshShopButtons();
            if (!was) trackEvent('iap_remove_ads', { product_id: 'remove_ads', source: 'restore' });
          } else {
            refreshShopButtons();
          }
        }).catch(() => {});
      }
    } catch (_) { /* ignore */ }
  }

  function refreshShopButtons() {
    const removeCard = $('#shop-remove-ads');
    const btnRemove = $('#btn-buy-remove-ads');
    if (save.removeAds) {
      if (btnRemove) {
        btnRemove.textContent = 'Ads removed';
        btnRemove.disabled = true;
      }
      if (removeCard) removeCard.classList.add('owned');
    } else if (btnRemove) {
      const billingReady =
        window.ColorTubeBilling &&
        typeof window.ColorTubeBilling.isBillingReady === 'function' &&
        window.ColorTubeBilling.isBillingReady();
      if (isDevIapEnabled()) {
        btnRemove.textContent = '$0.99 · DEV buy';
      } else if (billingReady) {
        btnRemove.textContent = 'Remove ads';
      } else {
        btnRemove.textContent = 'Coming soon';
      }
      btnRemove.disabled = false;
      if (removeCard) removeCard.classList.remove('owned');
    }

    updateThemeButtons('classic', '#btn-theme-classic', null, null);
    updateThemeButtons('neon', null, '#btn-buy-neon-coins', '#btn-buy-neon-iap');
    updateThemeButtons('cat', null, '#btn-buy-cat-coins', '#btn-buy-cat-iap');

    const undoBtn = $('#btn-buy-infinite-undo');
    if (undoBtn) {
      if (infiniteUndoLevel) {
        undoBtn.textContent = 'Active this level';
        undoBtn.disabled = true;
      } else {
        undoBtn.textContent = 'Unlock this level';
        undoBtn.disabled = false;
      }
    }
  }

  function updateThemeButtons(id, useBtnSel, coinBtnSel, iapBtnSel) {
    const owned = !!save.themes[id];
    const active = save.activeTheme === id;
    const card = document.querySelector(`.shop-card[data-theme-id="${id}"]`);
    if (card) card.classList.toggle('owned', owned && id !== 'classic');

    if (useBtnSel) {
      const b = $(useBtnSel);
      if (b) {
        b.textContent = active ? 'In use' : 'Use';
        b.disabled = active;
        b.onclick = () => applyTheme(id);
      }
    }
    if (coinBtnSel) {
      const b = $(coinBtnSel);
      if (b) {
        if (owned) {
          b.textContent = active ? 'In use' : 'Use';
          b.className = 'btn btn-sm';
          b.onclick = () => applyTheme(id);
        } else {
          b.textContent = THEME_COIN_COST + ' 🪙';
          b.className = 'btn btn-sm btn-coins';
          b.onclick = () => buyThemeWithCoins(id);
        }
      }
    }
    if (iapBtnSel) {
      const b = $(iapBtnSel);
      if (b) {
        if (owned) {
          b.style.display = 'none';
        } else {
          b.style.display = '';
          b.textContent = 'Unlock with cash';
          b.onclick = () =>
            mockIapPurchase('theme_' + id, () => unlockTheme(id, 'IAP'));
        }
      }
    }
  }

  function buyThemeWithCoins(id) {
    if (save.themes[id]) {
      applyTheme(id);
      return;
    }
    if (!spendCoins(THEME_COIN_COST)) {
      toast('Not enough coins');
      return;
    }
    unlockTheme(id, 'coins');
  }

  function showFailPrompt() {
    trackEvent('level_fail', {
      level_id: analyticsLevelId(),
      mode: analyticsMode(),
      fail_reason: 'restart_loop',
      restart_count: restartFailCount,
    });
    openOverlay(failPrompt);
  }

  function maybeShowOnboarding() {
    if (save.onboardingDone) {
      if (activeTipKind === 'onboarding') activeTipKind = null;
      onboardingTip.hidden = true;
      return;
    }
    if (!isDailyMode && levelIndex === 0) {
      const tipP = onboardingTip.querySelector('p');
      if (tipP) {
        tipP.innerHTML =
          '👆 Tap a colored tube to lift, then tap another to pour.<br />Goal: every tube is one solid color (or empty).';
      }
      activeTipKind = 'onboarding';
      onboardingTip.hidden = false;
    } else {
      if (activeTipKind === 'onboarding') activeTipKind = null;
      onboardingTip.hidden = true;
    }
  }

  function maybeShowCapTeach(def) {
    if (!def || def.teach !== 'cap') return;
    if (save.capTeachDone) return;
    const tipP = onboardingTip.querySelector('p');
    if (tipP) {
      tipP.innerHTML =
        '🧢 <strong>New: lids!</strong> A capped tube can\'t pour in or out.<br />' +
        '<strong>Double-tap</strong> the lid to open it (free — doesn\'t use a move).<br />' +
        'Try pouring onto a lid → shake + toast <em>"Capped — can\'t pour"</em>.';
    }
    activeTipKind = 'cap';
    onboardingTip.hidden = false;
  }

  // --- Boot ---
  function startGame() {
    resumeAudio();
    // Prevent click-through from start CTA into tubes underneath
    app.classList.add('input-gate');
    startScreen.classList.remove('show');
    isDailyMode = false;
    loadLevel(levelIndex);
    setTimeout(() => app.classList.remove('input-gate'), 280);
  }

  function bindShop() {
    // Soft UI tap on primary chrome (not every shop SKU click — keeps ads clean)
    ['btn-undo', 'btn-restart', 'btn-hint', 'btn-shop', 'btn-next', 'btn-start'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => SFX.tap(), { capture: true });
    });

    $('#btn-shop').addEventListener('click', openShop);
    $('#btn-start-shop').addEventListener('click', () => {
      openShop();
    });
    $('#btn-win-shop').addEventListener('click', openShop);
    $('#btn-shop-close').addEventListener('click', () => closeOverlay(shopOverlay));
    $('#coin-display').addEventListener('click', openShop);

    $('#btn-buy-remove-ads').addEventListener('click', () => {
      purchaseRemoveAds();
    });

    $('#btn-buy-hints-coins').addEventListener('click', () => {
      if (!spendCoins(HINT_PACK_COIN_COST)) {
        toast('Not enough coins');
        return;
      }
      save.freeHints = (save.freeHints || 0) + HINT_PACK_SIZE;
      persist();
      refreshHud();
      toast(`Got hints ×${HINT_PACK_SIZE}`);
    });

    $('#btn-buy-hints-iap').addEventListener('click', () => {
      mockIapPurchase('hint_pack_5', () => {
        save.freeHints = (save.freeHints || 0) + HINT_PACK_SIZE;
        persist();
        refreshHud();
        toast(`Got hints ×${HINT_PACK_SIZE}`);
      });
    });

    $('#btn-buy-infinite-undo').addEventListener('click', () => {
      mockIapPurchase('infinite_undo_level', () => {
        infiniteUndoLevel = true;
        refreshShopButtons();
        toast('Unlimited undo enabled for this level');
      });
    });

    // Hint paywall
    $('#btn-hint-close').addEventListener('click', () => closeOverlay(hintPaywall));
    $('#btn-hint-ad').addEventListener('click', () => {
      closeOverlay(hintPaywall);
      lastHintSource = 'rewarded';
      showRewardedStub(() => applyHint(), 'hint');
    });
    $('#btn-hint-coins').addEventListener('click', () => {
      if (!spendCoins(HINT_COIN_COST)) {
        toast('Not enough coins');
        return;
      }
      closeOverlay(hintPaywall);
      lastHintSource = 'coins';
      applyHint();
    });
    $('#btn-hint-pack').addEventListener('click', () => {
      mockIapPurchase('hint_pack_5', () => {
        save.freeHints = (save.freeHints || 0) + HINT_PACK_SIZE;
        persist();
        refreshHud();
        closeOverlay(hintPaywall);
        if (save.freeHints > 0) {
          save.freeHints--;
          persist();
          refreshHud();
          lastHintSource = 'pack';
          applyHint();
        }
      });
    });

    // Fail prompt
    $('#btn-fail-ad').addEventListener('click', () => {
      closeOverlay(failPrompt);
      showRewardedStub(() => {
        restartFailCount = 0;
        doRestartLevel();
      }, 'continue');
    });
    $('#btn-fail-remove-ads').addEventListener('click', () => {
      closeOverlay(failPrompt);
      purchaseRemoveAds();
      // Do not auto-restart as if purchase succeeded
    });
    $('#btn-fail-skip').addEventListener('click', () => {
      closeOverlay(failPrompt);
      if (!save.removeAds) showInterstitialStub('fail-loop');
      restartFailCount = 0;
      doRestartLevel();
    });
  }

  function init() {
    // Ad creative capture: ?ad=1 or body.ad-capture hides chrome, scales playfield
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('ad') === '1' || q.has('ad')) {
        document.body.classList.add('ad-capture');
      }
    } catch (e) { /* ignore */ }

    loadSave();
    refreshHud();
    refreshMetaTeasers();
    if (pendingStreakToast) {
      const msg = pendingStreakToast;
      pendingStreakToast = '';
      setTimeout(() => toast(msg, 3200), 400);
    }

    document.addEventListener('pointerdown', resumeAudio, { once: true });
    btnUndo.addEventListener('click', undo);
    btnRestart.addEventListener('click', restart);
    btnHint.addEventListener('click', requestHint);
    $('#btn-next').addEventListener('click', nextLevel);
    $('#btn-win-restart').addEventListener('click', () => {
      hideWin();
      doRestartLevel();
    });
    $('#btn-start').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startGame();
    });
    $('#btn-daily').addEventListener('click', startDailyChallenge);
    $('#btn-start-daily').addEventListener('click', startDailyChallenge);
    $('#btn-dismiss-tip').addEventListener('click', () => {
      if (activeTipKind === 'cap') {
        save.capTeachDone = true;
      } else {
        // Default / onboarding: only clear pour teach — keep L3 lid teach for later
        save.onboardingDone = true;
      }
      activeTipKind = null;
      persist();
      onboardingTip.hidden = true;
    });
    $('#streak-display').addEventListener('click', () => {
      const next = nextStreakMilestone();
      const s = save.streak || 0;
      if (next) {
        toast('Streak ' + s + ' · next Day ' + next.day + ': +' + next.coins + '🪙 +' + next.hints + ' hint' + (next.hints > 1 ? 's' : ''));
      } else {
        toast('Streak ' + s + ' days — all milestones claimed. Keep it lit!');
      }
    });
    const btnStartLevels = $('#btn-start-levels');
    if (btnStartLevels) btnStartLevels.addEventListener('click', openLevels);
    const btnLevelsClose = $('#btn-levels-close');
    if (btnLevelsClose) btnLevelsClose.addEventListener('click', closeLevels);

    bindShop();

    // Native Billing restore once at boot (no-op on web; never mock-grants)
    try {
      const billing = window.ColorTubeBilling;
      if (billing && typeof billing.initBilling === 'function') {
        Promise.resolve(billing.initBilling()).then(() => {
          if (typeof billing.restorePurchasesOnce === 'function') {
            return billing.restorePurchasesOnce();
          }
        }).then((owned) => {
          if (owned) {
            const was = !!save.removeAds;
            save.removeAds = true;
            persist();
            refreshHud();
            refreshShopButtons();
            if (!was) trackEvent('iap_remove_ads', { product_id: 'remove_ads', source: 'restore' });
          }
        }).catch(() => {});
      }
    } catch (_) { /* ignore */ }

    // Level skip via dblclick removed (ACCEPTANCE P0).

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
