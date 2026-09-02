const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { isTrustedTypesReportOnly } = require('./lib/tt-report-only.js');

const BASE = (process.env.STAGING_RELEASE_URL || '').replace(/\/$/, '');
const RELEASE_REQUIRED = process.env.STAGING_RELEASE_REQUIRED === '1';
const THEMES = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];

function captureConsoleEvidence(page) {
  const consoleErrors = [];
  const reportOnlyObservations = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isTrustedTypesReportOnly(text)) reportOnlyObservations.push(text);
    else consoleErrors.push(text);
  });
  return { consoleErrors, reportOnlyObservations };
}

test.describe('explicit staging release evidence', () => {
  test.skip(!BASE && !RELEASE_REQUIRED, 'Set STAGING_RELEASE_URL to run the live staging gate.');
  test.beforeAll(() => {
    if (RELEASE_REQUIRED) {
      expect(BASE, 'Release mode requires an explicit STAGING_RELEASE_URL.').not.toBe('');
    }
  });
  // Firefox does not implement Playwright's `isMobile` context option. The
  // responsive contract under test is viewport + touch behavior, which all
  // three engines support.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('mobile drawer and every theme are readable', async ({ page }) => {
    // S321 — this test does substantially more work than the 30s suite default:
    // it sweeps all seven themes and runs a full axe WCAG analysis on each, and
    // axe dominates the runtime. Measured against live staging it passes in
    // ~36s solo, so under the release ceremony (three engines, CI workers in
    // parallel) it blew the shared budget and reported "Test timeout of 30000ms
    // exceeded" on chromium, firefox AND webkit at once — while the site itself
    // was healthy and served the homepage in 425ms.
    //
    // A timeout is not a readability measurement. Left as it was, the ceremony's
    // browser gate went red on a healthy site and blocked production promotion,
    // which is exactly how a gate earns a reputation for lying and gets bypassed.
    // The budget is raised to match the work; not one assertion is relaxed. If
    // this test fails now, it fails on the contract it names.
    test.setTimeout(120_000);
    const { consoleErrors } = captureConsoleEvidence(page);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();

    const hamburger = page.locator('#hamburger');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    const drawer = page.locator('#nav-menu');
    await expect(drawer).toHaveClass(/open/);
    await expect(drawer).toBeVisible();
    const drawerGeometry = await drawer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        viewportHeight: window.innerHeight,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY,
      };
    });
    expect(drawerGeometry.top).toBeGreaterThanOrEqual(40);
    expect(drawerGeometry.bottom).toBeLessThanOrEqual(drawerGeometry.viewportHeight + 1);
    expect(drawerGeometry.width).toBeGreaterThanOrEqual(360);
    expect(['auto', 'scroll']).toContain(drawerGeometry.overflowY);
    expect(drawerGeometry.scrollHeight).toBeGreaterThan(drawerGeometry.clientHeight);

    const evidenceDir = path.join(process.cwd(), 'output', 'staging-themes');
    fs.mkdirSync(evidenceDir, { recursive: true });

    for (const theme of THEMES) {
      const pill = page.locator(`.mobile-theme-pill[data-theme="${theme}"]`);
      await expect(pill).toBeVisible();
      await pill.click();
      await expect(page.locator('body')).toHaveAttribute('data-theme', theme);

      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const contrast = axe.violations.filter((violation) => violation.id === 'color-contrast');
      expect(contrast, `${theme} theme contrast violations`).toEqual([]);

      await page.screenshot({
        path: path.join(evidenceDir, `${theme}.png`),
        animations: 'disabled',
      });
    }

    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).not.toHaveClass(/open/);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('anonymous Obelisk boundary is fail-closed and reaches the provider', async ({ page, request }) => {
    const { consoleErrors, reportOnlyObservations } = captureConsoleEvidence(page);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    const me = await request.get(BASE + '/api/auth/me');
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({ ok: true, identity: null });

    const session = await request.get(BASE + '/api/auth/session');
    expect(session.status()).toBe(401);

    await page.goto(BASE + '/vault-member/', { waitUntil: 'domcontentloaded' });
    const signIn = page.locator('#obelisk-sign-in');
    await expect(signIn).toBeVisible({ timeout: 10000 });
    await expect(signIn).toHaveAttribute('href', /\/login\?intent=signin/);

    await page.locator('#tab-register').click();
    await expect(page.locator('#obelisk-create-account')).toBeVisible();
    await page.locator('#tab-login').click();
    await expect(signIn).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(reportOnlyObservations.every((message) => isTrustedTypesReportOnly(message))).toBe(true);

    await Promise.all([
      // Obelisk's discovery-backed authorization endpoint is /auth/authorize;
      // retain /auth for compatibility with older provider deployments.
      page.waitForURL(/https:\/\/obeliskgate\.com\/auth(?:\/authorize)?\?/, { timeout: 20000 }),
      signIn.click(),
    ]);
    await expect(page).toHaveTitle(/sign in/i);
    await expect(page.locator('body')).toContainText(/continue|sign in/i);
  });
});
