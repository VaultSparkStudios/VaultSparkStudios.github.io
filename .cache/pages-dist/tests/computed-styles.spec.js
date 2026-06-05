const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Computed render integrity', () => {
  test('homepage has real computed styling', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();

    const computed = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const hero = document.querySelector('.hero');
      const header = document.querySelector('.site-header');
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const headerStyle = header ? getComputedStyle(header) : null;
      return {
        backgroundImage: body.backgroundImage,
        bodyColor: body.color,
        heroPaddingTop: heroStyle ? heroStyle.paddingTop : '',
        headerBorderBottomWidth: headerStyle ? headerStyle.borderBottomWidth : '',
      };
    });

    expect(computed.backgroundImage).not.toBe('none');
    expect(computed.bodyColor).not.toBe('rgb(0, 0, 0)');
    expect(computed.heroPaddingTop).not.toBe('0px');
    expect(computed.headerBorderBottomWidth).not.toBe('0px');
    expect(pageErrors).toEqual([]);
  });
});
