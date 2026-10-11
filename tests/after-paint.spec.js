// S374: scripts parked in <template data-after-paint> must stay off the network
// until the page has painted, and must still run.
//
// The required Lighthouse check failed on unchanged bytes across S370–S373. Its
// result files showed a text LCP painted at the same moment as FCP, with the
// simulated LCP swinging on how many deferred scripts happened to finish before
// that paint. Reader-interaction scripts on a Desk article, and non-visual
// scripts on the homepage, are now requested after the first frame. A source
// check cannot see request timing, so this is asserted in a real browser.
const { test, expect } = require('@playwright/test');

// Kept in step with the article the Lighthouse workflow measures.
const ARTICLE = '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/';
// Paint and resource timestamps come from different clocks in some engines.
const CLOCK_TOLERANCE_MS = 5;

async function measure(page, route) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error && error.message || error)));
  // The homepage exceeds the default 250-entry resource timing buffer.
  await page.addInitScript(() => { try { performance.setResourceTimingBufferSize(2000); } catch (_e) { /* unsupported */ } });
  await page.goto(route, { waitUntil: 'load' });
  await page.waitForFunction(() => window.VSAfterPaint && window.VSAfterPaint.done === true, null, { timeout: 15000 });
  const result = await page.evaluate(() => {
    const parked = [...document.querySelectorAll('template[data-after-paint]')]
      .flatMap((template) => [...template.content.querySelectorAll('script[src]')])
      .map((script) => new URL(script.getAttribute('src'), document.baseURI).pathname);
    const activated = [...document.querySelectorAll('script[data-after-paint="true"]')].map((script) => new URL(script.src).pathname);
    const eager = [...document.querySelectorAll('script[src]:not([data-after-paint])')].map((script) => new URL(script.src).pathname);
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    // Every initiator: a parked script fetched early by a preload would show up as "link".
    const starts = {};
    for (const entry of performance.getEntriesByType('resource')) {
      const path = new URL(entry.name).pathname;
      if (!(path in starts) || entry.startTime < starts[path]) starts[path] = entry.startTime;
    }
    return { parked, activated, eager, firstPaint: paint ? paint.startTime : null, starts };
  });
  return { ...result, errors };
}

function expectParkedAfterPaint(result, label) {
  expect(result.parked.length, `${label}: parked scripts`).toBeGreaterThan(0);
  expect(result.activated, `${label}: every parked script ran, in order`).toEqual(result.parked);
  for (const path of result.parked) {
    expect(result.eager, `${label}: ${path} is not also loaded eagerly`).not.toContain(path);
  }
  // Engines without paint timing still prove order and activation above.
  if (result.firstPaint === null) return;
  const measured = result.parked.filter((path) => result.starts[path] !== undefined);
  expect(measured.length, `${label}: at least one parked request was timed`).toBeGreaterThan(0);
  for (const path of measured) {
    expect(result.starts[path], `${label}: ${path} requested after first paint`).toBeGreaterThanOrEqual(result.firstPaint - CLOCK_TOLERANCE_MS);
  }
}

test('Desk article: reader-interaction scripts load after first paint and still mount', async ({ page }) => {
  const result = await measure(page, ARTICLE);
  expectParkedAfterPaint(result, 'article');
  for (const name of ['desk-reactions', 'desk-comments', 'csrf-token', 'turnstile']) {
    expect(result.parked.some((path) => path.includes(`/assets/${name}`)), `${name} is parked`).toBe(true);
  }
  // Presence times the visit from when it runs, so it is not parked.
  expect(result.eager.some((path) => path.includes('/assets/desk-presence')), 'desk-presence stays eager').toBe(true);
  const ready = await page.evaluate(() => ({
    comments: typeof window.VSDeskComments === 'object',
    csrf: typeof window.VSCsrf === 'object',
    turnstile: typeof window.VSTurnstile === 'object',
  }));
  expect(ready).toEqual({ comments: true, csrf: true, turnstile: true });
  // The comments client mounts a thread when its section comes near the viewport.
  await page.locator('#community').scrollIntoViewIfNeeded();
  await expect(page.locator('#community')).toHaveAttribute('data-desk-comments-ready', 'true', { timeout: 10000 });
  expect(result.errors).toEqual([]);
});

test('homepage: non-visual scripts load after first paint and still run', async ({ page }) => {
  const result = await measure(page, '/');
  expectParkedAfterPaint(result, 'homepage');
  const ready = await page.evaluate(() => ({
    publicClient: typeof window.VSPublic !== 'undefined',
    newsletter: typeof window.VaultKit === 'object',
  }));
  expect(ready).toEqual({ publicClient: true, newsletter: true });
  // The stats tile leaves its loading state only when its parked script has run.
  await expect(page.locator('[data-analytica-surface="showcase"]')).not.toHaveAttribute('data-state', 'loading', { timeout: 10000 });
  // Scripts the hero reads or that record a first click stay eager.
  for (const name of ['funnel-tracking', 'home-dynamic-hero', 'hero-ticker', 'cookie-consent', 'nav-toggle', 'sentry-init']) {
    expect(result.eager.some((path) => path.includes(`/assets/${name}`)), `${name} stays eager`).toBe(true);
  }
  expect(result.errors).toEqual([]);
});

test('a first interaction starts parked scripts without waiting for the page to finish loading', async ({ page }) => {
  // Hold every image so the load event cannot be what starts the parked scripts.
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route(/\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?.*)?$/i, async (route) => { await held; await route.continue().catch(() => {}); });
  try {
    await page.goto(ARTICLE, { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
    await page.keyboard.press('Tab');
    // Well inside the five-second fallback, with the load event still pending.
    await page.waitForFunction(() => window.VSAfterPaint && window.VSAfterPaint.done === true, null, { timeout: 3000 });
    expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
    expect(await page.evaluate(() => typeof window.VSDeskComments)).toBe('object');
  } finally { release(); }
});
