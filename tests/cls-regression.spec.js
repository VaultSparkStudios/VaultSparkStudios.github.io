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
// S356: added /faq/, /journal/dispatches/, /notebook/, /social/ — four routes a
// site-wide crawl caught carrying the worst CLS on the site while this gate was
// blind to them (/faq/ 0.419, /journal/dispatches/ 0.310, /notebook/ 0.243, and
// /social/ 0.438 at mobile width). All four were root-fixed to ~0 by reserving
// space for their post-paint mounts; the entries below keep them that way.
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
  '/faq/',
  '/journal/dispatches/',
  '/notebook/',
  '/social/',
];

// Per-route ceilings, tighter than the shared CWV budget where the route has
// actually earned it. A route measured at 0.002 does not need 0.1 of headroom:
// that much slack would let a shift 100x larger than today's land without
// failing anything.
//
// Measured at 390px against the local preview artifact, 3 passes each:
//   /journal/dispatches/  0.0021 / 0      / 0.0021
//   /notebook/            0      / 0      / 0.0021
//   /social/              0.0021 / 0.0021 / 0
// The residual 0.0021 on all three is a SITEWIDE header shift (div.nav-right,
// 44px tall, settling in place), not the per-route post-paint insert each of
// these entries exists to guard. 0.02 sits an order of magnitude above that
// floor and two orders below the 0.236–0.310 regressions being locked out.
//
// /faq/ measures 0.0021 / 0.0021 / 0.0021 at 390px and 0 / 0 / 0 at 1366px
// (3 passes each, against the local preview). The residual 0.0021 is the same
// sitewide div.nav-right settle as the three routes above — div#faq-root no
// longer appears as a shift source at either width.
//
// The earlier 0.0593 residual was an UNDER-reservation, not the over-reservation
// previously recorded here (the skeleton was measured at 1402px against a real
// list of 1553px at 390px, so the page moved DOWN, not up). Two causes, both
// width-dependent, which is why no fixed height could fix it: the skeleton
// reserved a flat 56px per row while a real row is 63.8px — the summary is a
// flex row whose height floor is the 1.2rem "+" marker, not the 0.95rem question
// text — and two questions wrap to a second line at 390px (81.1px), while the
// category chip bar wraps to three rows (94.4px) against a flat 38px min-height.
// Root-fixed in faq/index.html by giving the skeleton the real row box and the
// real question text, and pre-rendering the chips, so wrapping, typography and
// margin-collapsing match the hydrated list by construction at every width.
const ROUTE_BUDGETS = {
  '/journal/dispatches/': 0.02,
  '/notebook/': 0.02,
  '/social/': 0.02,
  '/faq/': 0.02,
};
const budgetFor = (route) => ROUTE_BUDGETS[route] ?? CLS_BUDGET;

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
    const budget = budgetFor(route);
    test(`${route} stays under ${budget} CLS`, async ({ page }) => {
      const cls = await measureCls(page, route);
      const sources = cls.entries
        .flatMap((entry) => entry.sources.map((source) => source.node))
        .filter((node, index, all) => all.indexOf(node) === index)
        .join(', ');
      if (cls.value >= budget) {
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
        `${route} buffered CLS ${cls.value.toFixed(4)} exceeds budget ${budget}`
          + (sources ? `; shifted: ${sources}` : ''),
      ).toBeLessThan(budget);
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
