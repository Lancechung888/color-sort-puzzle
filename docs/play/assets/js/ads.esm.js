/**
 * ESM 版（建議）。在 index.html：
 *   <script type="module" src="assets/js/ads.esm.js"></script>
 *   <script src="assets/js/game.js" defer></script>
 *
 * 需已 npm i @capacitor-community/admob @capacitor/core
 * 並用支援 node_modules 解析的方式服務（Capacitor 實機／或 Vite）。
 */
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
} from '@capacitor-community/admob';

const STORAGE_KEY = 'colorTubeSort_v2';
const USE_TEST_ADS = true; // 上架前改 false

const TEST = {
  interstitial: {
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  },
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
  },
};

const PROD = {
  interstitial: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
  },
  rewarded: {
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
  },
};

const state = {
  ready: false,
  canRequestAds: true,
  interstitialReady: false,
  rewardedReady: false,
};

function plat() {
  return Capacitor.getPlatform();
}

function native() {
  return plat() === 'android' || plat() === 'ios';
}

function unit(kind) {
  const table = USE_TEST_ADS ? TEST : PROD;
  return plat() === 'ios' ? table[kind].ios : table[kind].android;
}

function adsRemoved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return !!JSON.parse(raw).removeAds;
  } catch {
    return false;
  }
}

async function consent() {
  try {
    if (plat() === 'ios') {
      const t = await AdMob.trackingAuthorizationStatus();
      if (t.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    }
  } catch (e) {
    console.warn('[Ads] ATT', e);
  }

  try {
    let info = await AdMob.requestConsentInfo();
    if (
      info.isConsentFormAvailable &&
      info.status === AdmobConsentStatus.REQUIRED
    ) {
      info = await AdMob.showConsentForm();
    }
    if (typeof info.canRequestAds === 'boolean') {
      state.canRequestAds = info.canRequestAds;
    }
  } catch (e) {
    console.warn('[Ads] UMP', e);
  }
}

async function prepInterstitial() {
  if (!state.canRequestAds || adsRemoved()) return;
  try {
    await AdMob.prepareInterstitial({
      adId: unit('interstitial'),
      isTesting: USE_TEST_ADS,
    });
    state.interstitialReady = true;
  } catch (e) {
    state.interstitialReady = false;
    console.warn('[Ads] prepareInterstitial', e);
  }
}

async function prepRewarded() {
  if (!state.canRequestAds) return;
  try {
    await AdMob.prepareRewardVideoAd({
      adId: unit('rewarded'),
      isTesting: USE_TEST_ADS,
    });
    state.rewardedReady = true;
  } catch (e) {
    state.rewardedReady = false;
    console.warn('[Ads] prepareRewardVideoAd', e);
  }
}

export async function initAds() {
  if (!native()) {
    state.ready = true;
    return;
  }
  await AdMob.initialize({ initializeForTesting: USE_TEST_ADS });
  await consent();
  await Promise.all([prepInterstitial(), prepRewarded()]);
  state.ready = true;
  console.info('[Ads] ready', plat(), { removeAds: adsRemoved() });
}

export async function showInterstitialStub(reason) {
  if (adsRemoved()) return;
  if (!native()) {
    console.info('[Ads stub] Interstitial', reason);
    return;
  }
  if (!state.canRequestAds) return;
  try {
    if (!state.interstitialReady) await prepInterstitial();
    if (!state.interstitialReady) return;
    await AdMob.showInterstitial();
    state.interstitialReady = false;
    await prepInterstitial();
  } catch (e) {
    console.warn('[Ads] showInterstitial', reason, e);
    state.interstitialReady = false;
    prepInterstitial();
  }
}

export async function showRewardedStub(onReward, label) {
  if (!native()) {
    console.info('[Ads stub] Rewarded', label || '');
    setTimeout(() => onReward && onReward(), 400);
    return;
  }
  if (!state.canRequestAds) return;
  try {
    if (!state.rewardedReady) await prepRewarded();
    if (!state.rewardedReady) return;
    const reward = await AdMob.showRewardVideoAd();
    state.rewardedReady = false;
    if (reward && onReward) onReward(reward);
    await prepRewarded();
  } catch (e) {
    console.warn('[Ads] showRewardVideoAd', label, e);
    state.rewardedReady = false;
    prepRewarded();
  }
}

// 掛到 window，讓非 module 的 game.js 直接呼叫同名 stub
window.ColorTubeAds = {
  init: initAds,
  showInterstitial: showInterstitialStub,
  showRewarded: showRewardedStub,
  adsRemoved,
  state,
};
window.showInterstitialStub = showInterstitialStub;
window.showRewardedStub = showRewardedStub;

initAds().catch((e) => console.error('[Ads] init', e));
