
// Basic PWA Service Worker for Notas Cortas
const CACHE_NAME = 'notas-cortas-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navigation requests: App Shell-style, fallback to offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // Same-origin: Cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => 
        cached || fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return res;
        })
      )
    );
    return;
  }

  // Cross-origin: Network-first with cache fallback
  event.respondWith(
    fetch(request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return res;
    }).catch(() => caches.match(request))
  );
});
