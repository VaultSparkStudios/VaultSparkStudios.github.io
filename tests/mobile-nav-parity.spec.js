const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const THEMES = ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast'];

async function openSheet(page, theme) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((savedTheme) => localStorage.setItem('vs_theme', savedTheme), theme);
  await page.goto('/?nav=sheet', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#hamburger[data-nav-sheet="active"]')).toBeVisible();
  await page.locator('#hamburger').click({ force: true });
  await expect(page.locator('.vs-nav-sheet.open')).toBeVisible();
}

test.describe('Mobile navigation parity', () => {
  test('sheet preserves every drawer Vault-access destination and its theme controls', async ({ page }) => {
    await openSheet(page, 'dark');

    const parity = await page.evaluate(() => {
      const drawer = [...document.querySelectorAll('#nav-menu .mobile-nav-footer a')]
        .map((link) => new URL(link.href, location.href).pathname + new URL(link.href, location.href).hash)
        .sort();
      const sheet = [...document.querySelectorAll('.vs-nav-sheet-action')]
        .map((link) => new URL(link.href, location.href).pathname + new URL(link.href, location.href).hash)
        .sort();
      const themeCount = window.VSTheme?.themes?.length || 0;
      const sheetThemeCount = document.querySelectorAll('.vs-nav-sheet-theme-pill').length;
      const actionHeights = [...document.querySelectorAll('.vs-nav-sheet-action')]
        .map((link) => link.getBoundingClientRect().height);
      return { drawer, sheet, themeCount, sheetThemeCount, actionHeights };
    });

    expect(parity.sheet).toEqual(parity.drawer);
    expect(parity.sheetThemeCount).toBe(parity.themeCount);
    expect(parity.actionHeights.every((height) => height >= 44)).toBe(true);
  });

  for (const theme of THEMES) {
    test(`CANON-047 sheet readability matrix — ${theme}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Matrix screenshots run Chromium only');
      await openSheet(page, theme);

      await page.screenshot({
        path: `test-results/theme-matrix/${theme}-sheet.png`,
        fullPage: false,
      });

      const results = await new AxeBuilder({ page })
        .include('.vs-nav-sheet')
        .withTags(['wcag2aa', 'wcag21aa'])
        .analyze();
      const contrast = results.violations.filter((violation) => violation.id === 'color-contrast');
      expect(contrast, `${theme} sheet contains sub-AA text/background pairs`).toEqual([]);

      await expect(page.locator('.vs-nav-sheet-theme-pill.active')).toHaveCount(1);
      await expect(page.locator('.vs-nav-sheet-action')).toHaveCount(4);
    });
  }
});
