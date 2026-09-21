#!/usr/bin/env node
/**
 * AdMob / Billing wiring self-check (no android/ / SDK required).
 * REAL-ADMOB-IDS phase: Android prod App ID + USE_TEST_ADS=false.
 * exit 0 = wiring OK; else non-zero.
 * Does NOT claim MILLION_USER_BAR #7 Pass (device three-green still required).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const lines = [];
let fails = 0;

const REAL_ANDROID_APP = 'ca-app-pub-3904450574947460~6670970617';
const REAL_INTERSTITIAL = 'ca-app-pub-3904450574947460/2731725604';
const REAL_REWARDED = 'ca-app-pub-3904450574947460/8768677032';
const SAMPLE_PREFIX = 'ca-app-pub-3940256099942544';

function pass(msg) {
  lines.push(`- PASS: ${msg}`);
}
function fail(msg) {
  fails += 1;
  lines.push(`- FAIL: ${msg}`);
}
function info(msg) {
  lines.push(`- INFO: ${msg}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`缺少檔案 ${rel}`);
    return null;
  }
  return fs.readFileSync(p, 'utf8');
}

const capRaw = read('capacitor.config.json');
let cap = null;
if (capRaw) {
  try {
    cap = JSON.parse(capRaw);
  } catch (e) {
    fail(`capacitor.config.json 無法 parse: ${e.message}`);
  }
}

if (cap) {
  const admob = (cap.plugins && cap.plugins.AdMob) || {};
  const androidId = admob.appIdAndroid || '';
  const iosId = admob.appIdIos || '';
  const testing = admob.initializeForTesting === true;

  if (androidId === REAL_ANDROID_APP) {
    pass(`capacitor.config.json AdMob appIdAndroid 為正式 App ID (${androidId})`);
  } else if (androidId.includes('3940256099942544')) {
    fail(`capacitor.config.json appIdAndroid 仍為 Google sample: ${androidId}`);
  } else {
    fail(`capacitor.config.json appIdAndroid 非預期正式 ID: ${androidId || '(空)'}`);
  }

  // iOS: OK to keep Google sample until real iOS app exists
  if (iosId.includes('3940256099942544') || /~1458002511/.test(iosId)) {
    pass(`capacitor.config.json AdMob appIdIos 仍為測試 App ID（尚無 iOS 正式包；OK）(${iosId})`);
  } else if (iosId) {
    info(`capacitor.config.json appIdIos = ${iosId}（非 sample；確認為正式 iOS App ID）`);
  } else {
    fail('capacitor.config.json appIdIos 空白');
  }

  if (testing === false || admob.initializeForTesting === false) {
    pass('capacitor.config.json initializeForTesting === false');
  } else {
    fail('capacitor.config.json initializeForTesting 應為 false（正式 Android 包）');
  }

  const pid =
    (cap.plugins &&
      cap.plugins.NativePurchases &&
      cap.plugins.NativePurchases.removeAdsProductId) ||
    '';
  if (pid === 'remove_ads') pass('capacitor.config.json removeAdsProductId === remove_ads');
  else info(`NativePurchases.removeAdsProductId = ${pid || '(未設；billing.js 仍應有 REMOVE_ADS)'}`);
}

const adsRaw = read('assets/js/ads.js');
if (adsRaw) {
  if (/USE_TEST_ADS\s*=\s*false/.test(adsRaw)) pass('assets/js/ads.js USE_TEST_ADS === false');
  else if (/USE_TEST_ADS\s*=\s*true/.test(adsRaw)) fail('assets/js/ads.js USE_TEST_ADS === true（正式 Android 應為 false）');
  else fail('assets/js/ads.js 找不到 USE_TEST_ADS 賦值');

  if (adsRaw.includes(REAL_INTERSTITIAL) && adsRaw.includes(REAL_REWARDED)) {
    pass('assets/js/ads.js PROD_UNITS Android interstitial／rewarded 為正式單元');
  } else {
    fail('assets/js/ads.js 缺少正式 Android interstitial／rewarded 單元 ID');
  }

  // Keep sample TEST_UNITS for local flip-back; must not be selected when USE_TEST_ADS=false
  if (/1033173712/.test(adsRaw) && /5224354917/.test(adsRaw)) {
    pass('assets/js/ads.js 仍保留 Google sample TEST_UNITS（僅 USE_TEST_ADS=true 時用）');
  } else {
    info('assets/js/ads.js 無 sample TEST_UNITS（可接受；正式路徑不依賴）');
  }
}

const esmRaw = read('assets/js/ads.esm.js');
if (esmRaw) {
  if (/USE_TEST_ADS\s*=\s*false/.test(esmRaw) && esmRaw.includes(REAL_INTERSTITIAL) && esmRaw.includes(REAL_REWARDED)) {
    pass('assets/js/ads.esm.js USE_TEST_ADS=false + 正式 Android 單元對齊');
  } else {
    fail('assets/js/ads.esm.js 未對齊正式 Android 單元／USE_TEST_ADS=false');
  }
}

const billRaw = read('assets/js/billing.js');
if (billRaw) {
  if (/REMOVE_ADS\s*=\s*['"]remove_ads['"]/.test(billRaw) || /remove_ads/.test(billRaw)) {
    pass('assets/js/billing.js 產品 ID remove_ads 存在');
  } else {
    fail('assets/js/billing.js 找不到 remove_ads');
  }
  if (/no mock grant|must not grant|not native\/ready \(no mock grant\)|no Play Billing; shop click must not grant/i.test(billRaw)) {
    pass('assets/js/billing.js 無 web／未就緒時不 grant（註解／邏輯可見）');
  } else if (/isBillingReady/.test(billRaw) && /grantRemoveAds/.test(billRaw)) {
    pass('assets/js/billing.js 具 isBillingReady + grantRemoveAds（請人工確認無白送路徑）');
  } else {
    fail('assets/js/billing.js 無法確認「無白送 grant」防護');
  }
}

const patchRaw = read('scripts/patch-android-admob.sh');
if (patchRaw) {
  if (/capacitor\.config\.json/.test(patchRaw) && /appIdAndroid/.test(patchRaw)) {
    pass('patch-android-admob.sh 從 capacitor.config.json 讀取 appIdAndroid');
  } else {
    fail('patch-android-admob.sh 未從 capacitor.config 注入 App ID');
  }
}

const hasAndroid = fs.existsSync(path.join(root, 'android'));
if (hasAndroid) {
  const strings = path.join(root, 'android/app/src/main/res/values/strings.xml');
  if (fs.existsSync(strings)) {
    const s = fs.readFileSync(strings, 'utf8');
    if (s.includes(REAL_ANDROID_APP)) {
      pass('local android strings.xml admob_app_id = 正式 App ID（無 3940 sample）');
    } else if (s.includes(SAMPLE_PREFIX)) {
      fail('local android strings.xml 仍含 Google sample 3940 App ID');
    } else {
      info('local android strings.xml admob_app_id 非預期字串 — 跑 patch-android-admob.sh');
    }
  }
  info('本機存在 android/（gitignore；正式 ID 應經 patch 注入）');
} else {
  info('本機無 android/（預期：gitignore；需 SDK 時再 npm run cap:add:android）');
}

console.log('## native:check（REAL-ADMOB-IDS · Android prod wiring）\n');
console.log(lines.join('\n'));
console.log('');
if (fails > 0) {
  console.log(`結果: FAIL（${fails} 項）`);
  process.exit(1);
}
console.log('結果: PASS — Android 正式 AdMob 配線 OK（#7 仍需實機三綠燈；不標 Pass）');
process.exit(0);
