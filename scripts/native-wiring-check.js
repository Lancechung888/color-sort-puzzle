#!/usr/bin/env node
/**
 * 測 ID 階段配線自檢（不需 android/、不需 SDK）。
 * exit 0 = 測試 ID 階段配線 OK；否則非 0。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const lines = [];
let fails = 0;

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
  const testAndroid = /~3347511713/.test(androidId) || /3940256099942544~/.test(androidId);
  const testIos = /~1458002511/.test(iosId) || /3940256099942544~/.test(iosId);

  if (testAndroid) pass(`capacitor.config.json AdMob appIdAndroid 為測試 App ID (${androidId})`);
  else fail(`capacitor.config.json appIdAndroid 非預期測試 ID: ${androidId || '(空)'}`);

  if (testIos) pass(`capacitor.config.json AdMob appIdIos 為測試 App ID (${iosId})`);
  else fail(`capacitor.config.json appIdIos 非預期測試 ID: ${iosId || '(空)'}`);

  if (testing) pass('capacitor.config.json initializeForTesting === true');
  else fail('capacitor.config.json initializeForTesting 應為 true（測 ID 階段）');

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
  if (/USE_TEST_ADS\s*=\s*true/.test(adsRaw)) pass('assets/js/ads.js USE_TEST_ADS === true');
  else if (/USE_TEST_ADS\s*=\s*false/.test(adsRaw)) fail('assets/js/ads.js USE_TEST_ADS === false（測 ID 階段應為 true）');
  else fail('assets/js/ads.js 找不到 USE_TEST_ADS 賦值');

  if (/1033173712/.test(adsRaw) && /5224354917/.test(adsRaw)) {
    pass('assets/js/ads.js 含 Google sample interstitial／rewarded 單元');
  } else {
    fail('assets/js/ads.js 缺少 Google sample interstitial／rewarded 單元 ID');
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

const hasAndroid = fs.existsSync(path.join(root, 'android'));
if (hasAndroid) info('本機存在 android/（可選；測 ID 階段不強制）');
else info('本機無 android/（預期：gitignore；需 SDK 時再 npm run cap:add:android）');

console.log('## native:check（測試 ID 階段）\n');
console.log(lines.join('\n'));
console.log('');
if (fails > 0) {
  console.log(`結果: FAIL（${fails} 項）`);
  process.exit(1);
}
console.log('結果: PASS — 測 ID 配線可驗收（不要求 android/ 或實產 AAB）');
process.exit(0);
