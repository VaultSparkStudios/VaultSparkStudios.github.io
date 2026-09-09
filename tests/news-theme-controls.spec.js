const { test, expect } = require('@playwright/test');
for (const [label, route] of [['hub', '/news/'], ['director', '/news/directors-report/'], ['article', '/news/2026-08-07/frontier-access-becomes-research-infrastructure/']]) {
  for (const mobile of [false, true]) {
    test(`News theme ${label} ${mobile ? 'mobile' : 'desktop'} persists after selection`, async ({ page }) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 });
      await page.goto(route + '?nav=classic', { waitUntil: 'domcontentloaded' });
      if (mobile) {
        await page.locator('#hamburger').click();
        await expect(page.locator('#nav-menu')).toHaveClass(/open/);
        await page.locator('.mobile-theme-pill[data-theme="light"]').click();
      } else {
        await page.locator('#theme-picker-btn').click({ timeout: 10000 });
        await page.locator('.theme-tile[data-theme="light"]').click();
      }
      await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
      await expect.poll(() => page.evaluate(() => localStorage.getItem('vs_theme'))).toBe('light');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
      await expect(page.locator('#theme-picker-btn')).toHaveCount(1);
    });
  }
}
