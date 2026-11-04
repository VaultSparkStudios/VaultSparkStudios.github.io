// visual-regression.spec.js — Mobile-surface pixel-diff snapshots.
//
// S131 audit #4. Catches the S130 bug class (brand cutoff · dark drawer · IGNIS
// dot-on-scroll) on the PR before founder ever sees it. Snapshots are committed
// under `tests/__snapshots__/visual-regression.spec.js-snapshots/`.
//
// To re-baseline after an intentional UI change:
//   npx playwright test tests/visual-regression.spec.js --update-snapshots
//
// Tolerance: 1.5% pixel diff allowed. The baselines span Windows + Linux and
// production's live text can shift glyph rasterization without moving layout.
// Geometry, accessibility, and theme contracts remain covered by strict tests.
// Mobile-only — the S130 bug cluster was mobile-specific. Desktop is covered
// by separate computed-styles + accessibility specs.

import { test, expect, devices } from '@playwright/test';

const PIXEL_RATIO_TOLERANCE = 0.015; // 1.5%

const SURFACES = [
  { path: '/', name: 'home' },
  { path: '/membership/', name: 'membership' },
  { path: '/vault-member/', name: 'vault-member' },
  { path: '/games/', name: 'games' },
  { path: '/vault/tombstones/', name: 'tombstones' },
  // S160 #18: tablet + desktop + theme matrix expansion.
  { path: '/journal/', name: 'journal' },
  { path: '/oracle/', name: 'oracle' },
];

const VIEWPORTS = [
  { name: 'iphone-se', config: devices['iPhone SE'] },
  { name: 'iphone-13', config: devices['iPhone 13 Pro Max'] },
  { name: 'pixel-5', config: devices['Pixel 5'] },
  // S160 #18: cover tablet + desktop too — drawer collapse + sticky-header
  // edge cases stop being mobile-only above 980px.
  { name: 'ipad-mini', config: devices['iPad Mini'] || { viewport: { width: 768, height: 1024 } } },
  { name: 'desktop-1280', config: { viewport: { width: 1280, height: 800 } } },
];

// S160 #18: two-theme sweep — light/warm/cool/high-contrast bugs (like the S132
// `body.dark-mode` specificity trap) only surface when the saved theme flips.
const THEMES = ['dark', 'light'];

// Playwright forbids setting `defaultBrowserType` (or `browserName`) inside a
// describe group — it would force a new worker ("Cannot use({ defaultBrowserType })
// in a describe group"). The `devices[...]` descriptors carry defaultBrowserType
// (webkit for iPhone, chromium for Pixel), so spreading the whole config trips
// it. Strip the engine keys — the browser is pinned at the project level
// (--project=chromium in CI); we only want each device's viewport / UA /
// scale-factor / touch emulation here. Snapshot names already encode vp.name,
// so dropping the engine key changes nothing about which snapshot is compared.
function emulationOnly(config) {
  const { defaultBrowserType, browserName, ...rest } = config;
  return rest;
}

async function waitForVisualReadiness(page) {
  // `load` precedes deferred shell enhancement. In particular the Desk feed
  // changes the header after fonts have already loaded, moving hash targets.
  // Wait for actual app state, then require the visible layout to stop moving.
  let previous = null;
  let stableSince = 0;
  await expect.poll(async () => {
    const sample = await page.evaluate(() => {
      const wire = document.querySelector('.site-header [data-desk-wire]');
      const wireState = wire?.getAttribute('data-desk-wire-state');
      // The ambient loader intentionally skips hidden mobile strips and portals.
      const wireExpected = wire && wire.getBoundingClientRect().height > 0 &&
        !/^\/(vault-member|investor-portal|admin|api)\//.test(location.pathname) &&
        !document.documentElement.hasAttribute('data-no-strip') && !document.body.hasAttribute('data-no-strip');
      // These legacy routes redirect to hash targets. Their initial scroll
      // starts the real idle enhancement queue, including the header rank orb.
      const redirectedAnchor = ['/changelog/', '/ignis/'].includes(location.pathname) && location.hash;
      const anchorShellReady = !redirectedAnchor || !!document.querySelector('.nav-right .vs-rank-orb');
      const ready = document.fonts.status === 'loaded' &&
        [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => !!link.sheet || link.disabled) &&
        (!wireExpected || wireState === 'live' || wireState === 'latest') &&
        anchorShellReady &&
        (!window.VSAfterPaint || window.VSAfterPaint.done);
      const visible = [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      });
      return {
        ready,
        fingerprint: JSON.stringify(visible.map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return [element.tagName, element.id, Math.round(rect.x), Math.round(rect.y),
            Math.round(rect.width), Math.round(rect.height), style.opacity, style.visibility,
            style.transform, element.childElementCount ? '' : element.textContent];
        })),
      };
    });
    if (!sample.ready || sample.fingerprint !== previous) {
      previous = sample.fingerprint;
      stableSince = Date.now();
      return false;
    }
    return Date.now() - stableSince >= 500;
  }, { timeout: 5000, intervals: [100, 250, 500], message: 'app state and visible layout settle before visual comparison' }).toBe(true);
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`visual regression · ${vp.name} · ${theme}`, () => {
      test.use(emulationOnly(vp.config));

      for (const surface of SURFACES) {
        test(`${surface.name} · ${vp.name} · ${theme}`, async ({ page, baseURL }) => {
        await page.addInitScript((t) => {
          try { localStorage.setItem('vs_theme', t); } catch (_) {}
        }, theme);

        // Use 'load' (not 'networkidle') — pages like /oracle/ have ongoing beacon
        // traffic that never reaches networkidle, causing 30s timeouts (S223).
        // 'load' waits for the window.load event which is sufficient for VR.
        // Use the candidate selected by Playwright. Dedicated manual baseline
        // capture can still choose an explicit alternate VR_BASE_URL.
        await page.goto(new URL(surface.path, process.env.VR_BASE_URL || baseURL).href, { waitUntil: 'load', timeout: 30000 });
        await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
        // Suppress ambient animations + live-data flicker so snapshots are
        // deterministic. The genome-strip + sigil read from /api shards and
        // pulse — pin to a stable opacity for the snapshot.
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
            }
            .vs-genome-strip, .vs-sigil-ring, .vs-tour-offer { opacity: 1 !important; }
          `,
        });
        await waitForVisualReadiness(page);
        await expect(page).toHaveScreenshot(`${surface.name}-${vp.name}-${theme}.png`, {
          fullPage: false,
          maxDiffPixelRatio: PIXEL_RATIO_TOLERANCE,
          animations: 'disabled',
        });
        });
      }
    });
  }
}
