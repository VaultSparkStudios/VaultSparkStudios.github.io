const { test, expect } = require('@playwright/test');

const projects = ['promogrind', 'signal-log', 'vault-member', 'vault-pipeline', 'canon', 'the-living-protocol'];
const message = 'release-' + 'a'.repeat(72);

for (const width of [360, 430, 1366]) {
  test.describe(`Project activity at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const project of projects) {
      test(`${project} wraps a long commit without crowding its date`, async ({ page }) => {
        // A fixed public-feed response reproduces long commit identifiers even
        // when GitHub is unavailable or the live feed has shorter messages.
        await page.route('https://api.github.com/repos/**/commits?per_page=5', route => route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify([{ commit: { message, author: { date: new Date(Date.now() - 86400000).toISOString() } } }]),
        }));
        await page.goto(`/projects/${project}/`, { waitUntil: 'domcontentloaded' });
        const row = page.locator('#github-stream > .stream-item').first();
        await expect(row.locator('.stream-msg')).toHaveText(message);
        await expect(row.locator('.stream-date')).toHaveText('yesterday');
        await expect(row).toBeVisible();
        await row.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        const geometry = await row.evaluate(el => {
          const msg = el.querySelector('.stream-msg');
          const date = el.querySelector('.stream-date');
          const rect = el.getBoundingClientRect();
          const textRect = msg.getBoundingClientRect();
          const dateRect = date.getBoundingClientRect();
          return {
            left: rect.left, right: rect.right, viewport: innerWidth,
            messageRight: textRect.right, dateLeft: dateRect.left, dateRight: dateRect.right,
            textScrollWidth: msg.scrollWidth, textWidth: msg.clientWidth,
          };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.messageRight).toBeLessThanOrEqual(geometry.dateLeft);
        expect(geometry.dateRight).toBeLessThanOrEqual(geometry.right);
        expect(geometry.textScrollWidth).toBeLessThanOrEqual(geometry.textWidth + 1);
      });
    }
  });
}
