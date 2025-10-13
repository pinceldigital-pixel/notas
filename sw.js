const CACHE = 'notinote-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.map(k=> k===CACHE?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET'){ return; }
  e.respondWith(caches.match(req).then(res=> res || fetch(req)));
});
self.addEventListener('notificationclick', e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
    for(const c of list){ if('focus' in c) return c.focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  }));
});