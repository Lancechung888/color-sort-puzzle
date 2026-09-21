/**
 * ColorTube Sort — AdMob (Capacitor) drop-in
 * Path: assets/js/ads.js  （可在 game.js 之後載入；game 用 optional globals；sync 於 DOMContentLoaded 前即可）
 *
 * 對齊 game.js stub：
 *   showInterstitialStub(reason)
 *   showRewardedStub(onReward, label)
 *   save.removeAds + localStorage key colorTubeSort_v2
 *
 * 安裝：
 *   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor-community/admob
 *   npx cap init "ColorTube Sort" com.lancechung.colortubesort --web-dir .
 *   npx cap add android   # Mac 再 add ios
 *   npx cap sync
 *
 * Native App ID（不是廣告單元 ID）：
 *   Android: strings.xml admob_app_id + Manifest meta-data
 *   iOS: Info.plist GADApplicationIdentifier
 *
 * API：@capacitor-community/admob（initialize / prepareInterstitial / showInterstitial /
 *      prepareRewardVideoAd / showRewardVideoAd / requestConsentInfo / showConsentForm）
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'colorTubeSort_v2';

  // Google 官方測試單元（上架前務必改 PROD + USE_TEST_ADS=false）
  const TEST_UNITS = {
    interstitial: {
      android: 'ca-app-pub-3940256099942544/1033173712',
      ios: 'ca-app-pub-3940256099942544/4411468910',
    },
    rewarded: {
      android: 'ca-app-pub-3940256099942544/5224354917',
      ios: 'ca-app-pub-3940256099942544/1712485313',
    },
  };

  const PROD_UNITS = {
    interstitial: {
      android: 'ca-app-pub-3904450574947460/2731725604',
      // iOS units TBD — do not ship iOS release until real IDs exist
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
    },
    rewarded: {
      android: 'ca-app-pub-3904450574947460/8768677032',
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
    },
  };

  // Android prod IDs live (2026-09-21, AdMob unpublished-app OK). Play store link may 404 until listing public.
  const USE_TEST_ADS = false;

  const state = {
    ready: false,
    canRequestAds: true,
    interstitialReady: false,
    rewardedReady: false,
  };

  function platform() {
    try {
      return (global.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform()) || 'web';
    } catch (_) {
      return 'web';
    }
  }

  function isNative() {
    const p = platform();
    return p === 'android' || p === 'ios';
  }

  function pickUnit(kind) {
    const ios = platform() === 'ios';
    const table = USE_TEST_ADS ? TEST_UNITS : PROD_UNITS;
    return ios ? table[kind].ios : table[kind].android;
  }

  function getAdMob() {
    const plugins = (global.Capacitor && Capacitor.Plugins) || {};
    return plugins.AdMob || global.AdMob || null;
  }

  function adsRemoved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.removeAds);
    } catch (_) {
      return false;
    }
  }

  async function runConsent(AdMob) {
    try {
      if (platform() === 'ios' && AdMob.trackingAuthorizationStatus) {
        const t = await AdMob.trackingAuthorizationStatus();
        if (t && t.status === 'notDetermined' && AdMob.requestTrackingAuthorization) {
          await AdMob.requestTrackingAuthorization();
        }
      }
    } catch (e) {
      console.warn('[Ads] ATT', e);
    }

    try {
      if (!AdMob.requestConsentInfo) return;
      let info = await AdMob.requestConsentInfo({});
      if (
        info &&
        info.isConsentFormAvailable &&
        info.status === 'REQUIRED' &&
        AdMob.showConsentForm
      ) {
        info = await AdMob.showConsentForm();
      }
      if (info && typeof info.canRequestAds === 'boolean') {
        state.canRequestAds = info.canRequestAds;
      }
    } catch (e) {
      console.warn('[Ads] UMP', e);
    }
  }

  async function prepareInterstitial(AdMob) {
    if (!state.canRequestAds || adsRemoved()) return;
    try {
      await AdMob.prepareInterstitial({
        adId: pickUnit('interstitial'),
        isTesting: USE_TEST_ADS,
      });
      state.interstitialReady = true;
    } catch (e) {
      state.interstitialReady = false;
      console.warn('[Ads] prepareInterstitial', e);
    }
  }

  async function prepareRewarded(AdMob) {
    if (!state.canRequestAds) return;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: pickUnit('rewarded'),
        isTesting: USE_TEST_ADS,
      });
      state.rewardedReady = true;
    } catch (e) {
      state.rewardedReady = false;
      console.warn('[Ads] prepareRewardVideoAd', e);
    }
  }

  async function initAds() {
    if (!isNative()) {
      console.info('[Ads] web — keep using stubs');
      state.ready = true;
      return;
    }
    const AdMob = getAdMob();
    if (!AdMob || !AdMob.initialize) {
      console.warn('[Ads] plugin missing — npx cap sync');
      state.ready = true;
      return;
    }
    try {
      await AdMob.initialize({
        initializeForTesting: USE_TEST_ADS,
      });
      await runConsent(AdMob);
      await Promise.all([prepareInterstitial(AdMob), prepareRewarded(AdMob)]);
      state.ready = true;
      console.info('[Ads] ready', platform(), { removeAds: adsRemoved() });
    } catch (e) {
      console.error('[Ads] init failed', e);
      state.ready = true;
    }
  }

  /** 對齊 showInterstitialStub(reason) — 僅 fail-loop／關卡轉換，禁止倒水中 */
  async function showInterstitial(reason) {
    if (adsRemoved()) {
      console.info('[Ads] skipped removeAds', reason);
      return;
    }
    if (!isNative()) {
      console.info('[Ads stub] Interstitial', reason);
      return;
    }
    const AdMob = getAdMob();
    if (!AdMob || !state.canRequestAds) return;
    try {
      if (!state.interstitialReady) await prepareInterstitial(AdMob);
      if (!state.interstitialReady) return;
      await AdMob.showInterstitial();
      state.interstitialReady = false;
      await prepareInterstitial(AdMob);
    } catch (e) {
      console.warn('[Ads] showInterstitial', reason, e);
      state.interstitialReady = false;
      prepareInterstitial(AdMob);
    }
  }

  /** 對齊 showRewardedStub(onReward, label) — 只有賺到獎勵才呼叫 onReward */
  async function showRewarded(onReward, label) {
    if (!isNative()) {
      console.info('[Ads stub] Rewarded', label || '');
      setTimeout(function () {
        if (onReward) onReward();
      }, 400);
      return;
    }
    const AdMob = getAdMob();
    if (!AdMob || !state.canRequestAds) {
      console.warn('[Ads] rewarded unavailable', label);
      return;
    }
    try {
      if (!state.rewardedReady) await prepareRewarded(AdMob);
      if (!state.rewardedReady) return;
      const reward = await AdMob.showRewardVideoAd();
      state.rewardedReady = false;
      if (reward && onReward) onReward(reward);
      await prepareRewarded(AdMob);
    } catch (e) {
      console.warn('[Ads] showRewardVideoAd', label, e);
      state.rewardedReady = false;
      prepareRewarded(AdMob);
    }
  }

  global.ColorTubeAds = {
    init: initAds,
    showInterstitial: showInterstitial,
    showRewarded: showRewarded,
    adsRemoved: adsRemoved,
    state: state,
  };

  // 方便 game.js 直接掛同名 stub
  global.showInterstitialStub = function (reason) {
    return showInterstitial(reason);
  };
  global.showRewardedStub = function (onReward, label) {
    return showRewarded(onReward, label);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAds);
  } else {
    initAds();
  }
})(typeof window !== 'undefined' ? window : globalThis);
