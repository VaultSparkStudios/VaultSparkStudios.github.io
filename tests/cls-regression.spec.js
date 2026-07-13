const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

/**
 * CLS-regression gate (S277 · genius-list #94 — structural prevention of the
 * 1.03-accumulation class).
 *
 * Buffered Cumulative Layout Shift is measured at a 390px mobile viewport (where
 * post-paint injection hurts most) on every route with dynamic post-paint content.
 * Any route over the Core-Web-Vitals "good" ceiling (0.10) fails the build.
 *
 * This locks in the S277 root-fixes: /changelog/ 0.73→0.0006 (you-asked-shipped SSR),
 * /universe/ 0.27, /games/ 0.18 (flight-director SSR), /membership/ 0.11 (interview
 * mount reservation). If a future change reintroduces an unreserved post-paint insert,
 * this gate catches it before it ships instead of accumulating unseen.
 *
 * Runs in the e2e "compliance" job against the local preview artifact (no secrets),
 * so failures reflect repo behavior, not the Cloudflare edge challenge page.
 */

const CLS_BUDGET = 0.1;

// Routes with dynamic post-paint surfaces (ambient widgets, SSR panels, feeds).
const ROUTES = [
  '/',
  '/membership/',
  '/games/',
  '/universe/',
  '/studio-pulse/',
  '/oracle/',
  '/changelog/',
  '/projects/',
];

/** Load a route and return buffered CLS after the page settles. */
async function measureCls(page, route) {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 20000 });
  // Give idle-loaded ambient scripts time to run any (now-reserved) injections.
  await page.waitForTimeout(1800);
  return page.evaluate(() => window.__cls);
}

test.describe('CLS regression budget (mobile 390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route} stays under ${CLS_BUDGET} CLS`, async ({ page }) => {
      const cls = await measureCls(page, route);
      expect(cls, `${route} buffered CLS ${cls.toFixed(4)} exceeds budget ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
    });
  }
});
