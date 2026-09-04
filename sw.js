// VaultSpark Studios — Service Worker
// Handles: Push Notifications + Offline Asset Caching

const CACHE_NAME = 'vaultspark-shell-e52accd83d420362';
// STATIC_ASSETS changes take effect on the next shell-asset hash rotation
// (any edit to style.css / theme-toggle.js / nav-toggle.js / shell-health.js
// triggers a new CACHE_NAME via build-shell-assets.mjs, which evicts the
// stale precache for every user). Precache drift between that and the
// PORTAL_GATE flow is bounded: new entries are fetched on-demand when first
// requested, they're just not available offline until the cache rotates.
const MAX_PAGE_ENTRIES = 60;
const PAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FINGERPRINTED_SHELL_ASSETS = [
  '/assets/style.shell-bf10f7005d.css',
  '/assets/theme-toggle.shell-8221605898.js',
  '/assets/nav-toggle.shell-8c1f2155b5.js',
  '/assets/shell-health.shell-0995bd7945.js',
  '/assets/nav-sheet.shell-d6938be4eb.js',
  '/assets/supabase-client.shell-c0eeeb2001.js',
  '/assets/sentry-init.shell-8b1d92d92b.js',
  '/assets/home-idle-loader.shell-6f2bb4fa73.js',
  '/assets/ambient-core.shell-a2aa51d885.js',
  '/assets/ambient-feature.shell-ca3b329506.js',
  '/assets/proof-verify.shell-4b68e2855f.js',
  '/assets/desk-reactions.shell-3f177f4c17.js',
  '/assets/desk-presence.shell-8e69ca1566.js',
  '/assets/stats-surface.shell-b33242e1cc.js',
  '/assets/ecosystem-stats.shell-e6b0b21c77.js',
  '/assets/hero-choice-tracking.shell-8dd57eb3a3.js',
  '/assets/journey-conductor.shell-a910e120bb.js',
];
const NON_CACHEABLE_SHELL_SOURCES = [
  '/assets/style.css',
  '/assets/theme-toggle.js',
  '/assets/nav-toggle.js',
  '/assets/shell-health.js',
  '/assets/nav-sheet.js',
  '/assets/supabase-client.js',
  '/assets/sentry-init.js',
  '/assets/home-idle-loader.js',
  '/assets/ambient-core.bundle.js',
  '/assets/ambient-feature.bundle.js',
  '/assets/proof-verify.js',
  '/assets/desk-reactions.js',
  '/assets/desk-presence.js',
  '/assets/stats-surface.js',
  '/assets/ecosystem-stats.js',
  '/assets/hero-choice-tracking.js',
  '/assets/journey-conductor.js',
];
const STATIC_ASSETS = [
  '/',
  '/assets/style.shell-bf10f7005d.css',
  '/assets/shell-health.shell-0995bd7945.js',
  '/assets/ambient-core.shell-a2aa51d885.js',
  '/assets/ambient-feature.shell-ca3b329506.js',
  '/assets/kit.js',
  '/assets/icon-32.png',
  '/assets/icon-256.png',
  '/assets/vaultspark-icon.webp',
  '/assets/social-icons.svg',
  '/vault-member/portal-core.js',
  '/vault-member/portal-auth.js',
  '/vault-member/portal-dashboard.js',
  '/vault-member/portal-features.js',
  '/vault-member/portal-challenges.js',
  '/vault-member/portal-settings.js',
  '/vault-member/portal-init.js',
  '/assets/game-utils.js',
  '/assets/countdown.js',
  '/assets/nav-toggle.shell-8c1f2155b5.js',
  '/assets/members-directory.js',
  '/assets/analytics.js',
  '/assets/theme-toggle.shell-8221605898.js',
  '/assets/vault-score.js',
  '/assets/turnstile.js',
  '/assets/hover-prefetch.js',
  '/assets/edge-swipe-nav.js',
  '/assets/dispatch-voice.js',
  '/assets/pointerdown-warm.js',
  '/assets/page-sigil.js',
  '/assets/vault-atlas.js',
  '/assets/vault-genome-strip.js',
  '/assets/rank-orb.js',
  '/assets/pwa-nav.js',
  '/assets/studio-stats.js',
  '/assets/intent-state.js',
  '/assets/telemetry-matrix.js',
  '/assets/trust-depth.js',
  '/assets/network-spine.js',
  '/assets/micro-feedback.js',
  '/assets/pathways-router.js',
  '/assets/related-content.js',
  '/assets/membership-stats.js',
  '/assets/scroll-reveal.js',
  '/assets/scroll-depth.js',
  '/assets/notify-me.js',
  '/vault-member/portal-share.js',
  '/vault-member/portal.css',
  '/offline.html',
  '/404.html',
  '/games/',
  '/vault-member/',
  '/leaderboards/',
  '/community/',
  '/journal/',
  '/games/call-of-doodie/',
  '/games/gridiron-gm/',
  '/games/franchise-architect/',
  '/journal/first-sparks/',
  '/universe/',
  '/universe/voidfall/',
  '/universe/dreadspike/',
  '/roadmap/',
  '/contact/',
  '/studio/',
  '/membership/',
  '/invite/',
  '/press/',
  '/changelog/',
  '/vaultsparked/vaultsparked-checkout.js',
  '/vaultsparked/billing-toggle.js',
  '/share/',
  '/ignis/',
  '/social/',
  '/notebook/',
  '/games/mindframe/',
  '/games/the-exodus/',
  '/games/vaultfront/',
  '/games/solara/',
  '/assets/native-feel.js',
  '/assets/ignis-lens.js',
  '/assets/vault-oracle.js',
  '/assets/lore-gates.js',
  '/assets/vault-heartbeat.js',
  '/assets/csrf-token.js',
  // S98 ambient / moonshot assets
  '/assets/heartbeat.js',
  '/assets/presence-badge.js',
  '/assets/ignis-tour.js',
  '/assets/visit-depth.js',
  '/assets/notify-me.js',
  '/assets/exit-intent.js',
  '/assets/scroll-reveal.js',
  '/assets/scroll-depth.js',
  // S100 assets
  '/assets/rank-projector.js',
  '/assets/changelog-reactions.js',
  '/assets/vault-resonance.js',
  '/assets/vault-pulse.js',
  // S105 assets — Eternal credits splash pipeline
  '/assets/eternal-credits.js',
  // S113 (P7 + P3) — sitewide ambient additions
  '/assets/breadcrumb-render.js',
  '/assets/rate-page.js',
  '/assets/account-chip.js',
  '/assets/studio-living.js',
  '/studio-pulse/',
  '/faq/',
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

  // Stale-while-revalidate only for anonymous public Supabase REST reads.
  // Do not cache authenticated requests, auth endpoints, RPC calls, or storage fetches.
  // Cache capped at 60 entries; stale entries expire after 5 minutes.
  const isSupabaseRead =
    url.hostname.includes('supabase.co') &&
    request.method === 'GET' &&
    url.pathname.includes('/rest/v1/') &&
    !request.headers.get('authorization');

  if (isSupabaseRead) {
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
    if (NON_CACHEABLE_SHELL_SOURCES.includes(url.pathname)) {
      e.respondWith(fetch(request));
      return;
    }

    const shouldCacheAsset =
      FINGERPRINTED_SHELL_ASSETS.includes(url.pathname) ||
      !NON_CACHEABLE_SHELL_SOURCES.some((assetPath) => url.pathname === assetPath);

    if (!shouldCacheAsset) {
      e.respondWith(fetch(request));
      return;
    }

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
function rumBeacon(uxName) {
  try {
    fetch('/v/rum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: '/sw', ux: uxName }),
      keepalive: true,
    }).catch(function () {});
  } catch (_) {}
}

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
    }).then(function () { rumBeacon('push:received'); })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  rumBeacon('push:clicked');
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
