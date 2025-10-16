// sw.js — Service Worker para notificaciones y PWA
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('message', event => {
  const data = event.data || {};
  const { type, payload } = data;
  if (type === 'show-now') {
    const { title, body, tag, icon } = payload || {};
    self.registration.showNotification(title || 'Recordatorio', {
      body: body || '',
      tag: tag || 'nota',
      icon: icon || './icons/icon-192.png',
      badge: icon || './icons/icon-192.png',
    });
  } else if (type === 'cancel-notification') {
    const { tag } = payload || {};
    self.registration.getNotifications({ tag }).then(list => list.forEach(n => n.close()));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const c = cs.find(w => 'focus' in w);
      if (c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
