/**
 * ColorTube Sort — Play Billing / StoreKit skeleton (@capgo/native-purchases)
 * Path: assets/js/billing.js  （在 ads.js 之後、game.js 之前載入）
 *
 * 產品：remove_ads（非消耗型 / non-consumable）
 * 成功購買／還原 → 合併寫入 localStorage colorTubeSort_v2.removeAds = true
 *
 * 安全：
 * - 外掛缺失／非 native → 不發放權益、不自動開 mock
 * - 假 IAP 僅由 game.js 的 colorTubeSort_devIap===1 控制（本檔從不設置該旗標）
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'colorTubeSort_v2';
  /** Play Console / App Store Connect 產品 ID（可改） */
  const REMOVE_ADS = 'remove_ads';

  const state = {
    ready: false,
    billingSupported: false,
    pluginPresent: false,
    restoredOnce: false,
    lastError: null,
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

  function getPlugin() {
    try {
      const plugins = (global.Capacitor && Capacitor.Plugins) || {};
      return plugins.NativePurchases || global.NativePurchases || null;
    } catch (_) {
      return null;
    }
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch (_) {
      return {};
    }
  }

  function mergeSave(patch) {
    const data = readSave();
    Object.assign(data, patch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function grantRemoveAds(source) {
    mergeSave({ removeAds: true });
    console.info('[Billing] granted removeAds via', source);
    try {
      global.dispatchEvent(
        new CustomEvent('colortube:remove-ads', { detail: { source: source } })
      );
    } catch (_) { /* ignore */ }
  }

  function isRemoveAdsOwned() {
    try {
      const data = readSave();
      return !!(data && data.removeAds);
    } catch (_) {
      return false;
    }
  }

  /**
   * @returns {Promise<boolean>} true if native billing plugin is usable
   */
  async function initBilling() {
    state.lastError = null;
    if (!isNative()) {
      console.info('[Billing] web — no Play Billing; shop click must not grant');
      state.ready = true;
      state.billingSupported = false;
      state.pluginPresent = false;
      return false;
    }
    const NP = getPlugin();
    if (!NP) {
      console.warn('[Billing] NativePurchases plugin missing — run npx cap sync');
      state.ready = true;
      state.pluginPresent = false;
      state.billingSupported = false;
      return false;
    }
    state.pluginPresent = true;
    try {
      if (typeof NP.isBillingSupported === 'function') {
        const r = await NP.isBillingSupported();
        state.billingSupported = !!(r && r.isBillingSupported);
      } else {
        state.billingSupported = true;
      }
      if (state.billingSupported && typeof NP.getProducts === 'function') {
        try {
          await NP.getProducts({
            productIdentifiers: [REMOVE_ADS],
            productType: 'inapp',
          });
        } catch (e) {
          console.warn('[Billing] getProducts (product may not exist yet)', e);
        }
      }
      state.ready = true;
      console.info('[Billing] ready', platform(), {
        billingSupported: state.billingSupported,
      });
      return state.billingSupported;
    } catch (e) {
      state.lastError = String(e && e.message ? e.message : e);
      console.warn('[Billing] init failed', e);
      state.ready = true;
      state.billingSupported = false;
      return false;
    }
  }

  function isBillingReady() {
    return !!(state.ready && state.pluginPresent && state.billingSupported && isNative());
  }

  /**
   * Real purchase only. Does NOT fall back to mock grants.
   * @returns {Promise<boolean>} true if owned after attempt
   */
  async function purchaseRemoveAds() {
    if (isRemoveAdsOwned()) return true;
    if (!isBillingReady()) {
      console.info('[Billing] purchase skipped — not native/ready (no mock grant)');
      return false;
    }
    const NP = getPlugin();
    try {
      await NP.purchaseProduct({
        productIdentifier: REMOVE_ADS,
        productType: 'inapp',
      });
      grantRemoveAds('purchase');
      return true;
    } catch (e) {
      state.lastError = String(e && e.message ? e.message : e);
      console.warn('[Billing] purchaseRemoveAds failed/cancelled', e);
      return false;
    }
  }

  /**
   * Restore previous purchases; grants only if store confirms ownership.
   * @returns {Promise<boolean>} true if remove_ads owned after restore
   */
  async function restorePurchases() {
    if (!isBillingReady()) {
      console.info('[Billing] restore skipped — not native/ready');
      return isRemoveAdsOwned();
    }
    const NP = getPlugin();
    try {
      const result = await NP.restorePurchases();
      state.restoredOnce = true;
      const info = result && result.customerInfo;
      const ids =
        (info && info.allPurchasedProductIdentifiers) ||
        (info && info.activeSubscriptions) ||
        [];
      const list = Array.isArray(ids) ? ids : [];
      const owned =
        list.indexOf(REMOVE_ADS) !== -1 ||
        list.some(function (id) {
          return id === REMOVE_ADS;
        });
      if (owned) {
        grantRemoveAds('restore');
        return true;
      }
      // Some Android builds only return transactions; be conservative — no grant
      console.info('[Billing] restore done — remove_ads not found in entitlements');
      return isRemoveAdsOwned();
    } catch (e) {
      state.lastError = String(e && e.message ? e.message : e);
      console.warn('[Billing] restorePurchases failed', e);
      return isRemoveAdsOwned();
    }
  }

  /** Call once on shop open / app init when native */
  async function restorePurchasesOnce() {
    if (state.restoredOnce) return isRemoveAdsOwned();
    if (!isNative()) return isRemoveAdsOwned();
    if (!state.ready) await initBilling();
    if (!isBillingReady()) {
      state.restoredOnce = true;
      return isRemoveAdsOwned();
    }
    return restorePurchases();
  }

  global.ColorTubeBilling = {
    REMOVE_ADS: REMOVE_ADS,
    init: initBilling,
    initBilling: initBilling,
    purchaseRemoveAds: purchaseRemoveAds,
    restorePurchases: restorePurchases,
    restorePurchasesOnce: restorePurchasesOnce,
    isRemoveAdsOwned: isRemoveAdsOwned,
    isBillingReady: isBillingReady,
    state: state,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initBilling();
    });
  } else {
    initBilling();
  }
})(typeof window !== 'undefined' ? window : globalThis);
