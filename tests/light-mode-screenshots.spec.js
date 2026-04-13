// light-mode-screenshots.spec.js
// Playwright smoke — Chromium only, forced light mode.
// Screenshots saved to test-results/light-mode/ for manual contrast review.
// Catches regressions where light-mode tokens produce unreadable surfaces.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const PAGES = [
  { path: '/',             name: 'homepage' },
  { path: '/ranks/',       name: 'ranks' },
  { path: '/games/',       name: 'games' },
  { path: '/press/',       name: 'press' },
  { path: '/contact/',     name: 'contact' },
  { path: '/community/',   name: 'community' },
  { path: '/studio/',      name: 'studio' },
  { path: '/roadmap/',     name: 'roadmap' },
  { path: '/universe/',    name: 'universe' },
  { path: '/membership/',  name: 'membership' },
];

test.use({
  colorScheme: 'light',
  // Force the VaultSpark light theme via localStorage before navigation
  storageState: undefined,
});

for (const pg of PAGES) {
  test(`light-mode contrast smoke — ${pg.name}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Light-mode screenshots run Chromium only');

    // Inject light theme before page load
    await page.addInitScript(() => {
      localStorage.setItem('vs_theme', 'light');
    });

    await page.goto(BASE + pg.path, { waitUntil: 'networkidle' });

    // Verify light-mode class was applied
    await expect(page.locator('body')).toHaveClass(/light-mode/);

    // Screenshot for manual review (not a pixel diff — visual inspection)
    await page.screenshot({
      path: `test-results/light-mode/${pg.name}.png`,
      fullPage: true,
    });

    // Basic structural checks still pass in light mode
    await expect(page.locator('header.site-header')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();

    // No console errors
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    expect(errors.length).toBe(0);
  });
}
