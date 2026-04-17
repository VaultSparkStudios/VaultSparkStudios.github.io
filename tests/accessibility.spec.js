const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { hasVaultCreds, loginVaultMember } = require('./helpers/vaultAuth');

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
    const labeledTables = page.locator('.lb-table[aria-label]');
    expect(await labeledTables.count()).toBeGreaterThan(0);
    await expect(labeledTables.first()).toBeVisible();
  });

  test('CSS color variables meet WCAG AA contrast ratio (4.5:1)', async ({ page }) => {
    await page.goto('/');
    const results = await page.evaluate(() => {
      // sRGB channel to linear
      function sRGBtoLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
      function luminance(hex) {
        const r = parseInt(hex.slice(1,3), 16) / 255;
        const g = parseInt(hex.slice(3,5), 16) / 255;
        const b = parseInt(hex.slice(5,7), 16) / 255;
        return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
      }
      function contrastRatio(hex1, hex2) {
        const l1 = luminance(hex1), l2 = luminance(hex2);
        const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }
      const style = getComputedStyle(document.documentElement);
      const bg = style.getPropertyValue('--bg').trim();
      const pairs = [
        { name: '--text on --bg', fg: style.getPropertyValue('--text').trim(), bg },
        { name: '--muted on --bg', fg: style.getPropertyValue('--muted').trim(), bg },
        { name: '--dim on --bg', fg: style.getPropertyValue('--dim').trim(), bg },
        { name: '--gold on --bg', fg: style.getPropertyValue('--gold').trim(), bg },
        { name: '--blue on --bg', fg: style.getPropertyValue('--blue').trim(), bg },
      ];
      return pairs.map(p => ({
        name: p.name,
        ratio: Math.round(contrastRatio(p.fg, p.bg) * 100) / 100,
        passes: contrastRatio(p.fg, p.bg) >= 4.5,
      }));
    });
    for (const r of results) {
      expect(r.passes, `${r.name}: ratio ${r.ratio} < 4.5:1`).toBe(true);
    }
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

test.describe('Accessibility — authenticated portal scans', () => {
  test.skip(!hasVaultCreds(), 'Vault test credentials not configured');

  test('Vault dashboard has no critical a11y violations', async ({ page, request }) => {
    await loginVaultMember(page, request);
    const violations = await auditPage(page);
    expect(violations).toEqual([]);
  });

  test('Vault challenges pane has no critical a11y violations', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await page.locator('#tab-dash-challenges').click();
    await expect(page.locator('#dash-pane-challenges')).toHaveClass(/active/);
    const violations = await auditPage(page);
    expect(violations).toEqual([]);
  });

  test('Onboarding modal has no critical a11y violations', async ({ page, request }) => {
    await loginVaultMember(page, request);
    await page.evaluate(() => {
      const overlay = document.getElementById('onboarding-overlay');
      if (overlay) overlay.style.display = 'block';
    });
    await expect(page.locator('#onboarding-card')).toBeVisible();
    const violations = await auditPage(page);
    expect(violations).toEqual([]);
  });
});
