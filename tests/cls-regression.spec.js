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
// S279: added /ranks/, /join/, /vault-wall/ — the Supabase-fill routes (S335:
// /vault-wall/ folded into /community/, already listed). /ranks/
// carried a 0.29 CLS (rank-quest post-paint mount above the ladder) that this
// gate missed purely because the route wasn't listed; the coverage hole let it
// pin Lighthouse perf at 0.81<0.82. Root-fixed via mount-height reservation
// (D-S279.1); these three now guard that the fill stays shift-free.
const ROUTES = [
  '/',
  '/membership/',
  '/games/',
  '/universe/',
  '/studio-pulse/',
  '/oracle/',
  '/changelog/',
  '/projects/',
  '/ranks/',
  '/join/',
];

/** Load a route and return buffered CLS after the page settles. */
async function measureCls(page, route) {
  await page.addInitScript(() => {
    window.__cls = 0;
    window.__clsEntries = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__cls += entry.value;
        window.__clsEntries.push({
          value: entry.value,
          sources: (entry.sources || []).map((source) => ({
            node: source.node
              ? source.node.tagName.toLowerCase()
                + (source.node.id ? '#' + source.node.id : '')
                + (source.node.classList && source.node.classList.length
                  ? '.' + Array.from(source.node.classList).join('.')
                  : '')
              : 'unknown',
            previousRect: source.previousRect,
            currentRect: source.currentRect,
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 20000 });
  // Give idle-loaded ambient scripts time to run any (now-reserved) injections.
  await page.waitForTimeout(1800);
  return page.evaluate(() => ({ value: window.__cls, entries: window.__clsEntries }));
}

test.describe('CLS regression budget (mobile 390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route} stays under ${CLS_BUDGET} CLS`, async ({ page }) => {
      const cls = await measureCls(page, route);
      const sources = cls.entries
        .flatMap((entry) => entry.sources.map((source) => source.node))
        .filter((node, index, all) => all.indexOf(node) === index)
        .join(', ');
      if (cls.value >= CLS_BUDGET) {
        console.error(`${route} CLS entries: ${JSON.stringify(cls.entries)}`);
        const geometry = await page.evaluate(() =>
          [
            '.cl-time-machine',
            '.cl-filter',
            '.cl-timeline',
            '#vs-vault-kinesis',
            '#forge-heartbeat',
            '[aria-labelledby="heartbeat-heading"]',
            '#current-focus',
          ].map((selector) => {
            const node = document.querySelector(selector);
            const rect = node && node.getBoundingClientRect();
            return { selector, rect, hidden: node ? node.hidden : null };
          }),
        );
        console.error(`${route} CLS geometry: ${JSON.stringify(geometry)}`);
      }
      expect(
        cls.value,
        `${route} buffered CLS ${cls.value.toFixed(4)} exceeds budget ${CLS_BUDGET}`
          + (sources ? `; shifted: ${sources}` : ''),
      ).toBeLessThan(CLS_BUDGET);
    });
  }
});

test.describe('CLS regression budget (desktop changelog controls)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test(`/changelog/ stays under ${CLS_BUDGET} CLS on desktop`, async ({ page }) => {
    const cls = await measureCls(page, '/changelog/');
    const sources = cls.entries
      .flatMap((entry) => entry.sources.map((source) => source.node))
      .filter((node, index, all) => all.indexOf(node) === index)
      .join(', ');
    expect(cls.value, `/changelog/ desktop CLS ${cls.value.toFixed(4)}; shifted: ${sources}`).toBeLessThan(CLS_BUDGET);
  });
});
