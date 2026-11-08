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
  // Snapshot scene: genuinely engaged, reduced-motion, settled UI. This uses
  // the shipped accessible motion preference, preserving every component.
  // Initial quiet-visit paint
  // and loading performance are verified by the separate first-viewport proof.
  // `load` precedes deferred shell enhancement. In particular the Desk feed
  // changes the header after fonts have already loaded, moving hash targets.
  // Wait for actual app state, then require the visible layout to stop moving.
  let previous = null;
  let stableSince = 0;
  let lastReadiness = null;
  // A quiet visit delays the ambient queue for 12s (+1.2s scheduling). Exercise
  // its real engagement path without changing focus or activating a control.
  await page.keyboard.press('Shift');
  await expect.poll(async () => {
    const sample = await page.evaluate((allowedPaths) => {
      const wire = document.querySelector('.site-header [data-desk-wire]');
      const wireState = wire?.getAttribute('data-desk-wire-state');
      // The ambient loader intentionally skips hidden mobile strips and portals.
      const wireExpected = Boolean(wire && wire.getBoundingClientRect().height > 0 &&
        !/^\/(vault-member|investor-portal|admin|api)\//.test(location.pathname) &&
        !document.documentElement.hasAttribute('data-no-strip') && !document.body.hasAttribute('data-no-strip'));
      // The engagement queue also mounts the rank orb on public headers. Its
      // presence reserves real header geometry even where the Desk is hidden.
      const rankExpected = Boolean(document.querySelector('.nav-right')) &&
        !/^\/(vault-member|investor-portal|admin|api)\//.test(location.pathname);
      const anchorShellReady = !rankExpected || !!document.querySelector('.nav-right .vs-rank-orb');
      const missingStylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .filter(link => !link.sheet && !link.disabled).map(link => link.getAttribute('href'));
      const ready = document.fonts.status === 'loaded' && missingStylesheets.length === 0 &&
        (!wireExpected || wireState === 'live' || wireState === 'latest') &&
        anchorShellReady &&
        (!window.VSAfterPaint || window.VSAfterPaint.done);
      const visible = [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      });
      return {
        ready,
        diagnostics: {
          path: allowedPaths.includes(location.pathname) ? location.pathname : 'other',
          hash: ['', '#main-content'].includes(location.hash) ? location.hash : 'other',
          theme: ['dark', 'light'].includes(document.body.dataset.theme) ? document.body.dataset.theme : 'other',
          fonts: ['loaded', 'loading'].includes(document.fonts.status) ? document.fonts.status : 'unknown',
          missingStylesheetCount: Math.min(missingStylesheets.length, 9999),
          wireExpected, wireState: wireState == null ? 'absent' : ['live', 'latest'].includes(wireState) ? wireState : 'other',
          rankExpected, anchorShellReady,
          afterPaint: window.VSAfterPaint ? { started: window.VSAfterPaint.started === true, done: window.VSAfterPaint.done === true } : null,
        },
        fingerprint: JSON.stringify(visible.map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return [element.tagName, element.id, Math.round(rect.x), Math.round(rect.y),
            Math.round(rect.width), Math.round(rect.height), style.opacity, style.visibility,
            style.transform, element.childElementCount ? '' : element.textContent];
        })),
      };
    }, SURFACES.map(surface => surface.path));
    if (!sample.ready || sample.fingerprint !== previous) {
      previous = sample.fingerprint;
      stableSince = Date.now();
      lastReadiness = { ready: sample.ready === true, layoutStable: false, ...sample.diagnostics };
      return { ready: sample.ready, layoutStable: false, ...sample.diagnostics };
    }
    const layoutStable = Date.now() - stableSince >= 500;
    lastReadiness = { ready: true, layoutStable, ...sample.diagnostics };
    return { ready: true, layoutStable, ...sample.diagnostics };
  }, { timeout: 5000, intervals: [100, 250, 500], message: 'app state and visible layout settle before visual comparison' })
    .toMatchObject({ ready: true, layoutStable: true })
    .catch(error => {
      // Print only bounded named flags, never the layout fingerprint or DOM text.
      try { console.error('Visual readiness failure flags: ' + JSON.stringify(lastReadiness)); } catch { /* Preserve the original readiness failure. */ }
      throw error;
    });
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`visual regression · ${vp.name} · ${theme}`, () => {
      test.use({ ...emulationOnly(vp.config), reducedMotion: 'reduce' });

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
        // The public genome strip can appear under Chromium's default (0,0)
        // pointer and open its tooltip. Baselines describe neutral entry state.
        await page.mouse.move(-100, -100);
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
        if (vp.name === 'desktop-1280') {
          const spark = page.locator('.site-header .vs-palette-loader-trigger');
          // Member portals deliberately omit public discovery controls.
          if (surface.name === 'vault-member') {
            await expect(spark).toHaveCount(0);
          } else {
            await expect(spark).toBeInViewport({ ratio: 1 });
          }
        }
        if (surface.name === 'home') {
          await expect(page.locator('#hero-heading')).toBeVisible();
          await expect(page.locator('#hero-heading .forge-letter').first()).toHaveCSS('opacity', '1');
        }
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
