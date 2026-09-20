/**
 * ColorTube Sort — optional GA4/gtag provider.
 * Loads only when ColorTubeAnalyticsConfig.MEASUREMENT_ID (or
 * window.__COLOR_TUBE_GA4_ID__) is a real G-… id. Empty = no network.
 */
(function (global) {
  'use strict';

  function resolveId() {
    var fromWin =
      typeof global.__COLOR_TUBE_GA4_ID__ === 'string'
        ? global.__COLOR_TUBE_GA4_ID__.trim()
        : '';
    if (fromWin && /^G-[A-Z0-9]+$/i.test(fromWin)) return fromWin;
    var cfg = global.ColorTubeAnalyticsConfig;
    var id = cfg && typeof cfg.MEASUREMENT_ID === 'string' ? cfg.MEASUREMENT_ID.trim() : '';
    if (id && /^G-[A-Z0-9]+$/i.test(id)) return id;
    return '';
  }

  function sanitizeParams(params) {
    var out = {};
    if (!params || typeof params !== 'object') return out;
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      var t = typeof v;
      if (t === 'string' || t === 'number' || t === 'boolean') {
        out[k] = v;
      } else if (v == null) {
        /* skip */
      } else {
        try {
          out[k] = String(v);
        } catch (_) { /* skip */ }
      }
    });
    return out;
  }

  function loadGtag(measurementId) {
    if (global.__colorTubeGtagLoading) return;
    global.__colorTubeGtagLoading = true;
    global.dataLayer = global.dataLayer || [];
    function gtag() {
      global.dataLayer.push(arguments);
    }
    global.gtag = global.gtag || gtag;
    gtag('js', new Date());
    gtag('config', measurementId, { send_page_view: false });

    var s = global.document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    (global.document.head || global.document.documentElement).appendChild(s);
  }

  function install() {
    var id = resolveId();
    if (!id) {
      if (global.console && typeof global.console.info === 'function') {
        global.console.info(
          '[Analytics] GA4 provider idle — set ColorTubeAnalyticsConfig.MEASUREMENT_ID to a real G- id'
        );
      }
      return;
    }
    if (!global.ColorTubeAnalytics || typeof global.ColorTubeAnalytics.setProvider !== 'function') {
      return;
    }
    loadGtag(id);
    global.ColorTubeAnalytics.setProvider(function (event, params) {
      if (!event || typeof global.gtag !== 'function') return;
      try {
        global.gtag('event', event, sanitizeParams(params));
      } catch (_) { /* ignore */ }
    });
    if (global.console && typeof global.console.info === 'function') {
      global.console.info('[Analytics] GA4 provider attached', id);
    }
  }

  try {
    install();
  } catch (_) { /* ignore */ }
})(typeof window !== 'undefined' ? window : globalThis);
