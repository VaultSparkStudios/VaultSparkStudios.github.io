const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test('live homepage hero and brand shell render coherently', async ({ page }) => {
  const pageErrors = [];
  const failedRequests = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const requestUrl = request.url();
    const failure = request.failure() ? request.failure().errorText : 'unknown';
    const resourceType = request.resourceType();
    const sameOrigin = requestUrl.startsWith(BASE);
    const shellAsset = /\.(css|js|webp|png|jpg|jpeg|svg)(\?|$)/i.test(requestUrl);

    if (sameOrigin && shellAsset) {
      failedRequests.push({ url: requestUrl, failure, resourceType });
    }
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('#hero-heading')).toBeVisible();

  await page.waitForTimeout(3000);

  const diagnostics = await page.evaluate(() => {
    const heading = document.querySelector('#hero-heading');
    const firstLetter = document.querySelector('.forge-letter');
    const heroTagline = document.querySelector('.hero-tagline');
    const brand = document.querySelector('.brand');
    const nav = document.querySelector('.site-header');
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((el) => el.getAttribute('href'));

    const headingStyle = heading ? getComputedStyle(heading) : null;
    const letterStyle = firstLetter ? getComputedStyle(firstLetter) : null;
    const taglineStyle = heroTagline ? getComputedStyle(heroTagline) : null;
    const brandStyle = brand ? getComputedStyle(brand) : null;
    const navStyle = nav ? getComputedStyle(nav) : null;

    return {
      titleText: heading ? heading.textContent.replace(/\s+/g, ' ').trim() : null,
      brandText: brand ? brand.textContent.replace(/\s+/g, ' ').trim() : null,
      styleLinks,
      headingOpacity: headingStyle ? headingStyle.opacity : null,
      headingDisplay: headingStyle ? headingStyle.display : null,
      firstLetterOpacity: letterStyle ? letterStyle.opacity : null,
      firstLetterAnimationName: letterStyle ? letterStyle.animationName : null,
      firstLetterTransform: letterStyle ? letterStyle.transform : null,
      taglineOpacity: taglineStyle ? taglineStyle.opacity : null,
      taglineTransform: taglineStyle ? taglineStyle.transform : null,
      brandDisplay: brandStyle ? brandStyle.display : null,
      navDisplay: navStyle ? navStyle.display : null,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });

  console.log(JSON.stringify({ diagnostics, pageErrors, failedRequests }, null, 2));

  expect(diagnostics.titleText).toContain('VAULTSPARK');
  expect(diagnostics.brandText).toContain('VaultSpark Studios');
  expect(diagnostics.styleLinks.some((href) => /assets\/style\.shell-[a-f0-9]{10}\.css$/.test(href || ''))).toBe(true);
  expect(diagnostics.headingDisplay).not.toBe('none');
  expect(diagnostics.brandDisplay).toContain('flex');
  expect(diagnostics.navDisplay).not.toBe('none');
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
