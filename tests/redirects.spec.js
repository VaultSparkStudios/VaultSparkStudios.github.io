// redirects.spec.js
// S147 redirect-stub-purge: contract test for the 39 legacy/duplicate paths
// retired from the static repo and replaced with Worker Layer 0c edge 301s.
// Verifies each old URL returns 301 (not 200 with meta-refresh) and lands at
// the documented canonical destination.

const { test, expect, request } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

const LEGACY_301 = [
  // Root-level legacy slugs
  ['/gridiron-gm',               '/games/gridiron-gm/'],
  ['/vaultfront',                '/games/vaultfront/'],
  ['/open-source',               '/rights/'],
  // S160 #20 (redundance-purge): /signal-log/ retired into /journal/
  ['/signal-log',                '/journal/'],
  // Investor portal canonicalization
  ['/investor',                  '/investor-portal/'],
  ['/investor/admin',            '/investor-portal/admin/'],
  ['/investor/apply',            '/investor-portal/apply/'],
  ['/investor/documents',        '/investor-portal/documents/'],
  ['/investor/login',            '/investor-portal/login/'],
  ['/investor/message',          '/investor-portal/message/'],
  ['/investor/profile',          '/investor-portal/profile/'],
  ['/investor/updates',          '/investor-portal/updates/'],
  // /products/ tree
  ['/products',                  '/projects/'],
  ['/products/canon',            '/projects/canon/'],
  ['/products/gridiron-gm',      '/games/gridiron-gm/'],
  ['/products/gridiron-gm-play', '/games/gridiron-gm/'],
  ['/products/ideaforge',        '/projects/ideaforge/'],
  ['/products/living-protocol',  '/projects/the-living-protocol/'],
  ['/products/mindframe',        '/games/mindframe/'],
  ['/products/orva-eon',         '/studio/'],
  ['/products/promogrind',       '/projects/promogrind/'],
  ['/products/scriptorium',      '/studio/'],
  ['/products/seamline',         '/projects/seamline/'],
  ['/products/solara',           '/games/solara/'],
  ['/products/sparkfunnel',      '/studio/'],
  ['/products/statvault',        '/projects/statvault/'],
  ['/products/studio-ops',       '/studio/'],
  ['/products/the-exodus',       '/games/the-exodus/'],
  ['/products/vaultfront',       '/games/vaultfront/'],
  ['/products/vaultspark-football-gm',                '/games/vaultspark-football-gm/'],
  ['/products/vaultspark-forge',                      '/studio/'],
  ['/products/vaultspark-ignis',                      '/ignis/'],
  ['/products/vaultspark-studio-hub',                 '/studio/'],
  ['/products/vaultspark-studios-social-dashboard',   '/studio/'],
  ['/products/vaultsparkstudios-website',             '/'],
  ['/products/velaxis',          '/projects/velaxis/'],
  ['/products/voidfall',         '/universe/voidfall/'],
  ['/products/voidfall-companion', '/universe/voidfall/'],
];

const EXTERNAL_301 = [
  ['/call-of-doodie',          'https://callofdoodie.wtf/'],
  ['/products/call-of-doodie', 'https://callofdoodie.wtf/'],
  ['/products/vorn',           'https://joinvorn.com/'],
];

test.describe('Legacy path redirects (S147 redirect-stub-purge)', () => {
  test('Same-origin legacy paths return 301 to canonical', async () => {
    test.skip(IS_LOCAL, 'CF Worker 301 redirects not present in local preview');
    const api = await request.newContext({ baseURL: BASE });
    for (const [from, to] of LEGACY_301) {
      const res = await api.fetch(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} should 301`).toBe(301);
      const loc = res.headers()['location'] || '';
      expect.soft(loc, `${from} should redirect to ${to}`).toContain(to);
    }
  });

  test('External canonical domains return 301', async () => {
    test.skip(IS_LOCAL, 'CF Worker 301 redirects not present in local preview');
    const api = await request.newContext({ baseURL: BASE });
    for (const [from, to] of EXTERNAL_301) {
      const res = await api.fetch(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} should 301`).toBe(301);
      const loc = res.headers()['location'] || '';
      expect.soft(loc, `${from} should redirect to ${to}`).toBe(to);
    }
  });
});

// S275 (audit #18): the Worker ships ~11 conversion-path redirect rules that the
// S147 tables above never covered — leaderboard hash-tab 301s, the S205
// membership-cluster consolidation pair, /projects/vaultfront, and the
// hub-subdomain cutover. A regression in any of these drops a visitor on a 404
// while CI stays green. Same table-driven harness; hash targets use toContain.
const WORKER_LAYER0C_301 = [
  // LEADERBOARD_REDIRECTS (S147 leaderboards-collapse)
  ['/leaderboards/call-of-doodie', '/leaderboards/#doodie'],
  ['/leaderboards/challenges',     '/leaderboards/#challenges'],
  ['/leaderboards/football-gm',    '/leaderboards/#football'],
  ['/leaderboards/global',         '/leaderboards/#global'],
  ['/leaderboards/teams',          '/leaderboards/#teams'],
  ['/leaderboards/weekly',         '/leaderboards/#weekly'],
  ['/leaderboards/recruiters',     '/leaderboards/#referrals'],
  // S205 #10 membership cluster consolidation
  ['/membership-value',            '/membership/#benefits'],
  ['/vaultsparked',                '/membership/#tiers'],
  // Legacy project → game canonical
  ['/projects/vaultfront',         '/games/vaultfront/'],
];

test.describe('Worker Layer-0c redirect coverage (S275)', () => {
  test('Leaderboard, membership-consolidation, and project 301s land on canonical targets', async () => {
    test.skip(IS_LOCAL, 'CF Worker 301 redirects not present in local preview');
    const api = await request.newContext({ baseURL: BASE });
    for (const [from, to] of WORKER_LAYER0C_301) {
      const res = await api.fetch(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} should 301`).toBe(301);
      const loc = res.headers()['location'] || '';
      expect.soft(loc, `${from} should redirect to ${to}`).toContain(to);
    }
  });

  test('Hub subdomain cutover 301s /studio-hub/* to hub.vaultsparkstudios.com', async () => {
    test.skip(IS_LOCAL, 'CF Worker 301 redirects not present in local preview');
    const api = await request.newContext({ baseURL: BASE });
    const res = await api.fetch('/studio-hub/', { maxRedirects: 0 });
    // Gated by HUB_SUBDOMAIN_ENABLED — enabled in production wrangler.toml vars.
    expect.soft(res.status(), '/studio-hub/ should 301 to hub subdomain').toBe(301);
    const loc = res.headers()['location'] || '';
    expect.soft(loc, '/studio-hub/ should land on the hub subdomain').toContain('hub.vaultsparkstudios.com');
  });
});
