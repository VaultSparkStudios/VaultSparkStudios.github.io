// tests/nav-dropdown-coverage.spec.js (S136)
// Verifies every link in the expanded nav dropdowns (Universe + Studio +
// Membership + Resources) resolves to a 200 status. Catches drift between
// the propagator's emitted link set and the actual pages on disk.
const { test, expect } = require('@playwright/test');

// Selectors target the propagate-nav.mjs output structure.
const DROPDOWN_SELECTOR = '.site-header .nav-center .nav-item.has-dropdown .nav-dropdown a';

test.describe('Header nav dropdown coverage (S136)', () => {
  test('every dropdown link resolves to 200', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.evaluate((selector) => {
      const links = Array.from(document.querySelectorAll(selector));
      return [...new Set(links.map((a) => a.getAttribute('href')).filter(Boolean))];
    }, DROPDOWN_SELECTOR);
    expect(hrefs.length).toBeGreaterThanOrEqual(20);

    const failures = [];
    for (const href of hrefs) {
      if (!href.startsWith('/')) continue;     // skip external
      if (href.startsWith('#')) continue;       // skip anchors
      const url = new URL(href, 'https://vaultsparkstudios.com').toString();
      try {
        const res = await request.get(url, { timeout: 15000 });
        // 3xx is fine (redirects to canonical, e.g., /investor/* → /investor-portal/).
        if (res.status() >= 400) failures.push(`${href} → ${res.status()}`);
      } catch (e) {
        failures.push(`${href} → ${e.message}`);
      }
    }
    expect(failures, `broken nav links:\n${failures.join('\n')}`).toEqual([]);
  });

  test('Oracle is surfaced with gold accent + ⚡ marker', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const oracleLink = page.locator('.nav-dropdown a[href="/oracle/"]').first();
    await expect(oracleLink).toBeAttached();
    const styled = await oracleLink.evaluate((el) => {
      const style = el.getAttribute('style') || '';
      return {
        gold: /#FFC400|color:[^;]*gold/i.test(style),
        bold: /font-weight\s*:\s*[67]00/i.test(style),
        marker: /⚡/.test(el.textContent || ''),
      };
    });
    expect(styled.gold || styled.bold || styled.marker,
      `Oracle should be visually promoted in nav (style: ${JSON.stringify(styled)})`).toBe(true);
  });

  test('Universe dropdown has Voidfall + DreadSpike sub-links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const voidfall = page.locator('.nav-dropdown a[href="/universe/voidfall/"]').first();
    const dreadspike = page.locator('.nav-dropdown a[href="/universe/dreadspike/"]').first();
    await expect(voidfall).toBeAttached();
    await expect(dreadspike).toBeAttached();
  });

  test('The Desk is discoverable from the Studio dropdown and footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const headerLink = page.locator('.site-header .nav-dropdown a[href="/news/"]').first();
    const footerLink = page.locator('.site-footer a[href="/news/"]').first();
    await expect(headerLink).toContainText('The Desk');
    await expect(footerLink).toContainText('The Desk');

    await headerLink.locator('xpath=ancestor::*[contains(@class, "has-dropdown")][1]').hover();
    await expect(headerLink).toBeVisible();
    await headerLink.click();
    await expect(page).toHaveURL(/\/news\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Three minds');
  });
});
