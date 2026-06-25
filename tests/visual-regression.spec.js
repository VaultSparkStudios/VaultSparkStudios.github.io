// visual-regression.spec.js — Mobile-surface pixel-diff snapshots.
//
// S131 audit #4. Catches the S130 bug class (brand cutoff · dark drawer · IGNIS
// dot-on-scroll) on the PR before founder ever sees it. Snapshots are committed
// under `tests/__snapshots__/visual-regression.spec.js-snapshots/`.
//
// To re-baseline after an intentional UI change:
//   npx playwright test tests/visual-regression.spec.js --update-snapshots
//
// Tolerance: 0.5% pixel diff allowed (covers anti-alias jitter across runs).
// Mobile-only — the S130 bug cluster was mobile-specific. Desktop is covered
// by separate computed-styles + accessibility specs.

import { test, expect, devices } from '@playwright/test';

const BASE_URL = process.env.VR_BASE_URL || 'https://vaultsparkstudios.com';
const PIXEL_RATIO_TOLERANCE = 0.005; // 0.5%

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

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`visual regression · ${vp.name} · ${theme}`, () => {
      test.use(emulationOnly(vp.config));

      for (const surface of SURFACES) {
        test(`${surface.name} · ${vp.name} · ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => {
          try { localStorage.setItem('vs-theme', t); } catch (_) {}
        }, theme);

        // Use 'load' (not 'networkidle') — pages like /oracle/ have ongoing beacon
        // traffic that never reaches networkidle, causing 30s timeouts (S223).
        // 'load' waits for the window.load event which is sufficient for VR.
        await page.goto(BASE_URL + surface.path, { waitUntil: 'load', timeout: 30000 });
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
        await page.waitForTimeout(600); // extra settle for deferred/async renders post-load
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
