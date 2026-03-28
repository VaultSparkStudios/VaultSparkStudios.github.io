const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/* ───────────────────────────────────────────────────────────
   axe-core tags: WCAG 2.0 A/AA + WCAG 2.1 A/AA
   We fail on critical and serious violations only —
   moderate / minor are logged but do not block CI.
   ─────────────────────────────────────────────────────────── */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Shared helper — run axe and return critical+serious violations. */
async function auditPage(page) {
  const results = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('iframe')          // skip third-party iframes
    .analyze();

  // Log all violations for debugging, regardless of impact
  if (results.violations.length) {
    console.log(
      `[axe] ${results.violations.length} violation(s) on ${page.url()}:\n` +
      results.violations
        .map(v => `  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
        .join('\n')
    );
  }

  return results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
}

/* ═══════════════════════════════════════════════════════════
   Section 1 — axe-core automated scans per page
   ═══════════════════════════════════════════════════════════ */
test.describe('Accessibility — axe-core scans', () => {
  const pages = [
    { name: 'Homepage',        path: '/' },
    { name: 'Games',           path: '/games/' },
    { name: 'Community',       path: '/community/' },
    { name: 'Leaderboards',    path: '/leaderboards/' },
    { name: 'Journal',         path: '/journal/' },
    { name: 'Ranks',           path: '/ranks/' },
    { name: 'Members',         path: '/members/' },
    { name: 'Vault Treasury',  path: '/vault-treasury/' },
    { name: 'VaultSparked',    path: '/vaultsparked/' },
    { name: 'Join',            path: '/join/' },
    { name: 'Search',          path: '/search/' },
  ];

  for (const { name, path } of pages) {
    test(`${name} (${path}) has no critical a11y violations`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const violations = await auditPage(page);
      expect(violations).toEqual([]);
    });
  }
});

/* ═══════════════════════════════════════════════════════════
   Section 2 — manual accessibility checks (kept from original)
   ═══════════════════════════════════════════════════════════ */
test.describe('Accessibility — manual checks', () => {
  test('Homepage has lang attribute on html', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('All images have alt text on homepage', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img:not([alt])');
    await expect(images).toHaveCount(0);
  });

  test('Skip link is present on all key pages', async ({ page }) => {
    const paths = ['/', '/games/', '/leaderboards/', '/community/', '/contact/'];
    for (const p of paths) {
      await page.goto(p);
      await expect(page.locator('a.skip-link')).toHaveCount(1);
    }
  });

  test('Main content landmark exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('Nav has aria-label', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label]');
    await expect(nav.first()).toBeVisible();
  });

  test('Buttons have accessible text', async ({ page }) => {
    await page.goto('/');
    const hamburger = page.locator('#hamburger');
    await expect(hamburger).toHaveAttribute('aria-label', /navigation/i);
  });

  test('Leaderboard table has aria-label', async ({ page }) => {
    await page.goto('/leaderboards/');
    await expect(page.locator('.lb-table[aria-label]')).toBeVisible();
  });

  test('Form inputs have associated labels on contact page', async ({ page }) => {
    await page.goto('/contact/');
    const inputs = await page.locator('input:visible:not([type="hidden"])').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      expect(id || ariaLabel || placeholder).toBeTruthy();
    }
  });
});
