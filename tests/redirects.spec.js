// redirects.spec.js
// S147 redirect-stub-purge: contract test for the 39 legacy/duplicate paths
// retired from the static repo and replaced with Worker Layer 0c edge 301s.
// Verifies each old URL returns 301 (not 200 with meta-refresh) and lands at
// the documented canonical destination.

const { test, expect, request } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

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
    const api = await request.newContext({ baseURL: BASE });
    for (const [from, to] of LEGACY_301) {
      const res = await api.fetch(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} should 301`).toBe(301);
      const loc = res.headers()['location'] || '';
      expect.soft(loc, `${from} should redirect to ${to}`).toContain(to);
    }
  });

  test('External canonical domains return 301', async () => {
    const api = await request.newContext({ baseURL: BASE });
    for (const [from, to] of EXTERNAL_301) {
      const res = await api.fetch(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} should 301`).toBe(301);
      const loc = res.headers()['location'] || '';
      expect.soft(loc, `${from} should redirect to ${to}`).toBe(to);
    }
  });
});
