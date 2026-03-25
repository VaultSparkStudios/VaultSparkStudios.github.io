// VaultSpark Studios — Service Worker
// Handles: Push Notifications + Offline Asset Caching

const CACHE_NAME = 'vaultspark-v3';
const STATIC_ASSETS = [
  '/',
  '/assets/style.css',
  '/assets/kit.js',
  '/assets/favicon.png',
  '/assets/icon-256.png',
  '/assets/vaultspark-icon.webp',
  '/assets/vaultspark-cinematic-logo.webp',
  '/404.html',
  '/games/',
  '/vault-member/',
  '/leaderboards/',
  '/community/',
  '/ranks/',
  '/journal/',
];

// ── Install: cache static assets ──────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static assets, network-first for pages ─────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Stale-while-revalidate for Supabase API reads (cross-origin)
  if (url.hostname.includes('supabase.co') && request.method === 'GET') {
    e.respondWith(
      caches.open('vaultspark-api-v1').then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Only handle same-origin requests beyond this point
  if (url.origin !== self.location.origin) return;

  // Cache-first strategy for assets (CSS, JS, images, fonts)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // Network-first for HTML pages — fall back to cache, then 404
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/404.html'))
        )
    );
  }
});

// ── Push Notifications ─────────────────────────────────────────────────────
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
