// service-worker-install.spec.js
// S362: registers /sw.js in a real browser and requires it to reach `activated`.
//
// From at least 2026-06-03 until S361 the worker went `redundant` on every
// production install: Cache.addAll() rejects a batch with a duplicate request,
// and three precache entries were listed twice. Nothing noticed for three months.
// verify-sw-assets.mjs proves the files exist and the unit test refuses duplicates,
// but neither one runs an install, and an install fails for other reasons too:
// a 404 entry, a redirect, or a bad content type. This spec runs one.
// Chromium only: the install contract does not differ between engines.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Service worker install', () => {
  test('/sw.js installs, activates and precaches the shell (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'install contract runs Chromium only');
    test.setTimeout(90_000);

    await page.goto(`${BASE}/`, { waitUntil: 'load' });

    const result = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { state: 'unsupported' };
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const worker = reg.installing || reg.waiting || reg.active;
      if (!worker) return { state: 'no-worker' };
      const state = await new Promise((resolve) => {
        if (worker.state === 'activated' || worker.state === 'redundant') return resolve(worker.state);
        const timer = setTimeout(() => resolve(`timeout:${worker.state}`), 60_000);
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            clearTimeout(timer);
            resolve(worker.state);
          }
        });
      });
      // The install precache is the cache whose name carries no -pages/-api suffix.
      const names = await caches.keys();
      const precacheName = names.find((n) => !/-(pages|api)$/.test(n));
      const cached = precacheName
        ? (await (await caches.open(precacheName)).keys()).map((r) => new URL(r.url).pathname)
        : [];
      const src = await (await fetch('/sw.js', { cache: 'no-store' })).text();
      // STATIC_ASSETS is the install precache (FINGERPRINTED_SHELL_ASSETS is a
      // routing list, not what install caches). Comment lines are skipped.
      const block = /const STATIC_ASSETS\s*=\s*\[([\s\S]*?)\n\];/.exec(src);
      const declared = block
        ? block[1].split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
          .match(/'([^']+)'/g)?.map((q) => q.slice(1, -1)) || []
        : [];
      return { state, precacheName, cached, declared };
    });

    expect(result.state, 'the worker must activate; `redundant` means the install was rejected').toBe('activated');
    expect(result.precacheName, 'an activated worker must leave its precache behind').toBeTruthy();
    expect(result.declared.length, 'sw.js must still declare its install precache (STATIC_ASSETS)').toBeGreaterThan(0);
    const missing = result.declared.filter((p) => !result.cached.includes(p));
    expect(missing, 'every declared precache entry was cached by the install').toEqual([]);
    expect(result.cached, 'the homepage is precached for offline use').toContain('/');
  });

  // S398: the S397 reload loop. With the adapter online but the origin down,
  // offline.html used to treat navigator.onLine as recovery and reload every
  // 900ms. Only a real browser with the worker in control reproduces it: the
  // worker serves the fallback, and the page's own probe has to fail too.
  test('origin down with the adapter online: stable fallback, one recovery (Chromium)', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'service-worker routing runs Chromium only');
    test.setTimeout(120_000);
    const origin = new URL(BASE).origin;
    const route = '/privacy/';

    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const activated = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    expect(activated, 'the worker must activate before the origin goes down').toBe(true);
    await page.reload({ waitUntil: 'load' });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { message: 'the page must be controlled by the worker' }).toBe(true);
    const uncached = await page.evaluate(async (path) =>
      !(await caches.match(path)) && !(await caches.match(new URL(path, location.origin).href)), route);
    expect(uncached, `${route} must be outside every cache, or the fallback is never exercised`).toBe(true);

    // Origin down: every request to the site fails, including the worker's own fetches.
    const downHandler = (r) => r.abort('connectionrefused');
    await context.route(`${origin}/**`, downHandler);

    let navigations = 0;
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });

    await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await expect(page.locator('body.offline-page'), 'the worker serves offline.html for the failed navigation').toBeVisible();
    await expect(page.locator('#offline-net-label'), 'a failed probe must not claim recovery').toHaveText('Waiting for signal');
    await page.waitForTimeout(4_000);
    expect(navigations, 'only the requested navigation while the origin is down (the S397 loop reloaded every 900ms)').toBe(1);
    expect(new URL(page.url()).pathname, 'the fallback keeps the requested address').toBe(route);

    // Origin back: an offline→online transition re-probes, and success reloads exactly once.
    await context.unroute(`${origin}/**`, downHandler);
    await context.setOffline(true);
    await expect(page.locator('#offline-net-label')).toHaveText('Waiting for signal');
    const beforeRecovery = navigations;
    await context.setOffline(false);
    await expect(page.locator('body.offline-page'), 'recovery reopens the requested page').toHaveCount(0, { timeout: 15_000 });
    await expect(page).toHaveTitle(/Privacy/i);
    await page.waitForTimeout(2_000);
    expect(navigations - beforeRecovery, 'recovery reloads exactly once').toBe(1);
  });
});
