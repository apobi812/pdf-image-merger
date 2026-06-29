const CACHE_NAME = 'toolkit-v28';
const OFFLINE_URL = './offline.html';
const APP_SHELL = [
  './',
  './index.html',
  OFFLINE_URL,
  './pdf/index.html',
  './word-count/index.html',
  './video-extractor/index.html',
  './about/index.html',
  './privacy/index.html',
  './terms/index.html',
  './security/index.html',
  './styles.css?v=20260629-adminlock',
  './app.js?v=20260629-adminlock',
  './manifest.webmanifest',
  './robots.txt',
  './sitemap.xml',
  './.well-known/security.txt',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/pdf-lib.min.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || await caches.match('./index.html') || await caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => (
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
    ))
  );
});
