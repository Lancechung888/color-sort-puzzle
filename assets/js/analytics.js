/**
 * ColorTube Sort — lightweight analytics facade.
 * Console sink always on; swap setProvider() for GA4 / Firebase later.
 * Event names are stable contracts — see docs/ANALYTICS_EVENTS.md.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'colorTubeAnalytics_v1';
  var meta = null;
  var provider = null;
  var debug = true;

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function loadMeta() {
    if (meta) return meta;
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (raw) meta = JSON.parse(raw);
    } catch (_) { /* ignore */ }
    if (!meta || typeof meta !== 'object') {
      meta = { install_id: uuid(), first_open_at: Date.now(), session_count: 0 };
    }
    if (!meta.install_id) meta.install_id = uuid();
    if (!meta.first_open_at) meta.first_open_at = Date.now();
    if (typeof meta.session_count !== 'number') meta.session_count = 0;
    return meta;
  }

  function saveMeta() {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch (_) { /* ignore */ }
  }

  function dayKey(ts) {
    var d = new Date(ts);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function daysSinceInstall() {
    var m = loadMeta();
    var a = dayKey(m.first_open_at);
    var b = dayKey(Date.now());
    // calendar-day delta (UTC+local of device)
    var da = Date.parse(a + 'T00:00:00');
    var db = Date.parse(b + 'T00:00:00');
    return Math.max(0, Math.round((db - da) / 86400000));
  }

  function baseParams() {
    var m = loadMeta();
    return {
      install_id: m.install_id,
      days_since_install: daysSinceInstall(),
      session_count: m.session_count,
    };
  }

  function track(event, params) {
    if (!event || typeof event !== 'string') return;
    var payload = Object.assign({}, baseParams(), params || {});
    if (debug && global.console && typeof global.console.info === 'function') {
      global.console.info('[Analytics]', event, payload);
    }
    try {
      if (provider && typeof provider === 'function') provider(event, payload);
      else if (provider && typeof provider.track === 'function') provider.track(event, payload);
    } catch (e) {
      if (global.console && console.warn) console.warn('[Analytics] provider error', e);
    }
  }

  function bootSession() {
    var m = loadMeta();
    var first = !m.first_open_sent;
    m.session_count = (m.session_count || 0) + 1;
    if (first) {
      m.first_open_sent = true;
      saveMeta();
      track('first_open', { first_open_at: m.first_open_at });
    } else {
      saveMeta();
    }
    track('session_start', {
      is_d1_return: daysSinceInstall() === 1,
      is_returning: daysSinceInstall() >= 1,
    });
  }

  function setProvider(fnOrObj) {
    provider = fnOrObj || null;
  }

  function setDebug(on) {
    debug = !!on;
  }

  function getMeta() {
    return Object.assign({}, loadMeta(), { days_since_install: daysSinceInstall() });
  }

  // Boot once when script loads (before game init is fine for first_open/session)
  try {
    bootSession();
  } catch (_) { /* ignore */ }

  global.ColorTubeAnalytics = {
    track: track,
    setProvider: setProvider,
    setDebug: setDebug,
    getMeta: getMeta,
    daysSinceInstall: daysSinceInstall,
  };
})(typeof window !== 'undefined' ? window : globalThis);
