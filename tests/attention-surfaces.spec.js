const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4181';
const SURFACES = '#cookieConsent, #pwa-install-banner, .vs-exit-panel, .vs-vd, .vs-journey';
const PROFILES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

async function capture(page, name) {
  if (!process.env.ATTENTION_CAPTURE_DIR) return;
  fs.mkdirSync(process.env.ATTENTION_CAPTURE_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.ATTENTION_CAPTURE_DIR, name + '.png'),
    fullPage: false,
  });
}

async function dispatchInstallPrompt(page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = () => Promise.resolve();
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
}

for (const profile of PROFILES) {
  test(`new visitor sees consent only on ${profile.name}`, async ({ page }) => {
    await page.setViewportSize(profile.viewport);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await dispatchInstallPrompt(page);

    await expect(page.locator('#cookieConsent.vs-cookie-banner')).toBeVisible();
    await expect(page.locator(SURFACES)).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('vs_attention_surface_v1')))
      .toBe('cookie-consent');
    await capture(page, `new-${profile.name}`);
  });

  test(`engaged returning visitor gets at most one automatic surface on ${profile.name}`, async ({ page }) => {
    test.setTimeout(20000);
    await page.setViewportSize(profile.viewport);
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('vs_cookie_consent', 'accepted');
      localStorage.setItem('vs_visit_count', '5');
      localStorage.setItem('vs_last_visit_ts', String(Date.now() - 86400000));
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await dispatchInstallPrompt(page);

    await expect(page.locator('#pwa-install-banner')).toBeVisible({ timeout: 12000 });
    await expect(page.locator(SURFACES)).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('vs_attention_surface_v1')))
      .toBe('pwa-install');
    await capture(page, `returning-${profile.name}`);
  });
}

test('recently prompted returning visitor is not nagged again', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('vs_cookie_consent', 'accepted');
    localStorage.setItem('vs_visit_count', '8');
    localStorage.setItem('vs_pwa_prompted_at', String(Date.now()));
  });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await dispatchInstallPrompt(page);
  await page.waitForTimeout(500);

  await expect(page.locator('#pwa-install-banner')).toHaveCount(0);
  await expect(page.locator(SURFACES)).toHaveCount(0);
});
