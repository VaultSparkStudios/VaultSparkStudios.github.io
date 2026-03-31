// VaultSpark Studios — Service Worker
// Handles: Push Notifications + Offline Asset Caching

const CACHE_NAME = 'vaultspark-20260331-5ad9f0f';
const MAX_PAGE_ENTRIES = 60;
const PAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATIC_ASSETS = [
  '/',
  '/assets/style.css',
  '/assets/kit.js',
  '/assets/icon-32.png',
  '/assets/icon-256.png',
  '/assets/vaultspark-icon.webp',
  '/assets/vaultspark-cinematic-logo.webp',
  '/vault-member/portal-core.js',
  '/vault-member/portal-auth.js',
  '/vault-member/portal-dashboard.js',
  '/vault-member/portal-features.js',
  '/vault-member/portal-challenges.js',
  '/vault-member/portal-settings.js',
  '/assets/game-utils.js',
  '/assets/countdown.js',
  '/assets/nav-toggle.js',
  '/assets/theme-toggle.js',
  '/assets/turnstile.js',
  '/assets/pwa-nav.js',
  '/vault-member/portal.css',
  '/offline.html',
  '/404.html',
  '/games/',
  '/vault-member/',
  '/leaderboards/',
  '/community/',
  '/ranks/',
  '/journal/',
  '/games/call-of-doodie/',
  '/games/gridiron-gm/',
  '/games/vaultspark-football-gm/',
  '/journal/001-the-vault-is-sparked/',
  '/universe/',
  '/roadmap/',
  '/contact/',
  '/studio/',
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
  // Cache capped at 60 entries; stale entries expire after 5 minutes
  if (url.hostname.includes('supabase.co') && request.method === 'GET') {
    const API_CACHE = CACHE_NAME + '-api';
    const MAX_API_ENTRIES = 60;
    const API_TTL_MS = 5 * 60 * 1000; // 5 minutes

    e.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        // Check TTL on cached response
        if (cached) {
          const cachedAt = cached.headers.get('x-cached-at');
          if (cachedAt && Date.now() - Number(cachedAt) > API_TTL_MS) {
            await cache.delete(request);
          }
        }

        const validCached = await cache.match(request);
        const fetchPromise = fetch(request).then(async (res) => {
          if (res.ok) {
            // Stamp response with cache time
            const headers = new Headers(res.headers);
            headers.set('x-cached-at', String(Date.now()));
            const stamped = new Response(await res.clone().arrayBuffer(), { status: res.status, headers });
            await cache.put(request, stamped);

            // Enforce max entries
            const keys = await cache.keys();
            if (keys.length > MAX_API_ENTRIES) {
              await cache.delete(keys[0]);
            }
          }
          return res;
        }).catch(() => validCached);

        return validCached || fetchPromise;
      })
    );
    return;
  }

  // Only handle same-origin requests beyond this point
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate for assets (CSS, JS, images, fonts)
  // Serves cached version immediately while fetching fresh copy in background
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
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

  // Network-first for HTML pages — fall back to cache, then offline
  // Cache capped at MAX_PAGE_ENTRIES; stale entries expire after PAGE_TTL_MS
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            const headers = new Headers(res.headers);
            headers.set('x-cached-at', String(Date.now()));
            const stamped = new Response(await res.clone().arrayBuffer(), { status: res.status, headers });
            await cache.put(request, stamped);
            const keys = await cache.keys();
            if (keys.length > MAX_PAGE_ENTRIES) await cache.delete(keys[0]);
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) {
            const cachedAt = cached.headers.get('x-cached-at');
            if (cachedAt && Date.now() - Number(cachedAt) > PAGE_TTL_MS) {
              await cache.delete(request);
              return caches.match('/offline.html');
            }
            return cached;
          }
          return caches.match('/offline.html');
        })
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
      badge: '/assets/icon-32.png',
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
