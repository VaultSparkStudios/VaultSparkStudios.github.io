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
    test(`S314 homepage stats showcase · ${theme} · ${viewport.name}`, async ({ page }) => {
      fs.mkdirSync(out, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const surface = page.locator('[data-analytica-surface="showcase"]');
      await surface.scrollIntoViewIfNeeded();
      await expect(surface).toHaveAttribute('data-state', 'ready');
      await surface.screenshot({ path: path.join(out, `home--${theme}--${viewport.name}--stats-showcase.png`) });
    });

    test(`S314 public stats report · ${theme} · ${viewport.name}`, async ({ page }) => {
      fs.mkdirSync(out, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto('/stats/', { waitUntil: 'domcontentloaded' });
      const surface = page.locator('[data-analytica-surface="deep"]');
      await expect(surface).toHaveAttribute('data-state', 'ready');
      await page.screenshot({ path: path.join(out, `stats--${theme}--${viewport.name}--report.png`), fullPage: true });
    });
  }
}
