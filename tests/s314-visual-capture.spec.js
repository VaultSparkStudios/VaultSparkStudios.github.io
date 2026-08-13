import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const themes = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const viewports = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const out = path.resolve('.cache', 's314-visual');

for (const viewport of viewports) {
  for (const theme of themes) {
    test(`S314 open navigation · ${theme} · ${viewport.name}`, async ({ page }) => {
      fs.mkdirSync(out, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto('/?nav=sheet', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      let surface = null;
      let state = 'page';
      if (viewport.name === 'mobile') {
        await page.locator('#hamburger').click({ force: true });
        surface = page.locator('.vs-nav-sheet.open');
        await expect(surface).toBeVisible();
        await expect(page.locator('.vs-nav-sheet-close')).toBeFocused();
        state = 'nav-open';
      }
      const target = path.join(out, `home--${theme}--${viewport.name}--${state}.png`);
      const image = surface
        ? await surface.screenshot({ timeout: 5000 })
        : await page.screenshot({ timeout: 5000 });
      fs.writeFileSync(target, image);
    });
  }
}
