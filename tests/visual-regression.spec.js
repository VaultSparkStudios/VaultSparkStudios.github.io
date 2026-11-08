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
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import os from 'node:os';

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

// scene-diagnostics:start — opt-in observation, never an alternate assertion.
function diagnosticLoopback(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
      && !parsed.username && !parsed.password;
  } catch { return false; }
}

function diagnosticBinary(value) {
  return value instanceof Uint8Array
    ? { bytes: value.byteLength, sha256: createHash('sha256').update(value).digest('hex') }
    : null;
}

function diagnosticNativeText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  // Native messages can contain paths/URLs. Only these observed scalar forms
  // are safe to emit; unrecognized messages remain hash-bound, not disclosed.
  const safe = /^(?:\d+ × )?(?:expect\.toHaveScreenshot(?: with timeout \d+ms)?|verifying given screenshot expectation|generating new stable screenshot expectation|waiting \d+ms before taking screenshot|captured a stable screenshot|screenshot matched expectation|\d+ pixels \(ratio [\d.]+ of all image pixels\) are different\.|Failed to take two consecutive stable screenshots\.|Timeout \d+ms exceeded\.)$/;
  return { scalar: text ? (text.length <= 240 && safe.test(text) ? text : '[unrecognized native message omitted]') : null,
    sha256: text ? createHash('sha256').update(text).digest('hex') : null };
}

function emitSceneDiagnostic(identity, phase, data) {
  try { console.log('[vs-scene-diagnostic] ' + JSON.stringify({ identity, phase, ...data })); }
  catch { /* Observation must not replace the native result or failure. */ }
}

function observeNativeScreenshot(page, identity) {
  if (!diagnosticLoopback(page.url())) {
    emitSceneDiagnostic(identity, 'native-unavailable', { reason: 'non-loopback-resolved-origin' });
    return () => {};
  }
  const own = Object.getOwnPropertyDescriptor(page, '_expectScreenshot');
  if (typeof page._expectScreenshot !== 'function') {
    emitSceneDiagnostic(identity, 'native-unavailable', { reason: 'private-method-absent' });
    return () => {};
  }
  const original = page._expectScreenshot.bind(page);
  let call = 0;
  page._expectScreenshot = async options => {
    const sequence = ++call;
    const started = Date.now();
    let result;
    try {
      // Same options object, exactly one original bound call, same raw result.
      result = await original(options);
    } catch (error) {
      let errorName = 'other';
      try { if (['Error', 'TimeoutError', 'TargetClosedError'].includes(error?.name)) errorName = error.name; } catch {}
      emitSceneDiagnostic(identity, 'native-throw', { call: sequence,
        elapsedMs: Date.now() - started, errorName });
      throw error;
    }
    try {
      if (!diagnosticLoopback(page.url())) {
        emitSceneDiagnostic(identity, 'native-unavailable', { reason: 'non-loopback-resolved-origin' });
        return result;
      }
      emitSceneDiagnostic(identity, 'native-response', {
        call: sequence, elapsedMs: Date.now() - started,
        expectedPresent: options?.expected != null,
        expected: diagnosticBinary(options?.expected),
        options: { fullPage: options?.fullPage, animations: options?.animations,
          maxDiffPixelRatio: options?.maxDiffPixelRatio, timeout: options?.timeout },
        errorMessage: diagnosticNativeText(result?.errorMessage), timedOut: result?.timedOut ?? null,
        actual: diagnosticBinary(result?.actual), previous: diagnosticBinary(result?.previous),
        diff: diagnosticBinary(result?.diff),
        log: Array.isArray(result?.log) ? result.log.slice(-16).map(diagnosticNativeText) : [],
        logTruncated: Array.isArray(result?.log) && result.log.length > 16,
      });
    } catch { emitSceneDiagnostic(identity, 'native-observation-unavailable', { call: sequence }); }
    return result;
  };
  return () => {
    if (own) Object.defineProperty(page, '_expectScreenshot', own);
    else delete page._expectScreenshot;
  };
}

