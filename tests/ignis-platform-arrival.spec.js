import { test, expect } from '@playwright/test';

const PLATFORM_PATH = '/api/ignis-platform-status.json';
const viewports = [
  { name: 'desktop', width: 1366, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

async function arrivalState(page) {
  return page.evaluate(() => {
    const target = document.getElementById('oracle');
    const heading = target.querySelector('h2').getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect();
    return {
      scrollY,
      targetTop: target.getBoundingClientRect().top,
      margin: parseFloat(getComputedStyle(target).scrollMarginTop) || 0,
      headingTop: heading.top,
      headingBottom: heading.bottom,
      headerBottom: header.bottom,
      viewportHeight: innerHeight,
    };
  });
}

async function hydratedLayout(page) {
  await expect(page.locator('[data-ignis-platform-panel]')).toHaveAttribute('aria-hidden', 'false');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectAligned(page) {
  await expect.poll(async () => {
    const state = await arrivalState(page);
    return Math.abs(state.targetTop - state.margin);
  }, { message: 'initial Oracle fragment follows the hydrated platform panel' }).toBeLessThanOrEqual(1.1);
  const state = await arrivalState(page);
  expect(state.headingTop).toBeGreaterThanOrEqual(state.headerBottom);
  expect(state.headingBottom).toBeLessThan(state.viewportHeight);
}

async function contextFor(browser, baseURL, viewport, holdPlatform) {
  const origin = new URL(baseURL).origin;
  const context = await browser.newContext({ baseURL, viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  if (!holdPlatform) release();
  await context.addInitScript(() => localStorage.setItem('vs_theme', 'warm'));
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    if (url.pathname === PLATFORM_PATH) {
      // Keep the actual candidate public response unchanged. Holding its delivery
      // makes the fragment-before-hydration ordering deterministic.
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await gate;
      return route.fulfill({ response });
    }
    return route.continue();
  });
  return { context, release };
}

async function openOracle(page) {
  await page.goto('/oracle/', { waitUntil: 'load' });
  await expect(page).toHaveURL(url => url.pathname === '/ignis/' && url.hash === '#oracle');
  // Exercise normal ambient engagement; a modifier alone is not scroll intent.
  await page.keyboard.press('Shift');
}

async function initialFragmentBeforeHydration(page) {
  // Wait for the real public header/engagement work before releasing the held
  // panel. This observes native painted layout rather than sleeping to induce
  // a race, disabling anchoring or changing the page's styles.
  await expect.poll(() => page.evaluate(() => {
    const wire = document.querySelector('.site-header [data-desk-wire]');
    const wireExpected = wire && wire.getBoundingClientRect().height > 0 && getComputedStyle(wire).display !== 'none';
    return document.fonts.status === 'loaded' &&
      [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => Boolean(link.sheet)) &&
      (!wireExpected || ['live', 'latest'].includes(wire.getAttribute('data-desk-wire-state'))) &&
      Boolean(document.querySelector('.nav-right .vs-rank-orb')) &&
      (!window.VSAfterPaint || window.VSAfterPaint.done === true);
  }), { message: 'actual initial header, fonts and engagement hydration settle' }).toBe(true);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('[data-ignis-platform-panel]')).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(async () => {
    const state = await arrivalState(page);
    return Math.abs(state.targetTop - state.margin);
  }, { message: 'browser follows the real initial fragment before the held response' }).toBeLessThanOrEqual(1.1);
}

for (const viewport of viewports) {
  test.describe(`Oracle platform arrival · ${viewport.name}`, () => {
    test('delayed actual platform response preserves the initial Oracle destination', async ({ browser, baseURL }) => {
      const { context, release } = await contextFor(browser, baseURL, viewport, true);
      try {
        const page = await context.newPage();
        await openOracle(page);
        await initialFragmentBeforeHydration(page);
        release();
        await hydratedLayout(page);
        await expectAligned(page);
      } finally {
        release();
        await context.close();
      }
    });

    test('wheel and Tab intent before hydration are not reset to Oracle', async ({ browser, baseURL }) => {
      for (const intent of ['wheel', 'Tab']) {
        const { context, release } = await contextFor(browser, baseURL, viewport, true);
        try {
          const page = await context.newPage();
          await openOracle(page);
          await initialFragmentBeforeHydration(page);
          const initial = await arrivalState(page);
          if (intent === 'wheel') {
            await page.mouse.wheel(0, 240);
            await expect.poll(async () => (await arrivalState(page)).scrollY).toBeGreaterThan(initial.scrollY + 50);
          } else {
            // One Tab can focus the already-visible Oracle input without
            // moving the viewport. Navigate real controls until the visitor
            // has actually chosen a different viewport before hydration.
            const controls = await page.locator('a[href],button,input,select,textarea,[tabindex="0"]').count();
            for (let step = 0; step <= controls; step++) {
              await page.keyboard.press('Tab');
              await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
              if (Math.abs((await arrivalState(page)).scrollY - initial.scrollY) > 50) break;
            }
            expect(Math.abs((await arrivalState(page)).scrollY - initial.scrollY), 'Tab navigation actually changes the visitor viewport').toBeGreaterThan(50);
          }
          const focused = await page.evaluateHandle(() => document.activeElement);
          release();
          await hydratedLayout(page);
          const after = await arrivalState(page);
          expect(Math.abs(after.targetTop - after.margin), `${intent} arrival must preserve visitor navigation`).toBeGreaterThan(50);
          expect(await page.evaluate(element => document.activeElement === element, focused)).toBe(true);
          await focused.dispose();
        } finally {
          release();
          await context.close();
        }
      }
    });

    test('normal fast platform response arrives with the Oracle heading visible', async ({ browser, baseURL }) => {
      const { context, release } = await contextFor(browser, baseURL, viewport, false);
      try {
        const page = await context.newPage();
        await openOracle(page);
        await hydratedLayout(page);
        await expectAligned(page);
      } finally {
        release();
        await context.close();
      }
    });
  });
}
