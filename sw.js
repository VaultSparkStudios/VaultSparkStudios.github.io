// VaultSpark Studios — Service Worker
// Handles Web Push Notifications (Phase 9)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', function (event) {
  let data = {
    title: 'VaultSpark Studios',
    body:  'New content is waiting in the Vault.',
    url:   '/vault-member/',
  };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/assets/icon-256.png',
      badge: '/assets/favicon.png',
      tag:   'vaultspark-push',
      data:  { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/vault-member/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
      for (const win of wins) {
        if ('focus' in win) { win.navigate(url); return win.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