async function captureSceneDiagnostic(page, identity, phase) {
  const started = Date.now();
  try {
    if (!diagnosticLoopback(page.url())) {
      emitSceneDiagnostic(identity, phase, { available: false, reason: 'non-loopback-resolved-origin' });
      return;
    }
    const geometry = await page.evaluate(() => {
      const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height,
        top: r.top, right: r.right, bottom: r.bottom, left: r.left });
      const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
          && s.display !== 'none' && s.visibility !== 'hidden'; };
      const computed = el => {
        const s = getComputedStyle(el);
        return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
          'fontStretch', 'lineHeight', 'letterSpacing', 'fontKerning', 'fontFeatureSettings',
          'fontVariationSettings', 'fontSynthesis', 'textRendering', 'transform', 'zoom']
          .map(key => [key, s[key]]));
      };
      const sample = el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const lineRects = Array.from(range.getClientRects());
        return { rect: rect(el.getBoundingClientRect()),
          lineRects: lineRects.slice(0, 24).map(rect), lineRectCount: lineRects.length,
          lineRectsTruncated: lineRects.length > 24,
          computed: computed(el) };
      };
      const selectors = ['.site-header', '.vs-spine', '.vs-spine-self', '.vs-spine-kin',
        '.page-hero', '.page-hero h1', '.mem-hero', '.mem-hero h1', '#hero-heading', '#oracle', '#oracle-heading'];
      const viewport = visualViewport;
      return { scrollX, scrollY, dpr: devicePixelRatio, userAgent: navigator.userAgent.slice(0, 240),
        viewport: { width: innerWidth, height: innerHeight },
        visualViewport: viewport ? { width: viewport.width, height: viewport.height,
          offsetLeft: viewport.offsetLeft, offsetTop: viewport.offsetTop,
          pageLeft: viewport.pageLeft, pageTop: viewport.pageTop, scale: viewport.scale } : null,
        body: { rect: rect(document.body.getBoundingClientRect()), scrollWidth: document.body.scrollWidth,
          scrollHeight: document.body.scrollHeight, computed: computed(document.body) },
        elements: selectors.map(selector => { const el = document.querySelector(selector);
          return { selector, available: Boolean(el), ...(el ? { rect: rect(el.getBoundingClientRect()) } : {}) }; }),
        visibleParagraphs: Array.from(document.querySelectorAll('p')).slice(0, 64).map((el, index) => ({ el, index }))
          .filter(({ el }) => visible(el)).slice(0, 8).map(({ el, index }) => ({ index, ...sample(el) })),
        fontsStatus: document.fonts?.status || 'unavailable',
      };
    });
    const platformFonts = [];
    let cdp;
    try {
      cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      for (const selector of ['.page-hero p', '.mem-hero-sub', '.vs-spine-kin a', '.site-header .brand', 'h1', '.ignis-oracle__lede', '#oracle-heading']) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        if (!nodeId) { platformFonts.push({ selector, available: false }); continue; }
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        platformFonts.push({ selector, available: true, fonts: fonts.slice(0, 8).map(font => ({
          familyName: String(font.familyName).slice(0, 96), postScriptName: String(font.postScriptName).slice(0, 96),
          isCustomFont: font.isCustomFont, glyphCount: font.glyphCount,
        })) });
      }
    } catch { platformFonts.push({ available: false, reason: 'cdp-font-observation-unavailable' }); }
    finally { if (cdp) await cdp.detach().catch(() => {}); }
    let playwrightVersion = 'unavailable';
    try { playwrightVersion = createRequire(process.cwd() + '/package.json')('@playwright/test/package.json').version; } catch {}
    emitSceneDiagnostic(identity, phase, { elapsedMs: Date.now() - started, geometry, platformFonts,
      runtime: { node: process.version, playwright: playwrightVersion,
        browser: page.context().browser()?.version() || 'unavailable', platform: os.platform(), arch: os.arch(),
        cpuModel: os.cpus()[0]?.model || 'unavailable', cpuCount: os.cpus().length, gpu: 'not-collected' } });
  } catch { emitSceneDiagnostic(identity, phase, { available: false, reason: 'scene-observation-unavailable' }); }
}
// scene-diagnostics:end

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
        test(`${surface.name} · ${vp.name} · ${theme}`, async ({ page, baseURL }, testInfo) => {
        const sceneDiagnostics = process.env.VS_SCENE_DIAGNOSTICS === 'true';
        const targetUrl = new URL(surface.path, process.env.VR_BASE_URL || baseURL).href;
        if (sceneDiagnostics && !diagnosticLoopback(targetUrl)) {
          throw new Error('Scene diagnostics require a loopback candidate origin.');
        }
        await page.addInitScript((t) => {
          try { localStorage.setItem('vs_theme', t); } catch (_) {}
        }, theme);

        // Use 'load' (not 'networkidle') — pages like /oracle/ have ongoing beacon
        // traffic that never reaches networkidle, causing 30s timeouts (S223).
        // 'load' waits for the window.load event which is sufficient for VR.
        // Use the candidate selected by Playwright. Dedicated manual baseline
        // capture can still choose an explicit alternate VR_BASE_URL.
        await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
        if (sceneDiagnostics && !diagnosticLoopback(page.url())) {
          throw new Error('Scene diagnostics require a loopback resolved origin.');
        }
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
        const identity = { surface: surface.name, viewport: vp.name, theme, retry: testInfo.retry,
          updateSnapshots: testInfo.config.updateSnapshots };
        if (sceneDiagnostics) await captureSceneDiagnostic(page, identity, 'before-native-matcher');
        const restoreNative = sceneDiagnostics ? observeNativeScreenshot(page, identity) : null;
        try {
        await expect(page).toHaveScreenshot(`${surface.name}-${vp.name}-${theme}.png`, {
          fullPage: false,
          maxDiffPixelRatio: PIXEL_RATIO_TOLERANCE,
          animations: 'disabled',
        });
        } finally {
          if (restoreNative) restoreNative();
          if (sceneDiagnostics) await captureSceneDiagnostic(page, identity, 'after-native-matcher');
        }
        });
      }
    });
  }
}
