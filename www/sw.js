/* ColorTube Sort — offline service worker (PWA-OFFLINE) */
const CACHE_NAME = 'colortube-offline-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './site.webmanifest',
  './assets/css/style.css',
  './assets/js/levels.js',
  './assets/js/ads.js',
  './assets/js/billing.js',
  './assets/js/analytics.js',
  './assets/js/analytics-config.js',
  './assets/js/analytics-ga4.js',
  './assets/js/game.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/audio/pour.ogg',
  './assets/audio/pour.mp3',
  './assets/audio/land.ogg',
  './assets/audio/land.mp3',
  './assets/audio/complete.ogg',
  './assets/audio/complete.mp3',
  './assets/audio/uncap.ogg',
  './assets/audio/uncap.mp3',
  './assets/audio/win.ogg',
  './assets/audio/win.mp3',
  './assets/audio/blocked.ogg',
  './assets/audio/blocked.mp3',
  './assets/audio/ui_tap.ogg',
  './assets/audio/ui_tap.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.includes('text/html');
}

function isSameOriginAsset(url) {
  return url.origin === self.location.origin && url.pathname.includes('/assets/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Never cache opaque / cross-origin responses blindly (fonts, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(request) || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match('./index.html') ||
              caches.match('/index.html') ||
              caches.match('./')
          )
        )
    );
    return;
  }

  if (isSameOriginAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
