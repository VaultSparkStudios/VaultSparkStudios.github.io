import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const themes = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];
const surfaces = [
  { name: 'homepage showcase', path: '/', selector: '[data-analytica-surface="showcase"]', state: '[data-analytica-surface]' },
  { name: 'public stats report', path: '/stats/', selector: 'body', state: '[data-analytica-surface]' },
  { name: 'ecosystem stats report', path: '/stats/ecosystem/', selector: 'body', state: '[data-ecosystem-stats]' },
  { name: 'Desk reader and panel controls', path: '/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/#editorial-illustration-1', selector: 'body', state: null },
];

for (const theme of themes) {
  for (const surface of surfaces) {
    test(`${surface.name} clears AA contrast in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript((selectedTheme) => localStorage.setItem('vs_theme', selectedTheme), theme);
      await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      if (surface.state) await expect(page.locator(surface.state)).toHaveAttribute('data-state', 'ready');
      else await expect(page.locator('.desk-panel-reactions')).toBeVisible();
      const results = await new AxeBuilder({ page }).include(surface.selector).withTags(['wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.filter((violation) => violation.id === 'color-contrast')).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}

test('ecosystem explorer preserves denominators and all 19 project states', async ({ page }) => {
  await page.goto('/stats/ecosystem/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecosystem-stats]')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.ecosystem-project')).toHaveCount(19);
  await page.locator('select[name=measurement]').selectOption('unobserved');
  await expect(page.locator('.ecosystem-project:visible')).not.toHaveCount(0);
  await expect(page.locator('[data-filter-count]')).toContainText('shown');
  await expect(page.getByText(/Audience coverage/).first()).toBeVisible();
  await expect(page.getByText(/Edge coverage/).first()).toBeVisible();
});
