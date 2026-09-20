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
  const STORAGE_BAK_KEY = 'colorTubeSort_v2_bak';
  const LEGACY_PROGRESS_KEY = 'colorTubeSort_progress';
  /** Mid-level board draft (tubes/caps/moves/history) — separate from meta save. */
  const RUN_STORAGE_KEY = 'colorTubeSort_run_v1';
  /** Schema stamp written on every persist — load coerces unknown/missing safely. */
  const SAVE_VERSION = 2;
  const FAIL_LOOP_THRESHOLD_EARLY = 5;
  const FAIL_LOOP_THRESHOLD_LATE = 2;
  const START_COINS = 120;
  const HINT_COIN_COST = 25;
  const THEME_COIN_COST = 280;
  const HINT_PACK_COIN_COST = 120;
  const HINT_PACK_SIZE = 5;
  const UNDO_LEVEL_COIN_COST = 80;
  const STAR_REWARDS = { 1: 8, 2: 15, 3: 28 };
  /** First time a level hits 3★ — clear bonus beyond STAR_REWARDS[3] (not +1 spam). */
  const FIRST_THREE_STAR_BONUS = 22;
  /** First daily clear of the calendar day — bonus beyond STAR_REWARDS (not replay spam). */
  const DAILY_FIRST_CLEAR_BONUS = 40;
  /** Every CHAPTER_SIZE main levels all-3★ → chest (coins + free hint). */
  const CHAPTER_SIZE = 10;
  /** Must match CSS `.levels-grid { grid-template-columns: repeat(5, 1fr); }`. */
  const LEVELS_GRID_COLS = 5;
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
  function defaultSave() {
    return {
      v: SAVE_VERSION,
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
      sfxOn: true,
      hapticsOn: true,
      colorAssist: false,
    };
  }
  let save = defaultSave();
  /** Set by loadSave when primary blob was unusable / heavily repaired — toasted in init. */
  let pendingSaveRecoveryToast = '';

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
  /** Two-tap Restart confirm when board has progress (toast only — no soft-arm CSS). */
  let pendingRestartUntil = 0;
  let pendingRestartTimer = 0;
  const PENDING_RESTART_MS = 2000;
  /** Two-tap leave-run confirm when abandoning mid-level draft for another target (toast only). */
  let pendingLeaveUntil = 0;
  let pendingLeaveTimer = 0;
  let pendingLeaveKey = '';
  const PENDING_LEAVE_MS = 2000;
  /** Two-tap shop coin-spend confirm for big spends (≥80) — toast only, no soft-arm CSS. */
  let pendingSpendUntil = 0;
  let pendingSpendTimer = 0;
  let pendingSpendKey = '';
  const PENDING_SPEND_MS = 2000;
  /** Two-tap Settings Reset progress confirm — toast only, no soft-arm CSS. */
  let pendingResetUntil = 0;
  let pendingResetTimer = 0;
  const PENDING_RESET_MS = 2000;
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
  /** Once-per-stuck-state toast arm; clears when board gains a pour/uncap path */
  let stuckToastArmed = false;
  /** Levels overlay: which chapter (1-based) the grid is browsing; null until openLevels. */
  let levelsViewChapter = null;

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
  /** Toast queued from login streak (shown after HUD ready). Soft/reset only when no milestone. */
  let pendingStreakToast = '';
  /** Highest streak milestone claimed this login — start-screen claim juice (not toast). */
  let pendingStreakMilestone = null;
  /** Once-per-session soft cue when start shows Daily ready. */
  let dailyReadyCueFired = false;
  /** Once-per-session soft cue when start shows Continue · Level N. */
  let playContinueCueFired = false;
  /** Fail-sheet primary hint CTA soft-arm cue timer (once per open). */
  let failHintArmTimer = 0;
  /** Hint-paywall primary CTA soft-arm cue timer (once per open). */
  let hintPayArmTimer = 0;
  /** Levels overlay continue-cell soft-arm cue timer (once per open). */
  let levelsContinueArmTimer = 0;
  /** Win-sheet Replay-for-3★ soft-arm cue timer (once per open). */
  let winReplayArmTimer = 0;
  /** Shop affordable coin-CTA soft-arm cue timer (once per open). */
  let shopBuyArmTimer = 0;
  /** HUD #btn-hint soft-arm cue timer (once per ★-track drop when freeHints≥1). */
  let hudHintArmTimer = 0;
  /** HUD #btn-undo soft-arm cue timer (once per ★-track drop when freeHints<1 + undo available). */
  let hudUndoArmTimer = 0;
  /** Focus return when first dismissible/win overlay opens (depth 0→1). */
  let overlayFocusReturn = null;
  /** Count of open overlays that participate in focus restore (not start-screen). */
  let overlayFocusDepth = 0;
  let streakClaimClearTimer = 0;
  /** Shop theme-unlock claim juice clear timer. */
  let themeClaimClearTimer = 0;
  /** Shop hint-pack claim juice clear timer. */
  let hintsClaimClearTimer = 0;
  /** Shop unlimited-undo (this level) claim juice clear timer. */
  let undoClaimClearTimer = 0;
  /** HUD coin-earn pulse clear timer. */
  let coinEarnClearTimer = 0;
  /** HUD coin-spend pulse clear timer. */
  let coinSpendClearTimer = 0;
  /** HUD free-hints earn pulse clear timer. */
  let hintEarnClearTimer = 0;
  /** HUD free-hints spend pulse clear timer. */
  let hintSpendClearTimer = 0;
  /** Live ★ budget projection (HUD); reset each loadLevel. */
  let lastProjectedStars = 3;
  let starDropHapticFired = false;
  /** First successful uncap this level — signature USP juice (undo re-lid does not re-arm). */
  let levelFirstUncapDone = false;
  /** Mid-level ★-track drop pulse clear timer. */
  let starDropClearTimer = 0;
  /** Mid-level ★-track recover pulse clear timer. */
  let starRecoverClearTimer = 0;

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

  function clampInt(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(x)));
  }

  function sanitizeStars(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const maxIdx = LEVELS && LEVELS.length ? LEVELS.length - 1 : 999;
    Object.keys(raw).forEach((k) => {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx > maxIdx) return;
      const s = clampInt(raw[k], 1, 3, 0);
      if (s >= 1 && s <= 3) out[idx] = s;
    });
    return out;
  }

  function sanitizeThemes(raw) {
    const themes = { classic: true, neon: false, cat: false };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      themes.neon = !!raw.neon;
      themes.cat = !!raw.cat;
    }
    themes.classic = true;
    return themes;
  }

  function sanitizeIdList(raw, maxVal) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = Object.create(null);
    for (let i = 0; i < raw.length; i++) {
      const n = clampInt(raw[i], 0, maxVal, -1);
      if (n < 0 || seen[n]) continue;
      seen[n] = true;
      out.push(n);
    }
    return out;
  }

  /**
   * Coerce a parsed blob into a safe save. Never throws.
   * fatal=true → treat as unusable (try backup / legacy / defaults).
   * repaired=true → at least one field was clamped/replaced (rewrite clean).
   */
  function sanitizeSave(data) {
    const base = defaultSave();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { save: base, repaired: true, fatal: true };
    }
    let repaired = false;
    const levelMax = LEVELS && LEVELS.length ? LEVELS.length - 1 : 0;

    function takeInt(key, min, max, fallback) {
      if (data[key] === undefined || data[key] === null) return fallback;
      const v = clampInt(data[key], min, max, fallback);
      if (v !== data[key] && Number(data[key]) !== v) repaired = true;
      return v;
    }

    const level = takeInt('level', 0, levelMax, 0);
    let maxUnlocked = takeInt('maxUnlocked', 0, levelMax, level);
    if (maxUnlocked < level) {
      maxUnlocked = level;
      repaired = true;
    }

    let coins = START_COINS;
    if (data.coins !== undefined && data.coins !== null) {
      const c = Number(data.coins);
      if (!Number.isFinite(c)) {
        coins = START_COINS;
        repaired = true;
      } else {
        coins = Math.max(0, Math.min(1e9, Math.floor(c)));
        if (coins !== c) repaired = true;
      }
    }

    let freeHints = 3;
    if (data.freeHints !== undefined && data.freeHints !== null) {
      const h = Number(data.freeHints);
      if (!Number.isFinite(h)) {
        freeHints = 3;
        repaired = true;
      } else {
        freeHints = Math.max(0, Math.min(9999, Math.floor(h)));
        if (freeHints !== h) repaired = true;
      }
    }

    const streak = takeInt('streak', 0, 9999, 0);
    const stars = sanitizeStars(data.stars);
    if (!data.stars || typeof data.stars !== 'object' || Array.isArray(data.stars)) repaired = true;
    const themes = sanitizeThemes(data.themes);
    if (!data.themes || typeof data.themes !== 'object' || Array.isArray(data.themes)) repaired = true;

    let activeTheme = typeof data.activeTheme === 'string' ? data.activeTheme : 'classic';
    if (!THEMES[activeTheme] || !themes[activeTheme]) {
      if (data.activeTheme != null && data.activeTheme !== 'classic') repaired = true;
      activeTheme = 'classic';
    }

    const milestones = sanitizeIdList(data.streakMilestonesClaimed, 365);
    if (!Array.isArray(data.streakMilestonesClaimed)) repaired = true;
    const chests = sanitizeIdList(data.chapterChestsClaimed, 999);
    if (!Array.isArray(data.chapterChestsClaimed)) repaired = true;

    // removeAds: only explicit boolean true (never truthy string/number from corruption)
    const removeAds = data.removeAds === true;
    if (data.removeAds != null && data.removeAds !== true && data.removeAds !== false) repaired = true;

    // Mid-level board draft lives in RUN_STORAGE_KEY — never embed on meta save.
    if (data.run != null) repaired = true;

    const out = {
      v: SAVE_VERSION,
      level: level,
      maxUnlocked: maxUnlocked,
      coins: coins,
      stars: stars,
      removeAds: removeAds,
      themes: themes,
      activeTheme: activeTheme,
      freeHints: freeHints,
      streak: streak,
      lastLoginDate: typeof data.lastLoginDate === 'string' ? data.lastLoginDate : '',
      dailyDoneDate: typeof data.dailyDoneDate === 'string' ? data.dailyDoneDate : '',
      streakMilestonesClaimed: milestones,
      chapterChestsClaimed: chests,
      onboardingDone: data.onboardingDone === true,
      capTeachDone: data.capTeachDone === true,
      uncapArmTipDone: data.uncapArmTipDone === true,
      emptyTapTipDone: data.emptyTapTipDone === true,
      sfxOn: data.sfxOn !== false,
      hapticsOn: data.hapticsOn !== false,
      colorAssist: data.colorAssist === true,
    };
    if (data.v !== SAVE_VERSION) repaired = true;
    return { save: out, repaired: repaired, fatal: false };
  }

  function parseStorageRaw(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function tryLoadKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = parseStorageRaw(raw);
      if (data == null) return { save: defaultSave(), repaired: true, fatal: true, source: key };
      const result = sanitizeSave(data);
      result.source = key;
      return result;
    } catch (_) {
      return { save: defaultSave(), repaired: true, fatal: true, source: key };
    }
  }

  function migrateLegacyProgress() {
    try {
      const old = localStorage.getItem(LEGACY_PROGRESS_KEY);
      if (!old) return null;
      const data = parseStorageRaw(old);
      if (!data || typeof data !== 'object') return null;
      const levelMax = LEVELS && LEVELS.length ? LEVELS.length - 1 : 0;
      const level = clampInt(data.level, 0, levelMax, -1);
      if (level < 0) return null;
      const base = defaultSave();
      base.level = level;
      base.maxUnlocked = level;
      return { save: base, repaired: true, fatal: false, source: LEGACY_PROGRESS_KEY };
    } catch (_) {
      return null;
    }
  }

  function loadSave() {
    pendingSaveRecoveryToast = '';
    let result = tryLoadKey(STORAGE_KEY);
    let usedFallback = false;

    if (!result || result.fatal) {
      const bak = tryLoadKey(STORAGE_BAK_KEY);
      if (bak && !bak.fatal) {
        result = bak;
        usedFallback = true;
      } else {
        const legacy = migrateLegacyProgress();
        if (legacy) {
          result = legacy;
          usedFallback = true;
        } else if (result && result.fatal) {
          // Primary existed but was unusable — hard reset
          usedFallback = true;
          result = { save: defaultSave(), repaired: true, fatal: true, source: 'reset' };
        } else {
          result = { save: defaultSave(), repaired: false, fatal: false, source: 'fresh' };
        }
      }
    }

    save = result.save;
    ensureMetaSaveArrays();

    if (result.source === 'reset' || (usedFallback && result.fatal)) {
      pendingSaveRecoveryToast = 'Progress reset — save was damaged';
      persist();
    } else if (usedFallback) {
      pendingSaveRecoveryToast = 'Progress restored';
      persist();
    } else if (result.repaired && result.source === STORAGE_KEY) {
      // Quiet rewrite of coerced fields — no toast spam on mild clamps
      persist();
    }

    updateStreakOnLogin();
    levelIndex = Math.min(save.level || 0, LEVELS.length - 1);
    applyTheme(save.activeTheme || 'classic');
  }

  function persist() {
    save.v = SAVE_VERSION;
    ensureMetaSaveArrays();
    const payload = JSON.stringify(save);
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      try {
        localStorage.setItem(STORAGE_BAK_KEY, payload);
      } catch (_) { /* bak optional */ }
    } catch (err) {
      // Quota / private mode: drop bak + legacy, retry once
      try {
        localStorage.removeItem(STORAGE_BAK_KEY);
        localStorage.removeItem(LEGACY_PROGRESS_KEY);
        localStorage.setItem(STORAGE_KEY, payload);
      } catch (_) { /* ignore — session continues in memory */ }
    }
  }

  function ensureMetaSaveArrays() {
    if (!Array.isArray(save.streakMilestonesClaimed)) save.streakMilestonesClaimed = [];
    if (!Array.isArray(save.chapterChestsClaimed)) save.chapterChestsClaimed = [];
    if (!save.stars || typeof save.stars !== 'object' || Array.isArray(save.stars)) save.stars = {};
    if (!save.themes || typeof save.themes !== 'object') {
      save.themes = { classic: true, neon: false, cat: false };
    }
    save.themes.classic = true;
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
    let totalHints = 0;
    STREAK_MILESTONES.forEach((m) => {
      if (s >= m.day && save.streakMilestonesClaimed.indexOf(m.day) < 0) {
        save.streakMilestonesClaimed.push(m.day);
        save.coins = (save.coins || 0) + m.coins;
        save.freeHints = (save.freeHints || 0) + m.hints;
        totalHints += m.hints || 0;
        claimed.push(m);
        trackEvent('streak_milestone', {
          day: m.day,
          coins: m.coins,
          hints: m.hints,
          streak: s,
        });
      }
    });
    if (claimed.length && totalHints > 0) pulseHintEarn(totalHints);
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
      // Banner is the shout — no duplicate toast (coins/hints already granted above)
      pendingStreakMilestone = milestones[milestones.length - 1];
      pendingStreakToast = '';
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
    pulseHintEarn(CHAPTER_CHEST.hints);
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

  function maxChapter() {
    return Math.max(1, Math.ceil(LEVELS.length / CHAPTER_SIZE));
  }

  /** Highest chapter the player may browse (frontier chapter, not past last pack). */
  function maxBrowsableChapter() {
    return Math.min(maxChapter(), focusChapter());
  }

  function clampLevelsViewChapter(ch) {
    const maxB = maxBrowsableChapter();
    const n = typeof ch === 'number' && isFinite(ch) ? Math.floor(ch) : focusChapter();
    return Math.max(1, Math.min(maxB, n));
  }

  function setLevelsViewChapter(ch) {
    levelsViewChapter = clampLevelsViewChapter(ch);
    return levelsViewChapter;
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
    if (n > 0) pulseCoinEarn(n);
  }

  function clearCoinEarnPulse() {
    if (coinEarnClearTimer) {
      clearTimeout(coinEarnClearTimer);
      coinEarnClearTimer = 0;
    }
    const chip = $('#coin-display');
    if (chip) chip.classList.remove('coin-earn');
    document.querySelectorAll('.coin-earn-float').forEach(function (el) {
      el.remove();
    });
  }

  function clearCoinSpendPulse() {
    if (coinSpendClearTimer) {
      clearTimeout(coinSpendClearTimer);
      coinSpendClearTimer = 0;
    }
    const chip = $('#coin-display');
    if (chip) chip.classList.remove('coin-spend');
    document.querySelectorAll('.coin-spend-float').forEach(function (el) {
      el.remove();
    });
  }


  function clearStarTrackDropPulse() {
    if (starDropClearTimer) {
      clearTimeout(starDropClearTimer);
      starDropClearTimer = 0;
    }
    if (movesLabel) movesLabel.classList.remove('track-drop');
    document.querySelectorAll('.track-drop-float').forEach(function (el) {
      el.remove();
    });
  }

  /** Mid-level warning when projected stars drop off 3★ / 2★ track — one-shot per level. */
  function pulseStarTrackDrop(fromStars) {
    clearStarTrackRecoverPulse();
    clearStarTrackDropPulse();
    if (!movesLabel) return;
    const label = fromStars === 3 ? 'Off 3★' : fromStars === 2 ? 'Off 2★' : '−1★';
    movesLabel.classList.add('track-drop');
    const floatEl = document.createElement('span');
    floatEl.className = 'track-drop-float';
    floatEl.textContent = label;
    floatEl.setAttribute('aria-hidden', 'true');
    movesLabel.appendChild(floatEl);
    setTimeout(function () { haptic('starDrop'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    starDropClearTimer = setTimeout(clearStarTrackDropPulse, 600);
  }

  function clearStarTrackRecoverPulse() {
    if (starRecoverClearTimer) {
      clearTimeout(starRecoverClearTimer);
      starRecoverClearTimer = 0;
    }
    if (movesLabel) movesLabel.classList.remove('track-recover');
    document.querySelectorAll('.track-recover-float').forEach(function (el) {
      el.remove();
    });
  }

  /** Mid-level celebration when undo (or move budget) recovers onto 3★ / 2★ track. */
  function pulseStarTrackRecover(toStars) {
    clearStarTrackDropPulse();
    clearStarTrackRecoverPulse();
    if (!movesLabel) return;
    const label = toStars === 3 ? 'Back on 3★' : toStars === 2 ? 'Back on 2★' : 'Back on ★';
    movesLabel.classList.add('track-recover');
    const floatEl = document.createElement('span');
    floatEl.className = 'track-recover-float';
    floatEl.textContent = label;
    floatEl.setAttribute('aria-hidden', 'true');
    movesLabel.appendChild(floatEl);
    setTimeout(function () { haptic('starRecover'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    starRecoverClearTimer = setTimeout(clearStarTrackRecoverPulse, 600);
  }

  /** HUD celebration when coins are granted — no double grant; caller already added. */
  function pulseCoinEarn(n) {
    if (!(n > 0)) return;
    clearCoinSpendPulse();
    clearCoinEarnPulse();
    const chip = $('#coin-display');
    if (!chip) return;
    chip.classList.add('coin-earn');
    const floatEl = document.createElement('span');
    floatEl.className = 'coin-earn-float';
    floatEl.textContent = '+' + n;
    floatEl.setAttribute('aria-hidden', 'true');
    chip.appendChild(floatEl);
    setTimeout(function () { haptic('coins'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    coinEarnClearTimer = setTimeout(clearCoinEarnPulse, 700);
  }

  /** HUD feedback when coins are spent — no double spend; caller already deducted. */
  function pulseCoinSpend(n) {
    if (!(n > 0)) return;
    clearCoinSpendPulse();
    clearCoinEarnPulse();
    const chip = $('#coin-display');
    if (!chip) return;
    chip.classList.add('coin-spend');
    const floatEl = document.createElement('span');
    floatEl.className = 'coin-spend-float';
    floatEl.textContent = '-' + n;
    floatEl.setAttribute('aria-hidden', 'true');
    chip.appendChild(floatEl);
    setTimeout(function () { haptic('coinSpend'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    coinSpendClearTimer = setTimeout(clearCoinSpendPulse, 700);
  }

  function spendCoins(n) {
    if ((save.coins || 0) < n) return false;
    save.coins -= n;
    persist();
    refreshHud();
    pulseCoinSpend(n);
    return true;
  }

  function clearHintEarnPulse() {
    if (hintEarnClearTimer) {
      clearTimeout(hintEarnClearTimer);
      hintEarnClearTimer = 0;
    }
    const chip = $('#hint-display');
    if (chip) chip.classList.remove('hint-earn');
    document.querySelectorAll('.hint-earn-float').forEach(function (el) {
      el.remove();
    });
  }

  function clearHintSpendPulse() {
    if (hintSpendClearTimer) {
      clearTimeout(hintSpendClearTimer);
      hintSpendClearTimer = 0;
    }
    const chip = $('#hint-display');
    if (chip) chip.classList.remove('hint-spend');
    document.querySelectorAll('.hint-spend-float').forEach(function (el) {
      el.remove();
    });
  }

  /** HUD celebration when free hints are granted — no double grant; caller already added. */
  function pulseHintEarn(n) {
    if (!(n > 0)) return;
    clearHintSpendPulse();
    clearHintEarnPulse();
    const chip = $('#hint-display');
    if (!chip) return;
    chip.classList.add('hint-earn');
    const floatEl = document.createElement('span');
    floatEl.className = 'hint-earn-float';
    floatEl.textContent = '+' + n;
    floatEl.setAttribute('aria-hidden', 'true');
    chip.appendChild(floatEl);
    setTimeout(function () { haptic('hints'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    hintEarnClearTimer = setTimeout(clearHintEarnPulse, 700);
  }

  /** HUD feedback when a free hint is spent — no double spend; caller already deducted. */
  function pulseHintSpend(n) {
    if (!(n > 0)) return;
    clearHintSpendPulse();
    clearHintEarnPulse();
    const chip = $('#hint-display');
    if (!chip) return;
    chip.classList.add('hint-spend');
    const floatEl = document.createElement('span');
    floatEl.className = 'hint-spend-float';
    floatEl.textContent = '-' + n;
    floatEl.setAttribute('aria-hidden', 'true');
    chip.appendChild(floatEl);
    setTimeout(function () { haptic('hintSpend'); }, 40);
    try { SFX.tap(); } catch (_) { /* ignore */ }
    hintSpendClearTimer = setTimeout(clearHintSpendPulse, 700);
  }

  function addFreeHints(n) {
    if (!(n > 0)) return;
    save.freeHints = (save.freeHints || 0) + n;
    persist();
    refreshHud();
    pulseHintEarn(n);
  }
  function spendFreeHint() {
    if ((save.freeHints || 0) < 1) return false;
    save.freeHints--;
    persist();
    refreshHud();
    pulseHintSpend(1);
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
    set('#hint-count', save.freeHints || 0);
    set('#streak-count', s);
    set('#start-coins', c);
    set('#start-streak', s);
    set('#shop-coins', c);
    set('#shop-hints', save.freeHints || 0);
    if (btnHint) {
      btnHint.title = (save.freeHints || 0) > 0
        ? 'Hint · ' + save.freeHints + ' free'
        : 'Hint';
    }
    updateLevelStarsPreview();
    refreshMetaTeasers();
    refreshShopButtons();
    refreshDailyCta();
    refreshStartPlayCta();
  }

  /**
   * Mid-run mainline draft level index for start CTA / startGame, or -1.
   * Peek only — static resume cue (no soft-arm).
   */
  function mainlineResumeTargetIndex() {
    const draft = readRunDraft();
    if (!draft || !draftHasProgress(draft) || draft.daily) return -1;
    const di = Math.floor(Number(draft.levelIndex));
    if (!Number.isFinite(di) || di < 0 || di >= LEVELS.length) return -1;
    return di;
  }

  /**
   * Start-screen Daily CTA: sky/cyan Ready pulse when not yet cleared today;
   * quiet Done when dailyDoneDate === todayStr(); mid-run today draft → static On.
   * Optional once-per-session arm cue (Ready only — never for in-progress).
   */
  function refreshDailyCta(opts) {
    opts = opts || {};
    const btn = $('#btn-start-daily');
    const badge = $('#daily-cta-badge');
    if (!btn) return;
    const done = save.dailyDoneDate === todayStr();
    let inProgress = false;
    if (!done) {
      const draft = readRunDraft();
      inProgress = !!(
        draft &&
        draft.daily &&
        draft.dailyKey === todayStr() &&
        draftHasProgress(draft)
      );
    }
    // Done wins over any stale today draft
    const ready = !done && !inProgress;
    btn.classList.toggle('daily-ready', ready);
    btn.classList.toggle('daily-done', done);
    btn.classList.toggle('daily-in-progress', inProgress);
    if (badge) {
      badge.hidden = false;
      if (done) badge.textContent = 'Done ✓';
      else if (inProgress) badge.textContent = 'On';
      else badge.textContent = 'Ready';
    }
    if (done) {
      btn.setAttribute('aria-label', 'Daily Challenge — Done today');
    } else if (inProgress) {
      btn.setAttribute('aria-label', 'Daily Challenge — in progress');
    } else {
      btn.setAttribute('aria-label', 'Daily Challenge — Ready');
    }
    if (
      opts.cue &&
      ready &&
      !dailyReadyCueFired &&
      startScreen &&
      startScreen.classList.contains('show')
    ) {
      dailyReadyCueFired = true;
      setTimeout(function () {
        haptic('arm');
        SFX.tap();
      }, 320);
    }
  }

  /**
   * Start-screen primary Play CTA: fresh install stays "Play";
   * mid-run mainline draft → "Resume · Level N" + static cyan (no soft-arm);
   * else returning players get "Continue · Level N" + soft warm gold/peach arm.
   */
  function refreshStartPlayCta(opts) {
    opts = opts || {};
    const btn = $('#btn-start');
    if (!btn) return;
    const resumeIdx = mainlineResumeTargetIndex();
    const targetIndex =
      resumeIdx >= 0
        ? resumeIdx
        : Math.min(Math.max(save.level || 0, 0), LEVELS.length - 1);
    const isFresh =
      resumeIdx < 0 &&
      (save.maxUnlocked || 0) === 0 &&
      (save.level || 0) === 0;
    btn.classList.remove('play-continue', 'play-in-progress');
    if (resumeIdx >= 0) {
      const n = resumeIdx + 1;
      btn.textContent = 'Resume · Level ' + n;
      btn.classList.add('play-in-progress');
      btn.setAttribute('aria-label', 'Resume — Level ' + n + ' — in progress');
      return; // no soft-arm cue for static resume
    }
    if (isFresh) {
      btn.textContent = 'Play';
      btn.setAttribute('aria-label', 'Play');
    } else {
      const n = targetIndex + 1;
      btn.textContent = 'Continue · Level ' + n;
      btn.classList.add('play-continue');
      btn.setAttribute('aria-label', 'Continue — Level ' + n);
    }
    if (
      opts.cue &&
      !isFresh &&
      !playContinueCueFired &&
      startScreen &&
      startScreen.classList.contains('show')
    ) {
      playContinueCueFired = true;
      setTimeout(function () {
        haptic('arm');
        SFX.tap();
      }, 360);
    }
  }

  function toast(msg, ms) {
    if (!toastEl) return;
    // Visible before text write so aria-live polite can announce (not while visibility:hidden).
    toastEl.classList.add('show');
    toastEl.textContent = '';
    void toastEl.offsetWidth; // re-announce identical strings
    toastEl.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toastEl.classList.remove('show');
      toastEl.textContent = '';
    }, ms || 1800);
  }

  // Drop armed uncap when the tab/app hides — stale double-tap invites mis-taps on return.
  // Also flush mid-level run draft so kill/background can resume the board.
  function flushRunDraftOnHide() {
    if (document.hidden || document.visibilityState === 'hidden') {
      clearPendingUncap();
      if (isRunActive()) persistRunDraft();
    }
  }
  document.addEventListener('visibilitychange', flushRunDraftOnHide);
  window.addEventListener('pagehide', function () {
    clearPendingUncap();
    if (isRunActive()) persistRunDraft();
  });

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
    clearShopBuyArm();
    refreshShopButtons();
    // Banner is the claim shout — no toast duplicate
    showThemeUnlockClaim(id, via);
  }

  // --- Level helpers ---
  function cloneTubes(src) {
    return src.map((t) => t.slice());
  }

  function cloneCaps(src) {
    return (src || []).slice();
  }

  // --- Mid-level run draft (resume after kill/refresh/background) ---
  function colorMultisetOf(tubesArr) {
    const m = Object.create(null);
    if (!Array.isArray(tubesArr)) return m;
    for (let i = 0; i < tubesArr.length; i++) {
      const tube = tubesArr[i];
      if (!Array.isArray(tube)) continue;
      for (let j = 0; j < tube.length; j++) {
        const c = tube[j];
        if (c == null || c === '') continue;
        m[c] = (m[c] || 0) + 1;
      }
    }
    return m;
  }

  function colorMultisetsEqual(a, b) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      const k = ka[i];
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  function isRunActive() {
    if (!tubes || !tubes.length) return false;
    if (startScreen && startScreen.classList.contains('show')) return false;
    if (winOverlay && winOverlay.classList.contains('show')) return false;
    return true;
  }

  function cloneHistory(src) {
    if (!Array.isArray(src)) return [];
    const out = [];
    const max = 100;
    const start = Math.max(0, src.length - max);
    for (let i = start; i < src.length; i++) {
      const h = src[i];
      if (!h || typeof h !== 'object') continue;
      if (!Array.isArray(h.tubes)) continue;
      out.push({
        tubes: cloneTubes(h.tubes),
        caps: cloneCaps(h.caps),
        moves: Math.max(0, Math.floor(Number(h.moves) || 0)),
      });
    }
    return out;
  }

  function buildRunDraft() {
    return {
      v: 1,
      stamp: Date.now(),
      daily: !!isDailyMode,
      dailyKey: isDailyMode ? (dailySeedKey || '') : '',
      levelIndex: isDailyMode ? 0 : levelIndex,
      capacity: capacity,
      tubes: cloneTubes(tubes),
      caps: cloneCaps(caps),
      moves: moves,
      undosUsed: undosUsed,
      history: cloneHistory(history),
      infiniteUndoLevel: !!infiniteUndoLevel,
    };
  }

  function clearRunDraft() {
    try {
      localStorage.removeItem(RUN_STORAGE_KEY);
    } catch (_) { /* ignore */ }
  }

  function persistRunDraft() {
    if (!isRunActive()) return;
    // Fresh cold board (no moves, no history, all lids as def) — still OK to write so
    // refresh mid-level before first pour resumes the same board; restart clears first.
    try {
      localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(buildRunDraft()));
    } catch (_) {
      try {
        localStorage.removeItem(RUN_STORAGE_KEY);
      } catch (__) { /* ignore */ }
    }
  }

  function readRunDraft() {
    try {
      const raw = localStorage.getItem(RUN_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  /**
   * Validate draft against target level def so corruption cannot soft-lock.
   * Requires capacity, tube count, and color multiset match.
   */
  function validateRunDraft(draft, def, opts, idx) {
    opts = opts || {};
    if (!draft || typeof draft !== 'object' || !def || !Array.isArray(def.tubes)) return false;
    const wantDaily = !!opts.daily;
    if (!!draft.daily !== wantDaily) return false;
    if (wantDaily) {
      const key = opts.dailyKey || todayStr();
      if (typeof draft.dailyKey !== 'string' || draft.dailyKey !== key) return false;
      if (draft.dailyKey !== todayStr()) return false;
      if (save.dailyDoneDate === todayStr()) return false;
    } else {
      const li = Math.floor(Number(draft.levelIndex));
      if (!Number.isFinite(li) || li !== idx) return false;
    }
    const cap = def.capacity || 4;
    const dCap = Math.floor(Number(draft.capacity));
    if (!Number.isFinite(dCap) || dCap !== cap) return false;
    if (!Array.isArray(draft.tubes) || draft.tubes.length !== def.tubes.length) return false;
    if (!Array.isArray(draft.caps) || draft.caps.length !== draft.tubes.length) return false;
    // Each tube must be an array of layers within capacity
    for (let i = 0; i < draft.tubes.length; i++) {
      const t = draft.tubes[i];
      if (!Array.isArray(t) || t.length > cap) return false;
    }
    if (!colorMultisetsEqual(colorMultisetOf(draft.tubes), colorMultisetOf(def.tubes))) return false;
    const mv = Math.floor(Number(draft.moves));
    if (!Number.isFinite(mv) || mv < 0) return false;
    const uu = Math.floor(Number(draft.undosUsed));
    if (!Number.isFinite(uu) || uu < 0) return false;
    if (draft.history != null && !Array.isArray(draft.history)) return false;
    return true;
  }

  function applyRunDraft(draft, idx, opts) {
    opts = opts || {};
    isDailyMode = !!opts.daily;
    dailySeedKey = opts.dailyKey || draft.dailyKey || '';
    capacity = draft.capacity;
    tubes = cloneTubes(draft.tubes);
    caps = cloneCaps(draft.caps);
    moves = Math.max(0, Math.floor(Number(draft.moves) || 0));
    undosUsed = Math.max(0, Math.floor(Number(draft.undosUsed) || 0));
    history = cloneHistory(draft.history);
    infiniteUndoLevel = !!draft.infiniteUndoLevel;
    selected = -1;
    clearPendingUncap();
    clearPendingRestart();
    clearPendingLeave();
    clearPendingSpend();
    pouring = false;
    restartFailCount = 0;
    lastProjectedStars = 3;
    starDropHapticFired = false;
    // Mid-resume: do not re-fire first-uncap / first-pour signature juice
    levelFirstUncapDone = true;
    clearHudHintArm();
    clearHudUndoArm();
    stuckToastArmed = false;
    clearStarTrackDropPulse();
    clearStarTrackRecoverPulse();
    if (!opts.daily) levelIndex = idx;
    updateChrome();
    render();
    hideWin();
    toast('Resumed');
    if (opts.daily) {
      trackEvent('daily_start', {
        mode: 'daily',
        daily_key: dailySeedKey || '',
        level_id: (opts.def && typeof opts.def._dailyIndex === 'number') ? opts.def._dailyIndex + 1 : analyticsLevelId(),
        daily_twist: (opts.def && opts.def._dailyTwist) ? opts.def._dailyTwist : '',
        resumed: true,
      });
    } else {
      trackEvent('level_start', { mode: 'main', level_id: analyticsLevelId(), resumed: true });
    }
  }

  /** Try mid-level resume; on mismatch discard draft and cold-load. */
  function tryResumeOrLoad(idx, opts) {
    opts = opts || {};
    const def = opts.def || (opts.daily ? null : LEVELS[idx]);
    if (!def) {
      clearRunDraft();
      loadLevel(idx, opts);
      return false;
    }
    const draft = readRunDraft();
    if (draft && validateRunDraft(draft, def, opts, idx)) {
      applyRunDraft(draft, idx, Object.assign({}, opts, { def: def }));
      return true;
    }
    clearRunDraft();
    loadLevel(idx, opts);
    return false;
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
    // Cold load always discards mid-level draft (resume goes through tryResumeOrLoad).
    clearRunDraft();
    isDailyMode = !!opts.daily;
    dailySeedKey = opts.dailyKey || '';
    const def = opts.def || LEVELS[idx];
    capacity = def.capacity || 4;
    tubes = cloneTubes(def.tubes);
    caps = hydrateCaps(def, tubes.length);
    selected = -1;
    clearPendingUncap();
    clearPendingRestart();
    clearPendingLeave();
    clearPendingSpend();
    history = [];
    moves = 0;
    pouring = false;
    undosUsed = 0;
    lastProjectedStars = 3;
    starDropHapticFired = false;
    levelFirstUncapDone = false;
    clearHudHintArm();
    clearHudUndoArm();
    clearStarTrackDropPulse();
    clearStarTrackRecoverPulse();
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
        daily_twist: (def && def._dailyTwist) ? def._dailyTwist : '',
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


  function hasAnyLegalPour() {
    const n = tubes.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (canPour(i, j)) return true;
      }
    }
    return false;
  }

  /** Any lid still on — player can free-uncap to open pours (not a true deadlock). */
  function hasActionableCap() {
    if (!caps || !caps.length) return false;
    for (let i = 0; i < caps.length; i++) {
      if (caps[i]) return true;
    }
    return false;
  }

  /**
   * True deadlock: not won, zero legal pours, and no lids left to uncap.
   * Hint cannot invent a pour here — Undo / Restart are the recovery paths.
   */
  function isBoardStuck() {
    if (isWon()) return false;
    if (hasAnyLegalPour()) return false;
    if (hasActionableCap()) return false;
    return true;
  }

  function maybeNotifyStuck() {
    if (pouring) return;
    if (startScreen && startScreen.classList.contains('show')) return;
    if (winOverlay && winOverlay.classList.contains('show')) return;
    if (!isBoardStuck()) {
      stuckToastArmed = false;
      return;
    }
    if (stuckToastArmed) return;
    stuckToastArmed = true;
    const msg = history.length
      ? 'No moves left — Undo'
      : 'No moves left — Restart';
    toast(msg, 2800);
    trackEvent('board_stuck', {
      level_id: analyticsLevelId(),
      mode: analyticsMode(),
      moves: moves,
      undos_used: undosUsed,
      can_undo: history.length > 0,
    });
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
    if (save.sfxOn === false) return;
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
    if (save.hapticsOn === false) return;
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
        if (kind === 'firstUncap') {
          // First successful uncap of level — gold-lid USP; firmer than normal uncap
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'land') {
          // Light land tick — must stay under complete/win weight
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'landComplete') {
          // Completing-pour land — a touch firmer than land, still under complete MEDIUM
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'winPour') {
          // Level-clearing pour land — firmer than landComplete, under full win/perfect
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
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
        if (kind === 'chest') {
          // Chapter chest claim — second beat after win/perfect; MEDIUM + SUCCESS
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'mastery') {
          // First-time 3★ mastery claim — same weight as chest; second beat after win/perfect
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'daily') {
          // Daily first-clear claim — same weight as mastery/chest; second beat after win/perfect
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'newBest') {
          // New-best star improve claim — same weight as mastery/daily; second beat after win
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'unlock') {
          // New-level unlock claim — same weight as newBest/mastery; second beat after win
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'streak') {
          // Login streak milestone claim — same weight as daily/mastery/chest
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'theme') {
          // Theme unlock claim in shop — same weight as streak/daily/mastery/chest
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'hintsPack') {
          // Hint-pack purchase claim in shop — same weight as theme unlock
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'undoPack') {
          // Unlimited-undo (this level) claim in shop — same weight as hint-pack
          Promise.resolve(H.impact({ style: 'MEDIUM' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'coins') {
          // HUD coin-earn — light success tick, under hint-pack / win weight
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'coinSpend') {
          // HUD coin-spend — soft loss tick, lighter than earn SUCCESS
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'starDrop') {
          // Mid-level ★-track drop — soft warning tick
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'starRecover') {
          // Mid-level ★-track recover — soft success invite (mirror coins, under win)
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'hints') {
          // HUD free-hints earn — light success tick (mirror coins)
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          Promise.resolve(H.notification({ type: 'SUCCESS' })).catch(function () {});
          return;
        }
        if (kind === 'hintSpend') {
          // HUD free-hints spend — soft loss tick, lighter than earn SUCCESS
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
          return;
        }
        if (kind === 'hint') {
          // Hint reveal — soft invite, under arm/select weight band but with SUCCESS tick
          Promise.resolve(H.impact({ style: 'LIGHT' })).catch(function () {});
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
      else if (kind === 'firstUncap') navigator.vibrate(20); // first uncap of level ~18–22ms
      else if (kind === 'land') navigator.vibrate(10); // ~8–12ms light tick
      else if (kind === 'landComplete') navigator.vibrate(14); // completing pour land — bit more than land
      else if (kind === 'winPour') navigator.vibrate(18); // winning-pour land — firmer, not full win
      else if (kind === 'illegal') navigator.vibrate(28);
      else if (kind === 'uncap') navigator.vibrate(10);
      else if (kind === 'arm') navigator.vibrate(8); // lid first-tap invite
      else if (kind === 'undo') navigator.vibrate(8);
      else if (kind === 'select') navigator.vibrate(8);
      else if (kind === 'win') navigator.vibrate([20, 40, 20, 40, 40]);
      else if (kind === 'perfect') navigator.vibrate([24, 36, 24, 36, 48]);
      else if (kind === 'chest') navigator.vibrate(26); // chapter chest second beat ~20–30ms
      else if (kind === 'mastery') navigator.vibrate(26); // first-3★ mastery second beat ~20–30ms
      else if (kind === 'daily') navigator.vibrate(26); // daily first-clear second beat ~20–30ms
      else if (kind === 'newBest') navigator.vibrate(24); // new-best star improve second beat ~22–26ms
      else if (kind === 'unlock') navigator.vibrate(24); // new-level unlock second beat ~22–26ms
      else if (kind === 'streak') navigator.vibrate(26); // streak milestone claim ~20–30ms
      else if (kind === 'theme') navigator.vibrate(26); // theme unlock claim ~20–30ms
      else if (kind === 'hintsPack') navigator.vibrate(26); // hint-pack claim ~20–30ms
      else if (kind === 'undoPack') navigator.vibrate(26); // unlimited-undo claim ~20–30ms
      else if (kind === 'coins') navigator.vibrate(14); // HUD coin-earn soft tick
      else if (kind === 'coinSpend') navigator.vibrate(12); // HUD coin-spend soft tick
      else if (kind === 'starDrop') navigator.vibrate(14); // ★-track drop soft warning
      else if (kind === 'starRecover') navigator.vibrate(14); // ★-track recover soft success
      else if (kind === 'hints') navigator.vibrate(14); // HUD free-hints earn soft tick
      else if (kind === 'hintSpend') navigator.vibrate(12); // HUD free-hints spend soft tick
      else if (kind === 'hint') navigator.vibrate(12); // hint reveal soft tick
    } catch (_) { /* ignore */ }
  }

  // --- Actions ---
  function clearPendingUncap() {
    pendingUncapIdx = -1;
    pendingUncapUntil = 0;
    clearTimeout(pendingUncapTimer);
    pendingUncapTimer = 0;
  }

  function clearPendingRestart() {
    pendingRestartUntil = 0;
    clearTimeout(pendingRestartTimer);
    pendingRestartTimer = 0;
  }

  function armPendingRestart() {
    clearPendingLeave();
    clearPendingSpend();
    clearPendingReset();
    pendingRestartUntil = Date.now() + PENDING_RESTART_MS;
    clearTimeout(pendingRestartTimer);
    pendingRestartTimer = setTimeout(function () {
      clearPendingRestart();
    }, PENDING_RESTART_MS + 30);
  }

  function clearPendingLeave() {
    pendingLeaveUntil = 0;
    pendingLeaveKey = '';
    clearTimeout(pendingLeaveTimer);
    pendingLeaveTimer = 0;
  }

  function armPendingLeave(key) {
    clearPendingRestart();
    clearPendingSpend();
    clearPendingReset();
    pendingLeaveKey = key || '';
    pendingLeaveUntil = Date.now() + PENDING_LEAVE_MS;
    clearTimeout(pendingLeaveTimer);
    pendingLeaveTimer = setTimeout(function () {
      clearPendingLeave();
    }, PENDING_LEAVE_MS + 30);
  }

  function clearPendingSpend() {
    pendingSpendUntil = 0;
    pendingSpendKey = '';
    clearTimeout(pendingSpendTimer);
    pendingSpendTimer = 0;
  }

  function armPendingSpend(key) {
    clearPendingRestart();
    clearPendingLeave();
    clearPendingReset();
    pendingSpendKey = key || '';
    pendingSpendUntil = Date.now() + PENDING_SPEND_MS;
    clearTimeout(pendingSpendTimer);
    pendingSpendTimer = setTimeout(function () {
      clearPendingSpend();
    }, PENDING_SPEND_MS + 30);
  }

  /**
   * Two-tap confirm before big shop coin spends (hints pack / undo / theme).
   * Same key armed within window → proceed; else arm + toast (no soft-arm CSS).
   */
  function confirmShopSpendThen(key, cost, proceedFn) {
    const now = Date.now();
    const armed =
      pendingSpendUntil > 0 &&
      now <= pendingSpendUntil &&
      pendingSpendKey === key;
    if (!armed) {
      armPendingSpend(key);
      toast('Tap again to spend ' + cost + '🪙');
      try { SFX.tap(); } catch (_) { /* ignore */ }
      try { haptic('select'); } catch (_) { /* ignore */ }
      trackEvent('shop_spend_confirm_arm', {
        spend_key: key,
        cost: cost,
        coins: save.coins || 0,
      });
      return;
    }
    clearPendingSpend();
    proceedFn();
  }

  function clearPendingReset() {
    pendingResetUntil = 0;
    clearTimeout(pendingResetTimer);
    pendingResetTimer = 0;
  }

  function armPendingReset() {
    clearPendingRestart();
    clearPendingLeave();
    clearPendingSpend();
    pendingResetUntil = Date.now() + PENDING_RESET_MS;
    clearTimeout(pendingResetTimer);
    pendingResetTimer = setTimeout(function () {
      clearPendingReset();
    }, PENDING_RESET_MS + 30);
  }

  /**
   * Two-tap confirm before wiping meta progress + run draft.
   * Toast only — no soft-arm CSS. Keeps Sound / Haptics / Color assist.
   */
  function confirmResetProgressThen(proceedFn) {
    const now = Date.now();
    if (!(pendingResetUntil > 0 && now <= pendingResetUntil)) {
      armPendingReset();
      toast('Tap again to reset all progress');
      try { SFX.tap(); } catch (_) { /* ignore */ }
      try { haptic('select'); } catch (_) { /* ignore */ }
      trackEvent('progress_reset_confirm_arm', {
        coins: save.coins || 0,
        max_unlocked: save.maxUnlocked || 0,
        streak: save.streak || 0,
      });
      return;
    }
    clearPendingReset();
    proceedFn();
  }

  function doResetProgress() {
    pouring = false;
    const keepSfx = save.sfxOn !== false;
    const keepHap = save.hapticsOn !== false;
    const keepCa = save.colorAssist === true;

    clearRunDraft();
    try { localStorage.removeItem(STORAGE_BAK_KEY); } catch (_) { /* ignore */ }
    try { localStorage.removeItem(LEGACY_PROGRESS_KEY); } catch (_) { /* ignore */ }

    save = defaultSave();
    save.sfxOn = keepSfx;
    save.hapticsOn = keepHap;
    save.colorAssist = keepCa;
    persist();

    clearPendingUncap();
    clearPendingRestart();
    clearPendingLeave();
    clearPendingSpend();
    clearPendingReset();
    selected = -1;
    history = [];
    moves = 0;
    undosUsed = 0;
    infiniteUndoLevel = false;
    restartFailCount = 0;
    isDailyMode = false;
    dailySeedKey = '';
    levelIndex = 0;
    capacity = 4;
    tubes = [];
    caps = [];

    try { clearShopBuyArm(); } catch (_) { /* ignore */ }
    try { clearThemeUnlockClaim(); } catch (_) { /* ignore */ }
    try { clearHintsPackClaim(); } catch (_) { /* ignore */ }
    try { clearUndoPackClaim(); } catch (_) { /* ignore */ }
    try { clearFailHintArm(); } catch (_) { /* ignore */ }
    try { clearHintPayArm(); } catch (_) { /* ignore */ }
    try { clearWinReplayArm(); } catch (_) { /* ignore */ }
    try { clearLevelsContinueArm(); } catch (_) { /* ignore */ }
    try { clearHudHintArm(); } catch (_) { /* ignore */ }
    try { clearHudUndoArm(); } catch (_) { /* ignore */ }

    // Close modals but keep start screen visible (fresh Home).
    [winOverlay, shopOverlay, hintPaywall, failPrompt, $('#levels-overlay')].forEach(function (el) {
      if (el) el.classList.remove('show');
    });
    if (startScreen) startScreen.classList.add('show');
    overlayFocusDepth = 0;
    overlayFocusReturn = null;

    document.body.setAttribute('data-theme', 'classic');
    refreshShopButtons();
    if (typeof refreshDailyCta === 'function') refreshDailyCta();
    if (typeof refreshStartPlayCta === 'function') refreshStartPlayCta();
    refreshHud();
    updateChrome();
    render();
    toast('Progress reset');
    trackEvent('progress_reset', {});
    try { SFX.tap(); } catch (_) { /* ignore */ }
  }

  function draftHasProgress(draft) {
    if (!draft || typeof draft !== 'object') return false;
    const mv = Math.floor(Number(draft.moves) || 0);
    const histLen = Array.isArray(draft.history) ? draft.history.length : 0;
    return mv > 0 || histLen > 0;
  }

  function activeOrStoredProgressDraft() {
    if (isRunActive() && (moves > 0 || history.length > 0)) {
      return buildRunDraft();
    }
    const stored = readRunDraft();
    if (stored && draftHasProgress(stored)) return stored;
    return null;
  }

  function draftMatchesTarget(draft, idx, opts) {
    opts = opts || {};
    if (!draft || typeof draft !== 'object') return false;
    const wantDaily = !!opts.daily;
    if (!!draft.daily !== wantDaily) return false;
    if (wantDaily) {
      const key = opts.dailyKey || todayStr();
      if (typeof draft.dailyKey !== 'string' || draft.dailyKey !== key) return false;
    } else {
      const li = Math.floor(Number(draft.levelIndex));
      if (!Number.isFinite(li) || li !== idx) return false;
    }
    return true;
  }

  function leaveRunLabel(draft) {
    if (!draft) return 'run';
    if (draft.daily) return 'Daily';
    const li = Math.floor(Number(draft.levelIndex));
    if (Number.isFinite(li) && li >= 0) return 'Level ' + (li + 1);
    return 'run';
  }

  function leaveTargetKey(idx, opts) {
    opts = opts || {};
    if (opts.daily) {
      return 'daily:' + (opts.dailyKey || todayStr());
    }
    return 'main:' + idx;
  }

  /**
   * Two-tap confirm before abandoning a mid-level progress draft for a different target.
   * Empty / no-progress draft and same-target resume: one tap (no confirm).
   */
  function confirmLeaveRunThen(idx, opts, proceedFn) {
    opts = opts || {};
    const draft = activeOrStoredProgressDraft();
    const targetKey = leaveTargetKey(idx, opts);
    if (!draft || draftMatchesTarget(draft, idx, opts)) {
      clearPendingLeave();
      proceedFn();
      return;
    }
    const now = Date.now();
    const armed =
      pendingLeaveUntil > 0 &&
      now <= pendingLeaveUntil &&
      pendingLeaveKey === targetKey;
    if (!armed) {
      clearPendingRestart();
      armPendingLeave(targetKey);
      const label = leaveRunLabel(draft);
      toast('Tap again to leave ' + label);
      try { SFX.tap(); } catch (_) { /* ignore */ }
      try { haptic('select'); } catch (_) { /* ignore */ }
      trackEvent('leave_run_confirm_arm', {
        from_label: label,
        from_daily: !!draft.daily,
        from_level: draft.daily ? 0 : (Math.floor(Number(draft.levelIndex)) + 1),
        from_moves: Math.floor(Number(draft.moves) || 0),
        to_key: targetKey,
        to_daily: !!opts.daily,
        to_level: opts.daily ? 0 : (idx + 1),
      });
      return;
    }
    clearPendingLeave();
    proceedFn();
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
    clearPendingLeave();

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
    persistRunDraft();
    const firstUncapOfLevel = !levelFirstUncapDone;
    if (firstUncapOfLevel) levelFirstUncapDone = true;
    SFX.uncap();
    haptic(firstUncapOfLevel ? 'firstUncap' : 'uncap');
    const el = tubesWrap.children[idx];
    if (el) {
      el.classList.add('uncapping');
      if (firstUncapOfLevel) {
        el.classList.remove('first-uncap-glow');
        void el.offsetWidth;
        el.classList.add('first-uncap-glow');
        setTimeout(() => el.classList.remove('first-uncap-glow'), 420);
        // Denser sparks (~20); skip burst under reduced-motion (static glow via CSS)
        if (!prefersReducedMotion()) spawnUncapBurst(el, 20);
      } else {
        spawnUncapBurst(el);
      }
      setTimeout(() => {
        render();
      }, 400);
    } else {
      render();
    }
    toast('Lid opened');
    setTimeout(maybeNotifyStuck, 420);
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

  function spawnUncapBurst(tubeEl, count) {
    if (!tubeEl) return;
    const n = (typeof count === 'number' && count > 0) ? count : 10;
    const rect = tubeEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top - appRect.top + 4;
    for (let i = 0; i < n; i++) {
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

    clearPendingRestart();
    clearPendingLeave();
    pouring = true;
    const color = topColor(tubes[fromIdx]);
    const wasCompleteBefore = tubes.map(isFilledComplete);
    const firstPourOfLevel = moves === 0;
    // Anticipatory juice: dest will become filled-complete after this pour
    const destPreview = tubes[toIdx].concat(Array(amount).fill(color));
    const willComplete = !wasCompleteBefore[toIdx] && isFilledComplete(destPreview);
    // Level-clearing pour: simulate so isWon() would be true after this pour
    const winPreview = cloneTubes(tubes);
    for (let i = 0; i < amount; i++) {
      winPreview[toIdx].push(winPreview[fromIdx].pop());
    }
    const willWinLevel = winPreview.every(isTubeComplete);

    animatePour(fromIdx, toIdx, color, amount, () => {
      for (let i = 0; i < amount; i++) {
        tubes[toIdx].push(tubes[fromIdx].pop());
      }
      moves++;
      selected = -1;
      pouring = false;
      if (isWon()) clearRunDraft();
      else persistRunDraft();
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
      } else {
        // Soft toast only — no soft-arm / HUD pulse (matrix already dense)
        setTimeout(maybeNotifyStuck, 160);
      }
    }, firstPourOfLevel, willComplete, willWinLevel);
  }

  function undo() {
    if (pouring || !history.length) return;
    clearPendingRestart();
    clearPendingLeave();
    clearHudUndoArm();
    const prev = history.pop();
    tubes = prev.tubes;
    caps = prev.caps ? cloneCaps(prev.caps) : hydrateCaps({}, tubes.length);
    moves = prev.moves;
    selected = -1;
    clearPendingUncap();
    if (!infiniteUndoLevel) undosUsed++;
    persistRunDraft();
    updateChrome();
    render();
    SFX.tap();
    haptic('undo');
    maybeNotifyStuck();
  }

  function restart() {
    if (pouring) return;
    // Mid-level progress: require a second tap within ~2s (toast only — no soft-arm).
    // Empty board (moves===0 && no history): one-tap so fail-loop mash stays snappy.
    const hasProgress = moves > 0 || history.length > 0;
    if (hasProgress) {
      const now = Date.now();
      if (!(pendingRestartUntil > 0 && now <= pendingRestartUntil)) {
        armPendingRestart();
        toast('Tap Restart again to confirm');
        try { SFX.tap(); } catch (_) { /* ignore */ }
        try { haptic('select'); } catch (_) { /* ignore */ }
        trackEvent('restart_confirm_arm', {
          level_id: analyticsLevelId(),
          mode: analyticsMode(),
          moves: moves,
        });
        return;
      }
    }
    clearPendingRestart();
    clearPendingLeave();
    restartFailCount++;
    if (restartFailCount >= failLoopThreshold()) {
      pendingFailRestart = true;
      showFailPrompt();
      return;
    }
    doRestartLevel();
  }

  function doRestartLevel() {
    // Restart within level: discard mid-board draft, then cold-load fresh.
    clearPendingRestart();
    clearPendingLeave();
    clearRunDraft();
    if (isDailyMode) {
      loadLevel(levelIndex, { daily: true, dailyKey: dailySeedKey, def: getDailyDef() });
    } else {
      loadLevel(levelIndex);
    }
  }

  function nextLevel() {
    clearRunDraft();
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
    clearHudHintArm();
    clearHudUndoArm();
    if (spendFreeHint()) {
      lastHintSource = 'free';
      applyHint();
      return;
    }
    clearHintPayArm();
    const coinsBtn = $('#btn-hint-coins');
    const adBtn = $('#btn-hint-ad');
    // Prefer coins when affordable; else arm rewarded ad. Never arm pack as primary.
    if ((save.coins || 0) >= HINT_COIN_COST) {
      if (coinsBtn) coinsBtn.classList.add('hint-pay-arm');
    } else {
      if (adBtn) adBtn.classList.add('hint-pay-arm');
    }
    const modal = hintPaywall && hintPaywall.querySelector('.modal');
    if (modal) modal.classList.add('hint-pay-recover');
    openOverlay(hintPaywall);
    // Once-per-open soft arm cue — guides eyes to best recovery CTA
    hintPayArmTimer = setTimeout(function () {
      hintPayArmTimer = 0;
      if (!hintPaywall || !hintPaywall.classList.contains('show')) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
  }

  function applyHint() {
    const move = findHintMove();
    if (!move) {
      toast('No clear hint right now');
      return false;
    }
    clearHudHintArm();
    clearHudUndoArm();
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
        setTimeout(function () { spawnHintBurst(el); }, 40);
        setTimeout(() => render(), 1100);
      }
      haptic('hint');
      playSfx('tap', 0.35);
      toast('Hint: double-tap to uncap (free move)');
      return true;
    }
    selected = move.from;
    render();
    const el = tubesWrap.children[move.to];
    if (el) {
      el.classList.add('hint-dest');
      setTimeout(function () { spawnHintBurst(el); }, 40);
      setTimeout(() => {
        if (selected === move.from) render();
      }, 1100);
    }
    haptic('hint');
    playSfx('tap', 0.35);
    toast('Hint: pour into the highlighted tube');
    return true;
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

  /** LCG step — shared by daily remix helpers (deterministic per calendar day). */
  function dailyNextSeed(s) {
    return (Math.imul(s >>> 0, 1664525) + 1013904223) >>> 0;
  }

  /** Seeded Fisher–Yates; returns { arr, seed }. */
  function dailySeededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    for (let i = a.length - 1; i > 0; i--) {
      s = dailyNextSeed(s);
      const j = s % (i + 1);
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return { arr: a, seed: s };
  }

  /**
   * Date-seeded color remap — preserves color multiset (solvability) but changes
   * the board vs the mainline source level so Daily is not a skin.
   */
  function permuteDailyColors(tubes, seed) {
    const ids = [];
    const seen = Object.create(null);
    for (let t = 0; t < tubes.length; t++) {
      const tube = tubes[t] || [];
      for (let i = 0; i < tube.length; i++) {
        const c = tube[i];
        if (c && !seen[c]) {
          seen[c] = true;
          ids.push(c);
        }
      }
    }
    ids.sort(function (a, b) { return a - b; });
    if (ids.length < 2) {
      return { tubes: cloneTubes(tubes), seed: seed >>> 0 };
    }
    const sh = dailySeededShuffle(ids, seed);
    const map = Object.create(null);
    for (let i = 0; i < ids.length; i++) map[ids[i]] = sh.arr[i];
    // Avoid rare identity permutation — force a rotation so Daily always differs
    let identity = true;
    for (let i = 0; i < ids.length; i++) {
      if (map[ids[i]] !== ids[i]) { identity = false; break; }
    }
    if (identity) {
      for (let i = 0; i < ids.length; i++) {
        map[ids[i]] = ids[(i + 1) % ids.length];
      }
    }
    const out = [];
    for (let t = 0; t < tubes.length; t++) {
      const tube = tubes[t] || [];
      const row = [];
      for (let i = 0; i < tube.length; i++) {
        const c = tube[i];
        row.push(c ? map[c] : c);
      }
      out.push(row);
    }
    return { tubes: out, seed: sh.seed };
  }

  /**
   * Date-seeded tube+cap reorder — same puzzle topology, different spatial layout
   * than mainline (bijection; solvability unchanged).
   */
  function shuffleDailyLayout(tubes, capsIn, seed) {
    const n = tubes.length;
    const caps = cloneCaps(capsIn || []);
    while (caps.length < n) caps.push(false);
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    if (n < 2) {
      return { tubes: cloneTubes(tubes), caps: caps.slice(0, n), seed: seed >>> 0 };
    }
    const sh = dailySeededShuffle(idx, seed);
    let identity = true;
    for (let i = 0; i < n; i++) {
      if (sh.arr[i] !== i) { identity = false; break; }
    }
    const order = identity
      ? idx.map(function (_, i) { return (i + 1) % n; })
      : sh.arr;
    const newTubes = [];
    const newCaps = [];
    for (let i = 0; i < n; i++) {
      const j = order[i];
      newTubes.push((tubes[j] || []).slice());
      newCaps.push(!!caps[j]);
    }
    return { tubes: newTubes, caps: newCaps, seed: sh.seed };
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
    const sh = dailySeededShuffle(candidates, seed);
    const shuffled = sh.arr;
    for (let k = 0; k < shuffled.length && count < minCaps; k++) {
      caps[shuffled[k]] = true;
      count++;
    }
    return caps.slice(0, n);
  }

  /**
   * Daily = progress-scaled base + date-seeded remix (colors + layout) + crowded lids
   * + twist-tier par. Not a mainline skin: board must differ from source level.
   */
  function getDailyDef() {
    const key = todayStr();
    const seed = dateSeed(key);
    const TWISTS = ['Crowded', 'Remixed', 'Pressure'];
    const twist = TWISTS[seed % 3];
    const parMul = twist === 'Pressure' ? 1.25 : twist === 'Remixed' ? 1.2 : 1.15;
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
    let tubes = cloneTubes(base.tubes);
    let caps = cloneCaps(base.caps || []);
    while (caps.length < tubes.length) caps.push(false);

    // 1) Color remix (solvability-preserving)
    const colorStep = permuteDailyColors(tubes, seed ^ 0x9e3779b9);
    tubes = colorStep.tubes;
    // 2) Layout scramble (tube+cap bijection)
    const layoutStep = shuffleDailyLayout(tubes, caps, colorStep.seed ^ 0x85ebca6b);
    tubes = layoutStep.tubes;
    caps = layoutStep.caps;
    // 3) Crowded lids — Pressure pushes toward 4 when board is wide enough
    let minCaps = 3;
    if (twist === 'Pressure' && tubes.length >= 7) minCaps = 4;
    else if (twist === 'Crowded') minCaps = 3;
    caps = ensureDailyCrowdedCaps(tubes, caps, layoutStep.seed, minCaps);

    const modules = base.modules ? base.modules.slice() : [];
    if (caps.some(Boolean) && modules.indexOf('cap') < 0) modules.push('cap');
    const basePar = estimatePar({ capacity: base.capacity, tubes: base.tubes });
    return {
      capacity: base.capacity,
      tubes: tubes,
      caps: caps,
      modules: modules.length ? modules : ['cap'],
      par: Math.ceil(basePar * parMul),
      _dailyIndex: idx,
      _dailyMinCaps: minCaps,
      _dailyTwist: twist,
      _dailyKey: key,
    };
  }

  function startDailyChallenge() {
    if (pouring) return;
    const key = todayStr();
    if (save.dailyDoneDate === key) {
      toast('Daily already done! Streak ' + (save.streak || 0) + ' days');
    }
    confirmLeaveRunThen(0, { daily: true, dailyKey: key }, function () {
      hideAllOverlays();
      const def = getDailyDef();
      const resumed = tryResumeOrLoad(0, { daily: true, dailyKey: key, def: def });
      if (!resumed) {
        const twist = (def && def._dailyTwist) ? def._dailyTwist : 'Remix';
        toast('Daily Challenge · ' + twist + '!');
      }
    });
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


  /** Color-vision assist: stable glyph + short token per colorId (1..12). */
  const COLOR_ASSIST_GLYPHS = [
    '', '●', '■', '▲', '◆', '★', '✚', '▬', '○', '▼', '▣', '✦', '⬡',
  ];
  const COLOR_ASSIST_TOKENS = [
    '', 'red', 'blue', 'green', 'yellow', 'purple', 'orange',
    'teal', 'pink', 'brown', 'cyan', 'lime', 'coral',
  ];

  function colorAssistOn() {
    return save.colorAssist === true;
  }

  function colorAssistGlyph(colorId) {
    const id = colorId | 0;
    if (id >= 1 && id < COLOR_ASSIST_GLYPHS.length) return COLOR_ASSIST_GLYPHS[id];
    return '●';
  }

  function colorAssistToken(colorId) {
    const id = colorId | 0;
    if (id >= 1 && id < COLOR_ASSIST_TOKENS.length) return COLOR_ASSIST_TOKENS[id];
    return 'c' + id;
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
      el.tabIndex = 0;
      {
        const layerCount = tube.length;
        const bits = ['Tube ' + (idx + 1)];
        if (layerCount) bits.push(layerCount + (layerCount === 1 ? ' layer' : ' layers'));
        if (colorAssistOn() && layerCount) {
          bits.push(tube.map(colorAssistToken).join('-'));
        }
        if (selected === idx) bits.push('selected');
        if (capped) bits.push('capped');
        else if (pourTarget) bits.push('pour target');
        else if (nearComplete) bits.push('almost complete');
        el.setAttribute('aria-label', bits.join(', '));
      }

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
        if (colorAssistOn()) {
          layer.classList.add('layer-assist');
          layer.dataset.colorId = String(colorId);
          const mark = document.createElement('span');
          mark.className = 'layer-mark';
          mark.setAttribute('aria-hidden', 'true');
          mark.textContent = colorAssistGlyph(colorId);
          layer.appendChild(mark);
        }
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
      el.addEventListener('keydown', (e) => {
        if (pouring) return;
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.key === ' ') e.preventDefault();
          selectTube(idx);
        }
      });
      tubesWrap.appendChild(el);
    });

    btnUndo.disabled = history.length === 0 || pouring;
  }

  function projectedStarGlyphs(n) {
    let s = '';
    for (let i = 1; i <= 3; i++) s += i <= n ? '★' : '☆';
    return s;
  }

  function updateChrome() {
    if (isDailyMode) {
      const d = getDailyDef();
      const twist = (d && d._dailyTwist) ? d._dailyTwist : 'Remix';
      levelLabel.textContent = 'Daily · ' + twist;
      levelLabel.setAttribute('aria-label', 'Daily · ' + twist + ' — open levels');
    } else {
      levelLabel.textContent = `Level ${levelIndex + 1} / ${LEVELS.length}`;
      levelLabel.setAttribute(
        'aria-label',
        'Level ' + (levelIndex + 1) + ' — open levels'
      );
    }
    const def = isDailyMode ? getDailyDef() : LEVELS[levelIndex];
    const par = estimatePar(def);
    const projected = calcStars();
    const trackFloats = Array.prototype.slice.call(
      movesLabel.querySelectorAll('.track-drop-float, .track-recover-float')
    );
    movesLabel.textContent = `Moves ${moves} · Par ${par} · ${projectedStarGlyphs(projected)}`;
    trackFloats.forEach(function (el) { movesLabel.appendChild(el); });
    movesLabel.classList.remove('track-perfect', 'track-good', 'track-ok');
    movesLabel.classList.add(
      projected === 3 ? 'track-perfect' : projected === 2 ? 'track-good' : 'track-ok'
    );
    // Sync undo affordance before recovery soft-arm so #btn-undo.disabled matches history
    btnUndo.disabled = history.length === 0;
    // Soft haptic + visual juice when dropping off 3★ / 2★ track mid-level (re-arms after recover)
    if (
      !starDropHapticFired &&
      lastProjectedStars > projected &&
      ((lastProjectedStars === 3 && projected <= 2) || (lastProjectedStars === 2 && projected === 1))
    ) {
      pulseStarTrackDrop(lastProjectedStars);
      starDropHapticFired = true;
      armHudRecoveryOnStarDrop();
    } else if (
      lastProjectedStars < projected &&
      ((projected === 3 && lastProjectedStars <= 2) || (projected === 2 && lastProjectedStars === 1))
    ) {
      // Undo (or equivalent move budget recover) back onto 3★ / 2★ — invite, not spam
      pulseStarTrackRecover(projected);
      starDropHapticFired = false; // allow another drop warning this level
      clearHudHintArm(); // re-arm allowed on a later drop
      clearHudUndoArm();
    }
    lastProjectedStars = projected;
    updateLevelStarsPreview();
  }

  function updateLevelStarsPreview() {
    const el = $('#level-stars');
    if (!el) return;
    const nowTrack = calcStars();
    if (isDailyMode) {
      el.innerHTML = save.dailyDoneDate === todayStr() ? '★ ★ ★' : '';
      el.title = `Best stars · Now on track for ${nowTrack}★`;
      return;
    }
    const s = save.stars[levelIndex] || 0;
    el.innerHTML = [1, 2, 3]
      .map((i) => `<span class="${i <= s ? '' : 'empty'}">★</span>`)
      .join('');
    el.title = `Best ${s}★ · Now on track for ${nowTrack}★`;
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
  function animatePour(fromIdx, toIdx, color, amount, done, firstPour, willComplete, willWinLevel) {
    const fromEl = tubesWrap.children[fromIdx];
    const toEl = tubesWrap.children[toIdx];
    if (!fromEl || !toEl) {
      done();
      return;
    }

    // A11Y-POUR / POUR-REDUCED: skip stream/tilt/splash; keep SFX + haptic; finish quickly
    if (prefersReducedMotion()) {
      SFX.pour();
      setTimeout(() => {
        SFX.land();
        if (willWinLevel) haptic('winPour');
        else if (willComplete) haptic('landComplete');
        else if (firstPour) haptic('firstPour');
        else haptic('land');
        done();
      }, 60);
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
    // Completing-pour tube glow; winning-pour supersedes with board-wide beat (may layer)
    if (willComplete) toEl.classList.add('completing-pour');
    if (willWinLevel) app.classList.add('winning-pour');
    SFX.pour();

    setTimeout(() => {
      // Winning pour: denser splash (~32) + short gold rim sparkle; else completing ~26 / first 24
      const splashN = willWinLevel ? 32 : (willComplete ? 26 : (firstPour ? 24 : null));
      spawnSplash(endX, endY, hex, splashN);
      if (willWinLevel) spawnWinPourSparkle(endX, endY);
      SFX.land();
      // Winning land: distinct winPour (under full win/perfect); else completing / first / land
      if (willWinLevel) haptic('winPour');
      else if (willComplete) haptic('landComplete');
      else if (firstPour) haptic('firstPour');
      else haptic('land');
      stream.remove();
      fromEl.style.transform = '';
      fromEl.classList.remove('pouring-tilt');
      if (willComplete) toEl.classList.remove('completing-pour');
      if (willWinLevel) app.classList.remove('winning-pour');
      done();
    }, 380);
  }

  /** Short gold rim sparkle for level-clearing pour — tasteful, not confetti (confetti stays in showWin). */
  function spawnWinPourSparkle(x, y) {
    if (prefersReducedMotion()) return;
    const golds = ['#ffd78a', '#ffe6a0', '#ffc850', '#fff0c0'];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'splash-particle win-pour-spark';
      p.style.background = golds[i % golds.length];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const dist = 12 + Math.random() * 22;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 6 + 'px');
      app.appendChild(p);
      setTimeout(() => p.remove(), 420);
    }
  }

  function spawnSplash(x, y, color, count) {
    if (prefersReducedMotion()) return;
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
    clearRunDraft();
    clearPendingRestart();
    clearPendingLeave();
    SFX.win();
    const stars = calcStars();
    lastWinStars = stars;
    // 3★ gets distinct perfect haptic; 1–2★ keep standard win
    haptic(stars === 3 ? 'perfect' : 'win');
    let coins = STAR_REWARDS[stars] || 10;
    let metaBits = [];
    let masteryBonus = 0;
    let chest = null;

    let dailyFirstClear = false;
    let newBestImprove = false;
    let newlyUnlocked = false;
    // Capture frontier BEFORE maxUnlocked write — unlock juice only when advancing
    const prevMax = save.maxUnlocked || 0;
    if (isDailyMode) {
      const key = todayStr();
      if (save.dailyDoneDate !== key) {
        dailyFirstClear = true;
        coins += DAILY_FIRST_CLEAR_BONUS; // first clear bonus — celebrated by #win-daily only
        save.dailyDoneDate = key;
        refreshDailyCta(); // Done state ready if player returns to start
      }
    } else {
      const prev = save.stars[levelIndex] || 0;
      // New-best improve: beat prior stars but NOT first-time 3★ (that uses mastery-claim only)
      newBestImprove = stars > prev && !(stars === 3 && prev < 3);
      if (stars > prev) {
        save.stars[levelIndex] = stars;
        // First-time 3★ mastery bonus (explicit replay reason)
        if (stars === 3 && prev < 3) {
          masteryBonus = FIRST_THREE_STAR_BONUS;
          coins += masteryBonus;
          // Banner #win-mastery is the claim shout — skip metaBits duplicate
          trackEvent('first_three_star', {
            mode: 'main',
            level_id: analyticsLevelId(),
            bonus: masteryBonus,
          });
        }
      } else {
        coins = Math.max(5, Math.floor(coins / 2));
      }
      // Frontier advance unlocks next mainline level (display = levelIndex + 2)
      newlyUnlocked = (levelIndex + 1) > prevMax && (levelIndex + 1) < LEVELS.length;
      save.maxUnlocked = Math.max(save.maxUnlocked || 0, levelIndex + 1);
      if (levelIndex >= (save.level || 0)) save.level = Math.min(levelIndex + 1, LEVELS.length - 1);

      chest = tryClaimChapterChest(levelIndex);
      // coins already added inside tryClaimChapterChest — don't double-count in lastWinCoins path
      // Chest celebration is a dedicated #win-chest beat (not a metaBits text line)
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
        first_clear: !!dailyFirstClear,
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

    openOverlay(winOverlay);
    clearWinReplayArm();
    const winModal = winOverlay.querySelector('.modal-win');
    const winStars = $('#win-stars');
    const winTitle = $('#win-title');
    if (winModal) {
      winModal.classList.toggle('perfect', stars === 3);
      winModal.classList.toggle('chest-claim', !!chest);
      winModal.classList.toggle('mastery-claim', masteryBonus > 0);
      winModal.classList.toggle('new-best-claim', !!newBestImprove);
      winModal.classList.toggle('unlock-claim', !!newlyUnlocked);
      winModal.classList.toggle('daily-claim', !!dailyFirstClear);
    }
    if (winStars) winStars.classList.toggle('perfect', stars === 3);
    // Keep Perfect! / You win!; chest banner underneath is the clearer second beat
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
    const winChest = $('#win-chest');
    if (winChest) {
      if (chest) {
        winChest.hidden = false;
        const hintLabel = chest.hints === 1 ? 'hint' : 'hints';
        winChest.textContent =
          'Chapter ' + chest.chapter + ' chest unlocked! +' + chest.coins + ' coins +' + chest.hints + ' ' + hintLabel;
        // Second haptic beat after win/perfect so chest reads as its own claim
        setTimeout(function () { haptic('chest'); }, 220);
        setTimeout(function () { spawnChestBurst(winChest); }, 180);
      } else {
        winChest.hidden = true;
        winChest.textContent = '';
      }
    }

    const winMastery = $('#win-mastery');
    if (winMastery) {
      if (masteryBonus > 0) {
        winMastery.hidden = false;
        winMastery.textContent = 'First 3★! +' + masteryBonus + ' coins';
        // Second haptic beat after win/perfect; stagger slightly if chest also fires
        var masteryHapticDelay = chest ? 320 : 220;
        setTimeout(function () { haptic('mastery'); }, masteryHapticDelay);
        setTimeout(function () { spawnMasteryBurst(winMastery); }, chest ? 280 : 180);
      } else {
        winMastery.hidden = true;
        winMastery.textContent = '';
      }
    }

    const winNewBest = $('#win-new-best');
    if (winNewBest) {
      if (newBestImprove) {
        winNewBest.hidden = false;
        winNewBest.textContent = 'New best! ' + stars + '★';
        // Second haptic beat after win; visual/haptic only — no extra coins
        var newBestHapticDelay = chest ? 320 : 220;
        setTimeout(function () { haptic('newBest'); }, newBestHapticDelay);
        setTimeout(function () { spawnNewBestBurst(winNewBest); }, chest ? 280 : 180);
        try { SFX.tap(); } catch (_) {}
      } else {
        winNewBest.hidden = true;
        winNewBest.textContent = '';
      }
    }

    const winUnlock = $('#win-unlock');
    if (winUnlock) {
      if (newlyUnlocked) {
        var unlockLevelNum = levelIndex + 2; // 1-based display for newly unlocked level
        winUnlock.hidden = false;
        winUnlock.textContent = 'Level ' + unlockLevelNum + ' unlocked!';
        // Second haptic beat after win; stagger if chest/mastery also fire (same pattern as new-best)
        var unlockHapticDelay = 220;
        if (chest && masteryBonus > 0) unlockHapticDelay = 420;
        else if (chest || masteryBonus > 0) unlockHapticDelay = 320;
        setTimeout(function () { haptic('unlock'); }, unlockHapticDelay);
        setTimeout(function () { spawnUnlockBurst(winUnlock); }, unlockHapticDelay === 220 ? 180 : unlockHapticDelay - 40);
        try { SFX.tap(); } catch (_) {}
      } else {
        winUnlock.hidden = true;
        winUnlock.textContent = '';
      }
    }

    const winDaily = $('#win-daily');
    if (winDaily) {
      if (dailyFirstClear) {
        winDaily.hidden = false;
        winDaily.textContent = 'Daily first clear! +' + DAILY_FIRST_CLEAR_BONUS + ' coins';
        // Second haptic beat after win/perfect; daily never co-occurs with chest/mastery
        setTimeout(function () { haptic('daily'); }, 220);
        setTimeout(function () { spawnDailyBurst(winDaily); }, 180);
      } else {
        winDaily.hidden = true;
        winDaily.textContent = '';
      }
    }

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
    if (nextBtn) nextBtn.classList.remove('next-unlock-arm');
    if (isDailyMode) nextBtn.textContent = 'Back to main';
    else if (newlyUnlocked && levelIndex < LEVELS.length - 1) {
      nextBtn.textContent = 'Play Level ' + (levelIndex + 2);
      nextBtn.classList.add('next-unlock-arm');
      setTimeout(function () {
        if (nextBtn) nextBtn.classList.remove('next-unlock-arm');
      }, 1200);
    } else nextBtn.textContent = levelIndex < LEVELS.length - 1 ? 'Next' : 'Play again';

    // Mastery CTA: 1-2★ mainline → Replay for 3★; soft-arm when Next is not unlocking
    const restartBtn = $('#btn-win-restart');
    if (restartBtn) {
      if (!isDailyMode && stars < 3) {
        restartBtn.textContent = 'Replay for 3★';
        if (!newlyUnlocked) {
          restartBtn.classList.add('win-replay-arm');
          if (winModal) winModal.classList.add('replay-nudge');
          winReplayArmTimer = setTimeout(function () {
            winReplayArmTimer = 0;
            if (!winOverlay || !winOverlay.classList.contains('show')) return;
            haptic('arm');
            try { SFX.tap(); } catch (_) { /* ignore */ }
          }, 300);
        }
      } else {
        restartBtn.textContent = 'Restart';
      }
    }

    spawnConfetti(stars === 3);
    refreshMetaTeasers();
  }

  function hideWin() {
    closeOverlay(winOverlay);
    const winModal = winOverlay.querySelector('.modal-win');
    const winStars = $('#win-stars');
    const winTitle = $('#win-title');
    const winChest = $('#win-chest');
    const winMastery = $('#win-mastery');
    const winNewBest = $('#win-new-best');
    const winUnlock = $('#win-unlock');
    const winDaily = $('#win-daily');
    const nextBtn = $('#btn-next');
    if (winModal) winModal.classList.remove('perfect', 'chest-claim', 'mastery-claim', 'new-best-claim', 'unlock-claim', 'daily-claim', 'replay-nudge');
    if (winStars) winStars.classList.remove('perfect');
    if (winTitle) winTitle.textContent = 'You win!';
    if (winChest) {
      winChest.hidden = true;
      winChest.textContent = '';
    }
    if (winMastery) {
      winMastery.hidden = true;
      winMastery.textContent = '';
    }
    if (winNewBest) {
      winNewBest.hidden = true;
      winNewBest.textContent = '';
    }
    if (winUnlock) {
      winUnlock.hidden = true;
      winUnlock.textContent = '';
    }
    if (winDaily) {
      winDaily.hidden = true;
      winDaily.textContent = '';
    }
    if (nextBtn) nextBtn.classList.remove('next-unlock-arm');
    document.querySelectorAll('.unlock-spark').forEach(function (el) { el.remove(); });
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  }

  /** Amber/gold coin-like burst on chapter chest claim — distinct from perfect-spark / confetti. */
  function spawnChestBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const ambers = ['#ffb347', '#f7b731', '#ff8c28', '#ffe66d', '#ffd700', '#ffcc66'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'chest-spark';
      const ang = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.3;
      const dist = 24 + Math.random() * 48;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = ambers[i % ambers.length];
      p.style.boxShadow = '0 0 10px ' + ambers[i % ambers.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 60) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 700);
    }
  }

  /** Cool gold/lavender burst on first-time 3★ mastery claim — distinct from chest amber. */
  function spawnMasteryBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const cools = ['#f7b731', '#ffe66d', '#c8aaff', '#ba94ff', '#e8d4ff', '#ffd700', '#d4b8ff'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'mastery-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = cools[i % cools.length];
      p.style.boxShadow = '0 0 10px ' + cools[i % cools.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Sky/cyan burst on daily first-clear claim — distinct from chest amber / mastery gold-lavender. */
  function spawnDailyBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const skies = ['#5ec8ff', '#7dd3fc', '#38bdf8', '#bae6fd', '#22d3ee', '#e0f2fe', '#67e8f9'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'daily-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = skies[i % skies.length];
      p.style.boxShadow = '0 0 10px ' + skies[i % skies.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Mint/emerald burst on new-best star improve — distinct from mastery gold-lavender / daily sky / chest amber. */
  function spawnNewBestBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const mints = ['#34d399', '#6ee7b7', '#10b981', '#a7f3d0', '#2dd4bf', '#5eead4', '#86efac'];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'new-best-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = mints[i % mints.length];
      p.style.boxShadow = '0 0 10px ' + mints[i % mints.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Warm gold/peach burst on new-level unlock — distinct from chest amber / mastery gold-lavender / new-best mint. */
  function spawnUnlockBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const peaches = ['#fbbf24', '#fcd34d', '#fdba74', '#fde68a', '#f59e0b', '#fb923c', '#ffe0a3'];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'unlock-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = peaches[i % peaches.length];
      p.style.boxShadow = '0 0 10px ' + peaches[i % peaches.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Coral/flame burst on login streak milestone claim — distinct from daily sky / chest amber. */
  function spawnStreakBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const flames = ['#ff6b4a', '#ff8c42', '#ffb347', '#ff5e5b', '#ffa07a', '#ffd1a1', '#ff7f50'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'streak-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = flames[i % flames.length];
      p.style.boxShadow = '0 0 10px ' + flames[i % flames.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Violet/magenta burst on theme unlock claim — distinct from streak coral / daily sky. */
  function spawnThemeBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const violets = ['#a78bfa', '#c084fc', '#e879f9', '#f0abfc', '#d8b4fe', '#f5d0fe', '#c4b5fd'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'theme-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = violets[i % violets.length];
      p.style.boxShadow = '0 0 10px ' + violets[i % violets.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Emerald/jade burst on hint-pack purchase — distinct from violet theme / mint board hint. */
  function spawnHintsPackBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const emeralds = ['#34d399', '#10b981', '#2dd4bf', '#6ee7b7', '#a7f3d0', '#5eead4', '#14b8a6'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'hints-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = emeralds[i % emeralds.length];
      p.style.boxShadow = '0 0 10px ' + emeralds[i % emeralds.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

    /** Soft indigo/periwinkle burst on unlimited-undo claim — distinct from emerald hints / violet theme. */
  function spawnUndoPackBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height / 2 - appRect.top;
    const indigos = ['#818cf8', '#6366f1', '#a5b4fc', '#c7d2fe', '#7c3aed', '#93c5fd', '#60a5fa'];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'undo-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.28;
      const dist = 20 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = indigos[i % indigos.length];
      p.style.boxShadow = '0 0 10px ' + indigos[i % indigos.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 10 + 'px');
      p.style.animationDelay = (Math.random() * 50) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 650);
    }
  }

  /** Soft mint/lime burst on hint reveal — distinct from gold pour / violet theme. */
  function spawnHintBurst(anchorEl) {
    if (!anchorEl || prefersReducedMotion()) return;
    const rect = anchorEl.getBoundingClientRect();
    const appRect = app.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - appRect.left;
    const cy = rect.top + rect.height * 0.28 - appRect.top;
    const mints = ['#86efac', '#4ade80', '#a3e635', '#bef264', '#bbf7d0', '#d9f99d', '#6ee7b7'];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'hint-spark';
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.3;
      const dist = 16 + Math.random() * 32;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = mints[i % mints.length];
      p.style.boxShadow = '0 0 9px ' + mints[i % mints.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 8 + 'px');
      p.style.animationDelay = (Math.random() * 40) + 'ms';
      app.appendChild(p);
      setTimeout(function () { p.remove(); }, 620);
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
  function clearLevelsContinueArm() {
    if (levelsContinueArmTimer) {
      clearTimeout(levelsContinueArmTimer);
      levelsContinueArmTimer = 0;
    }
  }

  function continueLevelIndex(maxU) {
    // Prefer current mainline level when unlocked; else frontier.
    if (!isDailyMode && typeof levelIndex === 'number' && levelIndex >= 0 && levelIndex <= maxU) {
      return levelIndex;
    }
    return Math.min(Math.max(maxU, 0), LEVELS.length - 1);
  }

  /** In-play HUD: level badge → Levels (gated like other mid-play HUD actions). */
  function tryOpenLevelsFromHud() {
    if (pouring) return;
    if (playfieldOverlayBlocking()) return;
    openLevels();
  }

  /**
   * Return to start screen without wiping meta save OR mid-level run draft.
   * Home acts as pause: flush draft so Continue / Play Level N / Daily can resume
   * via tryResumeOrLoad. Restart / win / cold load still clearRunDraft.
   * Clears mid-play selection / pending uncap; refreshes start CTAs + HUD.
   */
  function goHome() {
    if (pouring) return;
    // Flush before showing start screen (isRunActive() becomes false once shown).
    if (isRunActive()) persistRunDraft();
    clearPendingUncap();
    clearPendingRestart();
    clearPendingLeave();
    clearPendingReset();
    selected = -1;
    const levelsOv = $('#levels-overlay');
    if (levelsOv && levelsOv.classList.contains('show')) closeLevels();
    if (startScreen) startScreen.classList.add('show');
    if (typeof refreshDailyCta === 'function') refreshDailyCta();
    if (typeof refreshStartPlayCta === 'function') refreshStartPlayCta();
    refreshHud();
    updateChrome();
    render();
  }

  /**
   * System / hardware / browser back — dismiss top overlay, else pause to Home
   * (keeps mid-level draft). Returns true if consumed (do not exit app).
   * No soft-arm CSS. Win back → Home (run already cleared on clear).
   */
  let backGuardArmed = false;
  function armBackGuard() {
    if (backGuardArmed) return;
    try {
      history.pushState({ ctsBack: 1 }, '');
      backGuardArmed = true;
    } catch (_) { /* ignore private-mode / file:// */ }
  }

  function handleSystemBack() {
    const levelsOv = $('#levels-overlay');
    if (levelsOv && levelsOv.classList.contains('show')) {
      closeLevels();
      return true;
    }
    if (hintPaywall && hintPaywall.classList.contains('show')) {
      closeOverlay(hintPaywall);
      return true;
    }
    if (shopOverlay && shopOverlay.classList.contains('show')) {
      closeOverlay(shopOverlay);
      return true;
    }
    if (failPrompt && failPrompt.classList.contains('show')) {
      closeOverlay(failPrompt);
      return true;
    }
    if (winOverlay && winOverlay.classList.contains('show')) {
      hideWin();
      goHome();
      return true;
    }
    // Playing board (not start)
    if (startScreen && !startScreen.classList.contains('show')) {
      if (pouring) return true;
      if (selected >= 0 || pendingUncapIdx >= 0) {
        selected = -1;
        clearPendingUncap();
        render();
        return true;
      }
      goHome();
      return true;
    }
    // Start screen — allow exit / leave page
    return false;
  }

  function onSystemBackPopState() {
    backGuardArmed = false;
    if (handleSystemBack()) {
      armBackGuard();
    }
  }

  function bindSystemBack() {
    window.addEventListener('popstate', onSystemBackPopState);
    // Optional Capacitor App plugin (if present after cap sync) — same dismiss chain
    try {
      const cap = typeof Capacitor !== 'undefined' ? Capacitor : null;
      const plugins = (cap && cap.Plugins) || {};
      const App = plugins.App || (typeof CapApp !== 'undefined' ? CapApp : null);
      if (App && typeof App.addListener === 'function') {
        App.addListener('backButton', function () {
          if (handleSystemBack()) {
            armBackGuard();
            return;
          }
          if (typeof App.exitApp === 'function') {
            try { App.exitApp(); } catch (_) { /* ignore */ }
          }
        });
      }
    } catch (_) { /* web / stub */ }
    armBackGuard();
  }

  function openLevels() {
    clearLevelsContinueArm();
    // Default browse chapter to Continue / frontier so mastery path stays one tap away
    const maxU = Math.max(save.maxUnlocked || 0, 0);
    setLevelsViewChapter(chapterOfIndex(continueLevelIndex(maxU)));
    renderLevelsGrid();
    openOverlay($('#levels-overlay'));
    // Scroll Continue / star-gap (else first cell) into view after overlay shown
    requestAnimationFrame(function () {
      const arm =
        $('.level-continue-arm') ||
        $('.level-star-gap-arm') ||
        $('#levels-grid .level-cell');
      if (!arm || typeof arm.scrollIntoView !== 'function') return;
      arm.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
    // Once-per-open soft arm — guides eyes to Continue cell
    levelsContinueArmTimer = setTimeout(function () {
      levelsContinueArmTimer = 0;
      const ov = $('#levels-overlay');
      if (!ov || !ov.classList.contains('show')) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
  }

  function shiftLevelsChapter(delta, focusMode) {
    const mode = focusMode || 'primary';
    const cur = levelsViewChapter != null ? levelsViewChapter : focusChapter();
    const next = clampLevelsViewChapter(cur + delta);
    if (next === cur) return;
    setLevelsViewChapter(next);
    clearLevelsContinueArm();
    renderLevelsGrid();
    requestAnimationFrame(function () {
      const scrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
      if (mode === 'first' || mode === 'last') {
        const unlocked = Array.prototype.slice.call(
          document.querySelectorAll('#levels-grid .level-cell:not([disabled])')
        );
        const target = mode === 'first' ? unlocked[0] : unlocked[unlocked.length - 1];
        if (target) {
          if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({
              block: 'nearest',
              inline: 'nearest',
              behavior: scrollBehavior,
            });
          }
          safeFocus(target);
        }
        return;
      }
      const arm =
        $('.level-continue-arm') ||
        $('.level-star-gap-arm') ||
        $('#levels-grid .level-cell');
      if (arm && typeof arm.scrollIntoView === 'function') {
        arm.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: scrollBehavior,
        });
      }
      const ov = $('#levels-overlay');
      if (ov && ov.classList.contains('show')) focusOverlayPrimary(ov);
    });
  }


  /** In-play tube board Arrow/Home/End focus nav (flex-wrap geometric neighbors). No soft-arm. */
  function handleTubesBoardKeydown(e) {
    if (pouring) return;
    if (startScreen && startScreen.classList.contains('show')) return;
    const blocking = [
      winOverlay,
      shopOverlay,
      hintPaywall,
      failPrompt,
      $('#levels-overlay'),
    ];
    for (let i = 0; i < blocking.length; i++) {
      if (blocking[i] && blocking[i].classList.contains('show')) return;
    }
    const wrap = tubesWrap;
    if (!wrap || !wrap.contains(e.target)) return;
    const tube =
      e.target && e.target.closest ? e.target.closest('.tube') : null;
    if (!tube || !wrap.contains(tube)) return;
    const key = e.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    e.preventDefault();
    const list = Array.prototype.slice.call(wrap.querySelectorAll('.tube'));
    if (!list.length) return;
    if (key === 'Home') {
      safeFocus(list[0]);
      return;
    }
    if (key === 'End') {
      safeFocus(list[list.length - 1]);
      return;
    }
    const cur = tube.getBoundingClientRect();
    const cx = cur.left + cur.width / 2;
    const cy = cur.top + cur.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (t === tube) continue;
      const r = t.getBoundingClientRect();
      const tx = r.left + r.width / 2;
      const ty = r.top + r.height / 2;
      const dx = tx - cx;
      const dy = ty - cy;
      let ok = false;
      let primary = 0;
      let secondary = 0;
      if (key === 'ArrowLeft') {
        ok = dx < -2;
        primary = -dx;
        secondary = Math.abs(dy);
      } else if (key === 'ArrowRight') {
        ok = dx > 2;
        primary = dx;
        secondary = Math.abs(dy);
      } else if (key === 'ArrowUp') {
        ok = dy < -2;
        primary = -dy;
        secondary = Math.abs(dx);
      } else if (key === 'ArrowDown') {
        ok = dy > 2;
        primary = dy;
        secondary = Math.abs(dx);
      }
      if (!ok) continue;
      const score = primary + secondary * 3;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (best) safeFocus(best);
  }

  /** In-play HUD keyboard: u/U Undo, h/H Hint, r/R Restart, l/L Levels, s/S Shop. No soft-arm. */
  function handleHudKeys(e) {
    const t = e.target;
    if (t) {
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (t.isContentEditable) return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (pouring) return;
    if (playfieldOverlayBlocking()) return;
    const key = e.key;
    if (key === 'u' || key === 'U') {
      if (!history.length) return;
      e.preventDefault();
      undo();
      return;
    }
    if (key === 'h' || key === 'H') {
      e.preventDefault();
      requestHint();
      return;
    }
    if (key === 'r' || key === 'R') {
      e.preventDefault();
      restart();
      return;
    }
    if (key === 'l' || key === 'L') {
      e.preventDefault();
      tryOpenLevelsFromHud();
      return;
    }
    if (key === 's' || key === 'S') {
      e.preventDefault();
      openShop();
      return;
    }
  }

  /** Win/Fail overlay keys: Next/restart/Home on win; hint + b Home on fail. Escape left alone. */
  function handleWinFailKeys(e) {
    const t = e.target;
    if (t) {
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return false;
      if (t.isContentEditable) return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;

    const winShow = winOverlay && winOverlay.classList.contains('show');
    const failShow = failPrompt && failPrompt.classList.contains('show');
    if (!winShow && !failShow) return false;

    const key = e.key;

    if (winShow) {
      if (key === 'Enter' || key === 'n' || key === 'N') {
        const nextBtn = $('#btn-next');
        if (!nextBtn || nextBtn.disabled || nextBtn.hidden) return false;
        e.preventDefault();
        nextLevel();
        return true;
      }
      if (key === 'r' || key === 'R') {
        const restartBtn = $('#btn-win-restart');
        if (!restartBtn || restartBtn.disabled || restartBtn.hidden) return false;
        e.preventDefault();
        hideWin();
        doRestartLevel();
        return true;
      }
      if (key === 'h' || key === 'H') {
        const homeBtn = $('#btn-win-home');
        if (!homeBtn || homeBtn.disabled || homeBtn.hidden) return false;
        e.preventDefault();
        hideWin();
        goHome();
        return true;
      }
      return false;
    }

    if (failShow) {
      if (key === 'Enter' || key === 'h' || key === 'H') {
        const hintBtn = $('#btn-fail-hint');
        if (!hintBtn || hintBtn.disabled || hintBtn.hidden) return false;
        e.preventDefault();
        hintBtn.click();
        return true;
      }
      if (key === 'b' || key === 'B') {
        const homeBtn = $('#btn-fail-home');
        if (!homeBtn || homeBtn.disabled || homeBtn.hidden) return false;
        e.preventDefault();
        homeBtn.click();
        return true;
      }
      return false;
    }

    return false;
  }

  /** Start-screen keys: Enter Play, d/D Daily, s/S Shop. Only when start shows and no modal. */
  function handleStartKeys(e) {
    const t = e.target;
    if (t) {
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return false;
      if (t.isContentEditable) return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!startScreen || !startScreen.classList.contains('show')) return false;
    const levelsOv = $('#levels-overlay');
    if (levelsOv && levelsOv.classList.contains('show')) return false;
    if (hintPaywall && hintPaywall.classList.contains('show')) return false;
    if (shopOverlay && shopOverlay.classList.contains('show')) return false;
    if (failPrompt && failPrompt.classList.contains('show')) return false;
    if (winOverlay && winOverlay.classList.contains('show')) return false;

    const key = e.key;
    if (key === 'Enter') {
      const btn = $('#btn-start');
      if (!btn || btn.disabled || btn.hidden) return false;
      e.preventDefault();
      btn.click();
      return true;
    }
    if (key === 'd' || key === 'D') {
      const btn = $('#btn-start-daily');
      if (!btn || btn.disabled || btn.hidden) return false;
      e.preventDefault();
      btn.click();
      return true;
    }
    if (key === 's' || key === 'S') {
      e.preventDefault();
      openShop();
      return true;
    }
    if (key === 'l' || key === 'L') {
      const btn = $('#btn-start-levels');
      if (!btn || btn.disabled || btn.hidden) return false;
      e.preventDefault();
      btn.click();
      return true;
    }
    return false;
  }

  /** Hint-paywall keys: Enter primary CTA (arm → coins → ad). Never pack. Escape left alone. */
  function handleHintPaywallKeys(e) {
    const t = e.target;
    if (t) {
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return false;
      if (t.isContentEditable) return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!hintPaywall || !hintPaywall.classList.contains('show')) return false;
    if (e.key !== 'Enter') return false;

    const arm = hintPaywall.querySelector('.hint-pay-arm');
    let target = null;
    if (arm && !arm.disabled && !arm.hidden) {
      target = arm;
    } else {
      const coinsBtn = $('#btn-hint-coins');
      if (coinsBtn && !coinsBtn.disabled && !coinsBtn.hidden) {
        target = coinsBtn;
      } else {
        const adBtn = $('#btn-hint-ad');
        if (adBtn && !adBtn.disabled && !adBtn.hidden) target = adBtn;
      }
    }
    if (!target) return false;
    e.preventDefault();
    target.click();
    return true;
  }

  /** Shop keys: Enter armed buy CTA. Escape left alone. SHOP-SPEND-CONFIRM via click path. */
  function handleShopKeys(e) {
    const t = e.target;
    if (t) {
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return false;
      if (t.isContentEditable) return false;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!shopOverlay || !shopOverlay.classList.contains('show')) return false;
    if (e.key !== 'Enter') return false;

    const arm = shopOverlay.querySelector('.shop-buy-arm');
    if (!arm || arm.disabled || arm.hidden) return false;
    const style = window.getComputedStyle(arm);
    if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
    const rects = arm.getClientRects();
    if (!rects || !rects.length) return false;
    e.preventDefault();
    arm.click();
    return true;
  }

  /** Levels grid arrow / Home / End nav; chapter-edge Left/Right shifts chapter. */
  function handleLevelsGridKeydown(e) {
    const ov = $('#levels-overlay');
    if (!ov || !ov.classList.contains('show')) return;
    const grid = $('#levels-grid');
    if (!grid || !grid.contains(e.target)) return;
    const key = e.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }
    e.preventDefault();
    const cells = Array.prototype.slice.call(grid.querySelectorAll('.level-cell'));
    if (!cells.length) return;
    const cell =
      e.target && e.target.closest
        ? e.target.closest('.level-cell')
        : e.target;
    let idx = cell ? cells.indexOf(cell) : -1;
    if (idx < 0) return;
    const last = cells.length - 1;
    const ch = levelsViewChapter != null ? levelsViewChapter : focusChapter();

    if (key === 'ArrowLeft' && idx === 0) {
      if (ch > 1) shiftLevelsChapter(-1, 'last');
      return;
    }
    if (key === 'ArrowRight' && idx === last) {
      if (ch < maxBrowsableChapter()) shiftLevelsChapter(1, 'first');
      return;
    }

    let step = 0;
    let start = idx;
    if (key === 'ArrowLeft') {
      step = -1;
      start = idx - 1;
    } else if (key === 'ArrowRight') {
      step = 1;
      start = idx + 1;
    } else if (key === 'ArrowUp') {
      step = -LEVELS_GRID_COLS;
      start = idx - LEVELS_GRID_COLS;
    } else if (key === 'ArrowDown') {
      step = LEVELS_GRID_COLS;
      start = idx + LEVELS_GRID_COLS;
    } else if (key === 'Home') {
      step = 1;
      start = 0;
    } else if (key === 'End') {
      step = -1;
      start = last;
    }

    let nextIdx = -1;
    for (let i = start; i >= 0 && i < cells.length; i += step) {
      if (!cells[i].disabled) {
        nextIdx = i;
        break;
      }
      if (key === 'Home' || key === 'End') {
        /* keep scanning */
      } else if (step === 0) {
        break;
      }
    }
    if (nextIdx < 0) return;
    const landing = cells[nextIdx];
    if (!landing || landing.disabled) return;
    safeFocus(landing);
    if (typeof landing.scrollIntoView === 'function') {
      landing.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }

  function closeLevels() {
    closeOverlay($('#levels-overlay'));
  }

  function renderLevelsGrid() {
    const grid = $('#levels-grid');
    const teaser = $('#levels-teaser');
    const foot = $('#levels-footnote');
    const chLabel = $('#levels-chapter-label');
    const btnPrev = $('#btn-levels-prev');
    const btnNext = $('#btn-levels-next');
    if (!grid) return;
    ensureMetaSaveArrays();
    const maxU = Math.max(save.maxUnlocked || 0, 0);
    const continueIdx = continueLevelIndex(maxU);
    const ch = setLevelsViewChapter(
      levelsViewChapter != null ? levelsViewChapter : chapterOfIndex(continueIdx)
    );
    const prog = countPerfectInChapter(ch);
    const claimed = save.chapterChestsClaimed.indexOf(ch) >= 0;
    const maxB = maxBrowsableChapter();
    if (chLabel) {
      chLabel.textContent = 'Chapter ' + ch + ' / ' + maxB;
    }
    if (btnPrev) {
      btnPrev.disabled = ch <= 1;
    }
    if (btnNext) {
      btnNext.disabled = ch >= maxB;
    }
    // Viewed-chapter unlocked cells still missing 3★ (never locked / perfect)
    const missingStarIdx = [];
    for (let i = prog.start; i < prog.end; i++) {
      if (i <= maxU && (save.stars[i] || 0) < 3) missingStarIdx.push(i);
    }
    // Exactly one soft-arm: Continue if continue cell is in this chapter and incomplete OR no star gaps;
    // else pull into chapter-chest grind via first missing-★ cell in the viewed chapter.
    const continueInView = continueIdx >= prog.start && continueIdx < prog.end;
    const continueStars = save.stars[continueIdx] || 0;
    const useStarGapArm =
      (!continueInView || continueStars >= 3) && missingStarIdx.length > 0;
    const starGapIdx = useStarGapArm ? missingStarIdx[0] : -1;
    if (teaser) {
      teaser.textContent =
        'First 3★ +' + FIRST_THREE_STAR_BONUS + '🪙 · Chapter ' + ch + ': ' +
        prog.have + '/' + prog.need + ' perfect → +' + CHAPTER_CHEST.coins + '🪙 +' + CHAPTER_CHEST.hints + ' hint' +
        (claimed ? ' (claimed)' : '');
    }
    grid.innerHTML = '';
    // Mid-run draft on an unlocked mainline cell in this chapter (≠ daily) — static "On" mark
    let inProgressIdx = -1;
    const peekDraft = readRunDraft();
    if (peekDraft && draftHasProgress(peekDraft) && !peekDraft.daily) {
      const di = Math.floor(Number(peekDraft.levelIndex));
      if (
        Number.isFinite(di) &&
        di >= prog.start &&
        di < prog.end &&
        di <= maxU
      ) {
        inProgressIdx = di;
      }
    }
    // One chapter at a time (CHAPTER_SIZE cells) — browse earlier packs for ★ mastery
    for (let i = prog.start; i < prog.end; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-cell';
      btn.setAttribute('role', 'listitem');
      const best = save.stars[i] || 0;
      const locked = i > maxU;
      if (locked) btn.classList.add('locked');
      if (best >= 3) btn.classList.add('perfect');
      else if (best > 0) btn.classList.add('partial');
      const isContinueArm = !useStarGapArm && !locked && i === continueIdx;
      const isStarGapArm = useStarGapArm && !locked && i === starGapIdx && best < 3;
      const isInProgress = !locked && i === inProgressIdx;
      let badgeHtml = '';
      if (isContinueArm) {
        btn.classList.add('level-continue-arm');
        btn.setAttribute('aria-label', 'Continue — Level ' + (i + 1));
        badgeHtml = '<span class="level-cell-go" aria-hidden="true">Go</span>';
      } else if (isStarGapArm) {
        btn.classList.add('level-star-gap-arm');
        btn.setAttribute('aria-label', 'Replay for 3★ — Level ' + (i + 1));
        badgeHtml = '<span class="level-cell-star-gap" aria-hidden="true">3★</span>';
      } else if (locked) {
        btn.setAttribute('aria-label', 'Level ' + (i + 1) + ' — locked');
      } else if (best >= 3) {
        btn.setAttribute('aria-label', 'Level ' + (i + 1) + ' — 3 stars');
      } else if (best > 0) {
        btn.setAttribute(
          'aria-label',
          'Level ' + (i + 1) + ' — ' + best + ' of 3 stars, replay for 3★'
        );
      } else {
        btn.setAttribute('aria-label', 'Level ' + (i + 1) + ' — play');
      }
      // Static mid-run marker (may coexist with continue/star-gap arm; never on locked)
      if (isInProgress) {
        btn.classList.add('level-in-progress');
        if (isContinueArm) {
          btn.setAttribute('aria-label', 'Continue — Level ' + (i + 1) + ' — in progress');
        } else if (isStarGapArm) {
          btn.setAttribute(
            'aria-label',
            'Replay for 3★ — Level ' + (i + 1) + ' — in progress'
          );
        } else {
          btn.setAttribute(
            'aria-label',
            'Level ' + (i + 1) + ' — in progress, resume'
          );
        }
        badgeHtml += '<span class="level-cell-on" aria-hidden="true">On</span>';
      }
      const starsHtml = [1, 2, 3]
        .map((s) => '<span class="' + (s <= best ? 'lit' : 'empty') + '" aria-hidden="true">★</span>')
        .join('');
      btn.innerHTML =
        badgeHtml +
        '<span class="level-cell-num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="level-cell-stars" aria-hidden="true">' + starsHtml + '</span>';
      if (!locked) {
        btn.addEventListener('click', () => {
          confirmLeaveRunThen(i, {}, function () {
            closeLevels();
            startScreen.classList.remove('show');
            isDailyMode = false;
            const resumed = tryResumeOrLoad(i);
            if (!resumed && best < 3) {
              toast('Aim for 3★ · first time +' + FIRST_THREE_STAR_BONUS + '🪙');
            }
          });
        });
      } else {
        btn.disabled = true;
        btn.title = 'Locked';
      }
      grid.appendChild(btn);
    }
    if (foot) {
      const missing = missingStarIdx.map((i) => i + 1);
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
  /** Focusable controls inside an overlay (visible + enabled). */
  function overlayFocusables(root) {
    if (!root) return [];
    const sel =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const nodes = Array.prototype.slice.call(root.querySelectorAll(sel));
    return nodes.filter(function (el) {
      if (!el || el.disabled) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (typeof el.tabIndex === 'number' && el.tabIndex < 0) return false;
      const style = window.getComputedStyle(el);
      if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
      const rects = el.getClientRects();
      if (!rects || !rects.length) return false;
      return true;
    });
  }

  /**
   * Trap Tab / Shift+Tab inside the top modal overlay (hint/shop/fail/levels/win).
   * Start screen is not trapped — it is the home surface. No soft-arm CSS.
   */
  function trapOverlayTab(e) {
    if (!e || e.key !== 'Tab') return;
    const ov = topFocusOverlay();
    if (!ov || !ov.classList.contains('show')) return;
    const list = overlayFocusables(ov);
    if (!list.length) {
      e.preventDefault();
      focusOverlayPrimary(ov);
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    const inside = !!(active && ov.contains(active));
    const idx = inside ? list.indexOf(active) : -1;
    if (!inside || idx < 0) {
      e.preventDefault();
      safeFocus(e.shiftKey ? last : first);
      return;
    }
    if (e.shiftKey) {
      if (idx <= 0) {
        e.preventDefault();
        safeFocus(last);
      }
    } else if (idx >= list.length - 1) {
      e.preventDefault();
      safeFocus(first);
    }
  }

  function safeFocus(el) {
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      try { el.focus(); } catch (__) { /* ignore */ }
    }
  }

  function focusOverlayPrimary(el) {
    if (!el || !el.classList.contains('show')) return;
    let target = null;
    const levelsOv = $('#levels-overlay');
    // Levels: land on Continue / star-gap (or first unlocked cell), not Close —
    // pairs with LEVELS-SCROLL so keyboard/SR users hit the actionable cell.
    if (el === levelsOv || (el && el.id === 'levels-overlay')) {
      target =
        el.querySelector('.level-continue-arm') ||
        el.querySelector('.level-star-gap-arm') ||
        el.querySelector('.level-cell:not([disabled])') ||
        el.querySelector('.modal-close');
    } else if (el === winOverlay) {
      const nextBtn = $('#btn-next');
      const restartBtn = $('#btn-win-restart');
      target =
        (nextBtn && nextBtn.classList.contains('next-unlock-arm') && nextBtn) ||
        (restartBtn && restartBtn.classList.contains('win-replay-arm') && restartBtn) ||
        nextBtn ||
        restartBtn ||
        el.querySelector('.modal-close');
    } else if (el === failPrompt) {
      target = $('#btn-fail-hint') || el.querySelector('.modal-close');
    } else if (el === hintPaywall) {
      target =
        el.querySelector('.hint-pay-arm') ||
        $('#btn-hint-coins') ||
        $('#btn-hint-ad') ||
        el.querySelector('.modal-close');
    } else if (el === shopOverlay) {
      target = el.querySelector('.shop-buy-arm') || el.querySelector('.modal-close');
    } else {
      target = el.querySelector('.modal-close');
    }
    if (!target) {
      const modal = el.querySelector('[role="dialog"]') || el.querySelector('.modal') || el;
      target = modal.querySelector('button:not([disabled])');
    }
    safeFocus(target);
  }

  function topFocusOverlay() {
    const order = [hintPaywall, shopOverlay, failPrompt, $('#levels-overlay'), winOverlay];
    for (let i = 0; i < order.length; i++) {
      const o = order[i];
      if (o && o.classList.contains('show')) return o;
    }
    return null;
  }

  function openOverlay(el) {
    if (!el) return;
    const wasOpen = el.classList.contains('show');
    const tracksFocus = el !== startScreen;
    if (!wasOpen && tracksFocus) {
      if (overlayFocusDepth === 0) {
        overlayFocusReturn = document.activeElement;
      }
      overlayFocusDepth++;
      armBackGuard();
    }
    el.classList.add('show');
    // HUD hint arm is mid-play only — clear when any blocking overlay covers the board
    if (
      el === startScreen ||
      el === winOverlay ||
      el === shopOverlay ||
      el === hintPaywall ||
      el === failPrompt ||
      (el && el.id === 'levels-overlay')
    ) {
      clearHudHintArm();
      clearHudUndoArm();
    }
    if (!wasOpen && tracksFocus) {
      requestAnimationFrame(function () {
        focusOverlayPrimary(el);
      });
    }
  }

  function closeOverlay(el) {
    if (!el) return;
    const wasOpen = el.classList.contains('show');
    const tracksFocus = el !== startScreen;
    el.classList.remove('show');
    if (el === shopOverlay) {
      clearThemeUnlockClaim();
      clearHintsPackClaim();
      clearUndoPackClaim();
      clearShopBuyArm();
      clearPendingSpend();
      clearPendingReset();
    }
    if (el === failPrompt) {
      clearFailHintArm();
      restartFailCount = 0;
    }
    if (el === hintPaywall) clearHintPayArm();
    if (el === winOverlay) clearWinReplayArm();
    if (el && el.id === 'levels-overlay') clearLevelsContinueArm();
    if (wasOpen && tracksFocus) {
      overlayFocusDepth = Math.max(0, overlayFocusDepth - 1);
      if (overlayFocusDepth === 0) {
        const ret = overlayFocusReturn;
        overlayFocusReturn = null;
        requestAnimationFrame(function () {
          if (ret && document.contains(ret)) safeFocus(ret);
        });
      } else {
        const top = topFocusOverlay();
        if (top) {
          requestAnimationFrame(function () {
            focusOverlayPrimary(top);
          });
        }
      }
    }
  }

  function hideAllOverlays() {
    [startScreen, winOverlay, shopOverlay, hintPaywall, failPrompt, $('#levels-overlay')].forEach(function (el) {
      if (!el) return;
      el.classList.remove('show');
      if (el === shopOverlay) {
        clearThemeUnlockClaim();
        clearHintsPackClaim();
        clearUndoPackClaim();
        clearShopBuyArm();
        clearPendingSpend();
        clearPendingReset();
      }
      if (el === failPrompt) {
        clearFailHintArm();
        restartFailCount = 0;
      }
      if (el === hintPaywall) clearHintPayArm();
      if (el === winOverlay) clearWinReplayArm();
      if (el.id === 'levels-overlay') clearLevelsContinueArm();
    });
    overlayFocusDepth = 0;
    const ret = overlayFocusReturn;
    overlayFocusReturn = null;
    if (ret && document.contains(ret)) {
      requestAnimationFrame(function () { safeFocus(ret); });
    }
  }

  function openShop() {
    if (pouring) return;
    clearThemeUnlockClaim();
    clearHintsPackClaim();
    clearUndoPackClaim();
    clearShopBuyArm();
    clearPendingReset();
    refreshShopButtons();
    armShopAffordablePrimary();
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


  function refreshSettingsToggles() {
    const sfxBtn = $('#btn-toggle-sfx');
    const hapBtn = $('#btn-toggle-haptics');
    const caBtn = $('#btn-toggle-color-assist');
    const sfxOn = save.sfxOn !== false;
    const hapOn = save.hapticsOn !== false;
    const caOn = save.colorAssist === true;
    if (sfxBtn) {
      sfxBtn.textContent = sfxOn ? 'On' : 'Off';
      sfxBtn.setAttribute('aria-pressed', sfxOn ? 'true' : 'false');
      sfxBtn.classList.toggle('is-off', !sfxOn);
    }
    if (hapBtn) {
      hapBtn.textContent = hapOn ? 'On' : 'Off';
      hapBtn.setAttribute('aria-pressed', hapOn ? 'true' : 'false');
      hapBtn.classList.toggle('is-off', !hapOn);
    }
    if (caBtn) {
      caBtn.textContent = caOn ? 'On' : 'Off';
      caBtn.setAttribute('aria-pressed', caOn ? 'true' : 'false');
      caBtn.classList.toggle('is-off', !caOn);
    }
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

    const undoCoinBtn = $('#btn-buy-undo-coins');
    const undoIapBtn = $('#btn-buy-infinite-undo');
    const undoCard = document.querySelector('.shop-card[data-item-id="undo-level"]');
    if (infiniteUndoLevel) {
      if (undoCard) undoCard.classList.add('owned');
      if (undoCoinBtn) {
        undoCoinBtn.textContent = 'Active this level';
        undoCoinBtn.disabled = true;
        undoCoinBtn.className = 'btn btn-sm';
      }
      if (undoIapBtn) {
        undoIapBtn.style.display = 'none';
      }
    } else {
      if (undoCard) undoCard.classList.remove('owned');
      if (undoCoinBtn) {
        undoCoinBtn.textContent = UNDO_LEVEL_COIN_COST + ' 🪙';
        undoCoinBtn.disabled = false;
        undoCoinBtn.className = 'btn btn-sm btn-coins';
      }
      if (undoIapBtn) {
        undoIapBtn.style.display = '';
        undoIapBtn.textContent = 'Unlock with cash';
        undoIapBtn.disabled = false;
      }
    }
    refreshSettingsToggles();
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
    confirmShopSpendThen('theme:' + id, THEME_COIN_COST, function () {
      if (!spendCoins(THEME_COIN_COST)) {
        toast('Not enough coins');
        return;
      }
      unlockTheme(id, 'coins');
    });
  }

  function playfieldOverlayBlocking() {
    const levels = $('#levels-overlay');
    return (
      (startScreen && startScreen.classList.contains('show')) ||
      (winOverlay && winOverlay.classList.contains('show')) ||
      (shopOverlay && shopOverlay.classList.contains('show')) ||
      (hintPaywall && hintPaywall.classList.contains('show')) ||
      (failPrompt && failPrompt.classList.contains('show')) ||
      (levels && levels.classList.contains('show'))
    );
  }

  function clearHudHintArm() {
    if (hudHintArmTimer) {
      clearTimeout(hudHintArmTimer);
      hudHintArmTimer = 0;
    }
    if (btnHint) btnHint.classList.remove('hud-hint-arm');
  }

  function clearHudUndoArm() {
    if (hudUndoArmTimer) {
      clearTimeout(hudUndoArmTimer);
      hudUndoArmTimer = 0;
    }
    if (btnUndo) btnUndo.classList.remove('hud-undo-arm');
  }

  /**
   * Soft-arm HUD recovery CTA on mid-level ★-track drop (once per drop via starDropHapticFired).
   * Prefer free Hint (mint/emerald); else Undo when available (rose/amber track-drop family).
   * Exclusive — never arm both. Separate soft invite @300ms (does not double-fire starDrop haptic).
   */
  function armHudRecoveryOnStarDrop() {
    clearHudHintArm();
    clearHudUndoArm();
    if (playfieldOverlayBlocking()) return;
    if ((save.freeHints || 0) >= 1) {
      armHudHintOnStarDrop();
      return;
    }
    armHudUndoOnStarDrop();
  }

  /**
   * Soft-arm HUD #btn-hint when freeHints remain (mint/emerald recovery family).
   * Caller clears both arms first; skip if overlay blocking.
   */
  function armHudHintOnStarDrop() {
    if ((save.freeHints || 0) < 1) return;
    if (playfieldOverlayBlocking()) return;
    if (!btnHint) return;
    clearHudUndoArm(); // exclusivity: hint wins
    btnHint.classList.add('hud-hint-arm');
    hudHintArmTimer = setTimeout(function () {
      hudHintArmTimer = 0;
      if (!btnHint || !btnHint.classList.contains('hud-hint-arm')) return;
      if (playfieldOverlayBlocking()) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
  }

  /**
   * Soft-arm HUD #btn-undo when freeHints<1 and undo is available (rose/amber track-drop family).
   * Skip if disabled / empty history / overlay blocking.
   */
  function armHudUndoOnStarDrop() {
    if ((save.freeHints || 0) >= 1) return;
    if (playfieldOverlayBlocking()) return;
    if (!btnUndo || btnUndo.disabled || history.length === 0) return;
    clearHudHintArm(); // exclusivity
    btnUndo.classList.add('hud-undo-arm');
    hudUndoArmTimer = setTimeout(function () {
      hudUndoArmTimer = 0;
      if (!btnUndo || !btnUndo.classList.contains('hud-undo-arm')) return;
      if (playfieldOverlayBlocking()) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
  }

  function clearShopBuyArm() {
    if (shopBuyArmTimer) {
      clearTimeout(shopBuyArmTimer);
      shopBuyArmTimer = 0;
    }
    ['#btn-buy-hints-coins', '#btn-buy-undo-coins', '#btn-buy-neon-coins', '#btn-buy-cat-coins'].forEach(function (sel) {
      const b = $(sel);
      if (b) b.classList.remove('shop-buy-arm');
    });
    const modal = shopOverlay && shopOverlay.querySelector('.modal-shop');
    if (modal) modal.classList.remove('shop-buy-nudge');
  }

  /**
   * Soft-arm the best affordable coin CTA in shop (once per open).
   * Priority: low freeHints → hint pack; else undo (this level); else hint pack stockpile; else cheapest locked theme.
   * Never arm Coming soon / remove-ads / cash IAP stubs.
   */
  function armShopAffordablePrimary() {
    clearShopBuyArm();
    const coins = save.coins || 0;
    const freeHints = save.freeHints || 0;
    let target = null;

    const hintsBtn = $('#btn-buy-hints-coins');
    const undoBtn = $('#btn-buy-undo-coins');
    const neonBtn = $('#btn-buy-neon-coins');
    const catBtn = $('#btn-buy-cat-coins');

    if (freeHints <= 1 && coins >= HINT_PACK_COIN_COST && hintsBtn && !hintsBtn.disabled) {
      target = hintsBtn;
    } else if (!infiniteUndoLevel && coins >= UNDO_LEVEL_COIN_COST && undoBtn && !undoBtn.disabled) {
      target = undoBtn;
    } else if (coins >= HINT_PACK_COIN_COST && hintsBtn && !hintsBtn.disabled) {
      target = hintsBtn;
    } else if (coins >= THEME_COIN_COST) {
      if ((!save.themes || !save.themes.neon) && neonBtn && !neonBtn.disabled) target = neonBtn;
      else if ((!save.themes || !save.themes.cat) && catBtn && !catBtn.disabled) target = catBtn;
    }

    if (!target) return;
    target.classList.add('shop-buy-arm');
    const modal = shopOverlay && shopOverlay.querySelector('.modal-shop');
    if (modal) modal.classList.add('shop-buy-nudge');
    shopBuyArmTimer = setTimeout(function () {
      shopBuyArmTimer = 0;
      if (!shopOverlay || !shopOverlay.classList.contains('show')) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
  }

  function clearWinReplayArm() {
    if (winReplayArmTimer) {
      clearTimeout(winReplayArmTimer);
      winReplayArmTimer = 0;
    }
    const restartBtn = $('#btn-win-restart');
    if (restartBtn) {
      restartBtn.classList.remove('win-replay-arm');
      restartBtn.textContent = 'Restart';
    }
    const winModal = winOverlay && winOverlay.querySelector('.modal-win');
    if (winModal) winModal.classList.remove('replay-nudge');
  }

  function clearHintPayArm() {
    if (hintPayArmTimer) {
      clearTimeout(hintPayArmTimer);
      hintPayArmTimer = 0;
    }
    const coinsBtn = $('#btn-hint-coins');
    const adBtn = $('#btn-hint-ad');
    if (coinsBtn) coinsBtn.classList.remove('hint-pay-arm');
    if (adBtn) adBtn.classList.remove('hint-pay-arm');
    const modal = hintPaywall && hintPaywall.querySelector('.modal');
    if (modal) modal.classList.remove('hint-pay-recover');
  }

  function clearFailHintArm() {
    if (failHintArmTimer) {
      clearTimeout(failHintArmTimer);
      failHintArmTimer = 0;
    }
    const hintBtn = $('#btn-fail-hint');
    if (hintBtn) hintBtn.classList.remove('fail-hint-arm');
    const modal = failPrompt && failPrompt.querySelector('.modal-fail');
    if (modal) modal.classList.remove('fail-recover');
  }

  function showFailPrompt() {
    trackEvent('level_fail', {
      level_id: analyticsLevelId(),
      mode: analyticsMode(),
      fail_reason: 'restart_loop',
      restart_count: restartFailCount,
    });
    clearFailHintArm();
    const hintBtn = $('#btn-fail-hint');
    if (hintBtn) {
      if ((save.freeHints || 0) > 0) {
        hintBtn.textContent = '💡 Free hint (keeps board)';
      } else if ((save.coins || 0) >= HINT_COIN_COST) {
        hintBtn.textContent = `💡 Hint for ${HINT_COIN_COST}🪙 (keeps board)`;
      } else {
        hintBtn.textContent = '💡 Watch ad for a hint (keeps board)';
      }
      hintBtn.classList.add('fail-hint-arm');
    }
    const modal = failPrompt && failPrompt.querySelector('.modal-fail');
    if (modal) modal.classList.add('fail-recover');
    openOverlay(failPrompt);
    // Once-per-open soft arm cue — guides eyes to hint-keeps-board primary
    failHintArmTimer = setTimeout(function () {
      failHintArmTimer = 0;
      if (!failPrompt || !failPrompt.classList.contains('show')) return;
      haptic('arm');
      try { SFX.tap(); } catch (_) { /* ignore */ }
    }, 300);
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
  function clearThemeUnlockClaim() {
    if (themeClaimClearTimer) {
      clearTimeout(themeClaimClearTimer);
      themeClaimClearTimer = 0;
    }
    const banner = $('#shop-theme-claim');
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
    }
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.remove('theme-claim');
    document.querySelectorAll('.shop-card.theme-unlock-pulse').forEach(function (el) {
      el.classList.remove('theme-unlock-pulse');
    });
  }

  /** Shop celebration for theme unlock — applyTheme already ran; no double coins. */
  function showThemeUnlockClaim(id, via) {
    const theme = THEMES[id];
    if (!theme) return;
    clearThemeUnlockClaim();
    clearHintsPackClaim();
    clearUndoPackClaim(); // one shop shout at a time
    const banner = $('#shop-theme-claim');
    if (!banner) return;
    var text = 'Theme unlocked: ' + theme.name;
    if (via === 'coins') text += ' · coins';
    else if (via === 'IAP') text += ' · cash';
    else if (via) text += ' · ' + via;
    banner.textContent = text;
    banner.hidden = false;
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.add('theme-claim');
    const card = document.querySelector('.shop-card[data-theme-id="' + id + '"]');
    if (card) card.classList.add('theme-unlock-pulse');
    setTimeout(function () { haptic('theme'); }, 220);
    setTimeout(function () { spawnThemeBurst(banner); }, 180);
    themeClaimClearTimer = setTimeout(clearThemeUnlockClaim, 4500);
  }

  function clearHintsPackClaim() {
    if (hintsClaimClearTimer) {
      clearTimeout(hintsClaimClearTimer);
      hintsClaimClearTimer = 0;
    }
    const banner = $('#shop-hints-claim');
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
    }
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.remove('hints-claim');
    document.querySelectorAll('.shop-card.hints-pack-pulse').forEach(function (el) {
      el.classList.remove('hints-pack-pulse');
    });
  }

  /** Shop celebration for hint-pack purchase — hints already added; no double grant. */
  function showHintsPackClaim(via) {
    clearHintsPackClaim();
    clearThemeUnlockClaim();
    clearUndoPackClaim(); // one shop shout at a time
    const banner = $('#shop-hints-claim');
    if (!banner) return;
    var text = 'Hint pack ×' + HINT_PACK_SIZE + '!';
    if (via === 'coins') text += ' · coins';
    else if (via === 'IAP') text += ' · cash';
    else if (via) text += ' · ' + via;
    banner.textContent = text;
    banner.hidden = false;
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.add('hints-claim');
    const card = document.querySelector('.shop-card[data-item-id="hint-pack"]');
    if (card) card.classList.add('hints-pack-pulse');
    setTimeout(function () { haptic('hintsPack'); }, 220);
    setTimeout(function () { spawnHintsPackBurst(banner); }, 180);
    hintsClaimClearTimer = setTimeout(clearHintsPackClaim, 4500);
  }

  function clearUndoPackClaim() {
    if (undoClaimClearTimer) {
      clearTimeout(undoClaimClearTimer);
      undoClaimClearTimer = 0;
    }
    const banner = $('#shop-undo-claim');
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
    }
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.remove('undo-claim');
    document.querySelectorAll('.shop-card.undo-level-pulse').forEach(function (el) {
      el.classList.remove('undo-level-pulse');
    });
  }

  /** Shop celebration for unlimited-undo (this level) — flag already set; no double grant. */
  function showUndoPackClaim(via) {
    clearUndoPackClaim();
    clearThemeUnlockClaim();
    clearHintsPackClaim(); // one shop shout at a time
    const banner = $('#shop-undo-claim');
    if (!banner) return;
    var text = 'Unlimited undo · this level!';
    if (via === 'coins') text += ' · coins';
    else if (via === 'IAP') text += ' · cash';
    else if (via) text += ' · ' + via;
    banner.textContent = text;
    banner.hidden = false;
    const modal = shopOverlay ? shopOverlay.querySelector('.modal-shop') : null;
    if (modal) modal.classList.add('undo-claim');
    const card = document.querySelector('.shop-card[data-item-id="undo-level"]');
    if (card) card.classList.add('undo-level-pulse');
    setTimeout(function () { haptic('undoPack'); }, 220);
    setTimeout(function () { spawnUndoPackBurst(banner); }, 180);
    undoClaimClearTimer = setTimeout(clearUndoPackClaim, 4500);
  }

  function clearStreakMilestoneClaim() {
    if (streakClaimClearTimer) {
      clearTimeout(streakClaimClearTimer);
      streakClaimClearTimer = 0;
    }
    const banner = $('#start-streak-claim');
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
    }
    const modal = startScreen ? startScreen.querySelector('.modal-premium') : null;
    if (modal) modal.classList.remove('streak-claim');
    const chip = $('#streak-display');
    if (chip) chip.classList.remove('streak-pulse');
  }

  /** Start-screen celebration for Days 3/7/14 — coins/hints already via claimStreakMilestones. */
  function showStreakMilestoneClaim(m) {
    if (!m) return;
    clearStreakMilestoneClaim();
    const banner = $('#start-streak-claim');
    if (!banner) return;
    var text = m.label + '! +' + m.coins + ' coins';
    if (m.hints) {
      text += ' + ' + m.hints + ' hint' + (m.hints > 1 ? 's' : '');
    }
    banner.textContent = text;
    banner.hidden = false;
    const modal = startScreen ? startScreen.querySelector('.modal-premium') : null;
    if (modal) modal.classList.add('streak-claim');
    const chip = $('#streak-display');
    if (chip) chip.classList.add('streak-pulse');
    setTimeout(function () { haptic('streak'); }, 220);
    setTimeout(function () { spawnStreakBurst(banner); }, 180);
    streakClaimClearTimer = setTimeout(clearStreakMilestoneClaim, 4500);
  }

  function startGame() {
    resumeAudio();
    clearStreakMilestoneClaim();
    // Match Play/Continue/Resume label (same target as refreshStartPlayCta)
    const resumeIdx = mainlineResumeTargetIndex();
    const targetIdx =
      resumeIdx >= 0
        ? resumeIdx
        : Math.min(Math.max(save.level || 0, 0), LEVELS.length - 1);
    confirmLeaveRunThen(targetIdx, {}, function () {
      // Prevent click-through from start CTA into tubes underneath
      app.classList.add('input-gate');
      startScreen.classList.remove('show');
      isDailyMode = false;
      levelIndex = targetIdx;
      tryResumeOrLoad(levelIndex);
      setTimeout(() => app.classList.remove('input-gate'), 280);
    });
  }

  function bindShop() {
    // Soft UI tap on primary chrome (not every shop SKU click — keeps ads clean)
    ['btn-undo', 'btn-restart', 'btn-hint', 'btn-shop', 'btn-home', 'btn-next', 'btn-start'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => SFX.tap(), { capture: true });
    });

    $('#btn-shop').addEventListener('click', openShop);
    $('#btn-start-shop').addEventListener('click', () => {
      openShop();
    });
    $('#btn-win-shop').addEventListener('click', openShop);
    $('#btn-win-home').addEventListener('click', () => {
      hideWin();
      goHome();
    });
    $('#btn-shop-close').addEventListener('click', () => closeOverlay(shopOverlay));
    const btnToggleSfx = $('#btn-toggle-sfx');
    if (btnToggleSfx) {
      btnToggleSfx.addEventListener('click', () => {
        const next = save.sfxOn === false;
        save.sfxOn = next;
        persist();
        refreshSettingsToggles();
        if (next) SFX.tap();
      });
    }
    const btnToggleHaptics = $('#btn-toggle-haptics');
    if (btnToggleHaptics) {
      btnToggleHaptics.addEventListener('click', () => {
        const next = save.hapticsOn === false;
        save.hapticsOn = next;
        persist();
        refreshSettingsToggles();
        if (next) haptic('arm');
      });
    }
    const btnToggleColorAssist = $('#btn-toggle-color-assist');
    if (btnToggleColorAssist) {
      btnToggleColorAssist.addEventListener('click', () => {
        const next = save.colorAssist !== true;
        save.colorAssist = next;
        persist();
        refreshSettingsToggles();
        render();
        if (next) SFX.tap();
      });
    }
    const btnResetProgress = $('#btn-reset-progress');
    if (btnResetProgress) {
      btnResetProgress.addEventListener('click', () => {
        confirmResetProgressThen(doResetProgress);
      });
    }
    $('#coin-display').addEventListener('click', openShop);
    const hintDisplay = $('#hint-display');
    if (hintDisplay) hintDisplay.addEventListener('click', requestHint);

    $('#btn-buy-remove-ads').addEventListener('click', () => {
      purchaseRemoveAds();
    });

    $('#btn-buy-hints-coins').addEventListener('click', () => {
      confirmShopSpendThen('hints-pack', HINT_PACK_COIN_COST, function () {
        if (!spendCoins(HINT_PACK_COIN_COST)) {
          toast('Not enough coins');
          return;
        }
        clearShopBuyArm();
        addFreeHints(HINT_PACK_SIZE);
        // Banner is the claim shout — no toast duplicate
        showHintsPackClaim('coins');
      });
    });

    $('#btn-buy-hints-iap').addEventListener('click', () => {
      mockIapPurchase('hint_pack_5', () => {
        addFreeHints(HINT_PACK_SIZE);
        // Banner is the claim shout — no toast duplicate
        showHintsPackClaim('IAP');
      });
    });

    $('#btn-buy-undo-coins').addEventListener('click', () => {
      if (infiniteUndoLevel) {
        toast('Already active this level');
        return;
      }
      confirmShopSpendThen('undo-level', UNDO_LEVEL_COIN_COST, function () {
        if (!spendCoins(UNDO_LEVEL_COIN_COST)) {
          toast('Not enough coins');
          return;
        }
        infiniteUndoLevel = true;
        persistRunDraft();
        clearShopBuyArm();
        refreshShopButtons();
        refreshHud();
        // Banner is the claim shout — no toast duplicate
        showUndoPackClaim('coins');
      });
    });

    $('#btn-buy-infinite-undo').addEventListener('click', () => {
      if (infiniteUndoLevel) {
        toast('Already active this level');
        return;
      }
      mockIapPurchase('infinite_undo_level', () => {
        infiniteUndoLevel = true;
        persistRunDraft();
        refreshShopButtons();
        // Banner is the claim shout — no toast duplicate
        showUndoPackClaim('IAP');
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
        addFreeHints(HINT_PACK_SIZE);
        closeOverlay(hintPaywall);
        if (spendFreeHint()) {
          lastHintSource = 'pack';
          applyHint();
        }
      });
    });

    // Fail prompt — hint-first (keeps board); ad restart is secondary
    $('#btn-fail-hint').addEventListener('click', () => {
      closeOverlay(failPrompt);
      const grantFailHint = (source) => {
        lastHintSource = source;
        const ok = applyHint();
        if (ok) {
          restartFailCount = 0;
          trackEvent('fail_hint', {
            level_id: analyticsLevelId(),
            mode: analyticsMode(),
            source: source,
          });
        }
        return ok;
      };
      if (spendFreeHint()) {
        grantFailHint('fail_free');
        return;
      }
      if ((save.coins || 0) >= HINT_COIN_COST) {
        if (!spendCoins(HINT_COIN_COST)) {
          toast('Not enough coins');
          return;
        }
        grantFailHint('fail_coins');
        return;
      }
      showRewardedStub(() => {
        grantFailHint('fail_rewarded');
      }, 'fail_hint');
    });
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
    const btnFailHome = $('#btn-fail-home');
    if (btnFailHome) {
      btnFailHome.addEventListener('click', () => {
        closeOverlay(failPrompt);
        restartFailCount = 0;
        goHome();
      });
    }
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
    if (pendingStreakMilestone) {
      const m = pendingStreakMilestone;
      pendingStreakMilestone = null;
      setTimeout(function () { showStreakMilestoneClaim(m); }, 400);
    } else if (pendingStreakToast) {
      const msg = pendingStreakToast;
      pendingStreakToast = '';
      setTimeout(() => toast(msg, 3200), 400);
    }
    if (pendingSaveRecoveryToast) {
      const msg = pendingSaveRecoveryToast;
      pendingSaveRecoveryToast = '';
      setTimeout(function () { toast(msg, 3600); }, 700);
    }

    document.addEventListener('pointerdown', resumeAudio, { once: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        trapOverlayTab(e);
        return;
      }
      if (e.key === 'Escape') {
        const levelsOv = $('#levels-overlay');
        if (levelsOv && levelsOv.classList.contains('show')) {
          e.preventDefault();
          closeLevels();
          return;
        }
        if (hintPaywall && hintPaywall.classList.contains('show')) {
          e.preventDefault();
          closeOverlay(hintPaywall);
          return;
        }
        if (shopOverlay && shopOverlay.classList.contains('show')) {
          e.preventDefault();
          closeOverlay(shopOverlay);
          return;
        }
        if (failPrompt && failPrompt.classList.contains('show')) {
          e.preventDefault();
          closeOverlay(failPrompt);
          return;
        }
        // Win: Escape → Home (parity with handleSystemBack / BACK-NAV; does not dismiss start)
        if (winOverlay && winOverlay.classList.contains('show')) {
          e.preventDefault();
          hideWin();
          goHome();
          return;
        }
        // Playing: Escape clears selection / pending uncap (does not dismiss start)
        if (
          selected >= 0 ||
          pendingUncapIdx >= 0
        ) {
          if (pouring) return;
          if (startScreen && startScreen.classList.contains('show')) return;
          e.preventDefault();
          selected = -1;
          clearPendingUncap();
          render();
        }
        return;
      }
      // HINT-PAYWALL-KEYS: Enter primary hint CTA (arm → coins → ad; never pack)
      if (hintPaywall && hintPaywall.classList.contains('show')) {
        if (handleHintPaywallKeys(e)) return;
      }
      // SHOP-KEYS: Enter armed shop buy CTA (SHOP-SPEND-CONFIRM via click)
      if (shopOverlay && shopOverlay.classList.contains('show')) {
        if (handleShopKeys(e)) return;
      }
      // START-KEYS: Enter Play, d Daily, s Shop, l Levels (only when start shows and no modal)
      if (startScreen && startScreen.classList.contains('show')) {
        if (handleStartKeys(e)) return;
      }
      // WIN-FAIL-KEYS: win Enter/n Next, r Restart, h Home; fail Enter/h Hint, b Home (Escape left alone)
      if (
        (winOverlay && winOverlay.classList.contains('show')) ||
        (failPrompt && failPrompt.classList.contains('show'))
      ) {
        if (handleWinFailKeys(e)) return;
      }
      // HUD-KEYS: in-play u/h/r/(l)/s — Undo / Hint / Restart / Levels / Shop
      handleHudKeys(e);
    });
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
    const btnLevelsPrev = $('#btn-levels-prev');
    if (btnLevelsPrev) {
      btnLevelsPrev.addEventListener('click', function () {
        shiftLevelsChapter(-1);
      });
    }
    const btnLevelsNext = $('#btn-levels-next');
    if (btnLevelsNext) {
      btnLevelsNext.addEventListener('click', function () {
        shiftLevelsChapter(1);
      });
    }
    const levelsGridEl = $('#levels-grid');
    if (levelsGridEl) {
      levelsGridEl.addEventListener('keydown', handleLevelsGridKeydown);
    }
    if (tubesWrap) {
      tubesWrap.addEventListener('keydown', handleTubesBoardKeydown);
    }
    if (levelLabel) {
      levelLabel.addEventListener('click', tryOpenLevelsFromHud);
    }
    const btnHome = $('#btn-home');
    if (btnHome) btnHome.addEventListener('click', goHome);
    const btnLevelsHome = $('#btn-levels-home');
    if (btnLevelsHome) {
      btnLevelsHome.addEventListener('click', () => {
        closeLevels();
        goHome();
      });
    }

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

    // Hardware / browser back: dismiss overlays → pause Home (draft kept); start allows exit
    bindSystemBack();

    window.addEventListener('resize', () => {
      if (!startScreen.classList.contains('show')) render();
    });

    startScreen.classList.add('show');
    refreshDailyCta({ cue: true });
    refreshStartPlayCta({ cue: true });
    updateChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
