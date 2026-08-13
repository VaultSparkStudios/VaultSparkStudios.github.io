import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const themes = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const surfaces = [
  { name: 'homepage showcase', path: '/', selector: '[data-analytica-surface="showcase"]' },
  { name: 'public stats report', path: '/stats/', selector: 'body' },
];

for (const theme of themes) {
  for (const surface of surfaces) {
    test(`${surface.name} clears AA contrast in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-analytica-surface]')).toHaveAttribute('data-state', 'ready');
      const results = await new AxeBuilder({ page }).include(surface.selector).withTags(['wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.filter((violation) => violation.id === 'color-contrast')).toEqual([]);
    });
  }
}
